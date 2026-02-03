#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"
DEPLOY_DIR="$ROOT_DIR/deploy"

mkdir -p "$RUN_DIR"

cmd_exists() { command -v "$1" >/dev/null 2>&1; }

fail() {
  printf "%s\n" "$1" >&2
  exit 1
}

find_free_port() {
  local start_port="${1:-3000}"
  local end_port="${2:-3100}"
  cmd_exists python3 || fail "未找到 python3（需要 Python >= 3.11）"
  python3 - "$start_port" "$end_port" <<'PY'
import socket
import sys

start = int(sys.argv[1])
end = int(sys.argv[2])

for port in range(start, end + 1):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(("127.0.0.1", port))
    except OSError:
        continue
    else:
        s.close()
        print(port)
        raise SystemExit(0)

raise SystemExit(1)
PY
}

ensure_env_file() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    else
      fail "缺少 .env 与 .env.example"
    fi
  fi

  if [[ ! -e "$API_DIR/.env" ]]; then
    (cd "$API_DIR" && ln -sf "../../.env" ".env") 2>/dev/null || cp "$ROOT_DIR/.env" "$API_DIR/.env"
  fi
}

wait_for_docker_health() {
  local container_name="$1"
  local timeout_seconds="$2"
  local start_ts now_ts status
  start_ts="$(date +%s)"
  while true; do
    if ! status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name" 2>/dev/null)"; then
      status=""
    fi
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= timeout_seconds )); then
      fail "等待容器健康检查超时：$container_name"
    fi
    sleep 1
  done
}

docker_up() {
  cmd_exists docker || fail "未找到 docker，请先安装 Docker Desktop / Docker Engine"
  (cd "$ROOT_DIR" && docker compose -f "$DEPLOY_DIR/docker-compose.yml" up -d)
  wait_for_docker_health "socratic_postgres" 60
  wait_for_docker_health "socratic_redis" 60
}

docker_down() {
  if cmd_exists docker; then
    (cd "$ROOT_DIR" && docker compose -f "$DEPLOY_DIR/docker-compose.yml" down)
  fi
}

ensure_python_venv() {
  local py_bin
  if cmd_exists python3.11; then
    py_bin="python3.11"
  elif cmd_exists python3; then
    py_bin="python3"
  else
    fail "未找到 python3（需要 Python >= 3.11）"
  fi

  if ! "$py_bin" - <<'PY' >/dev/null; then
import sys
major, minor = sys.version_info[:2]
raise SystemExit(0 if (major, minor) >= (3, 11) else 1)
PY
    fail "Python 版本过低（需要 Python >= 3.11）"
  fi

  if [[ ! -x "$API_DIR/.venv/bin/python" ]]; then
    (cd "$API_DIR" && "$py_bin" -m venv ".venv")
  fi

  if [[ "${FORCE_INSTALL:-0}" == "1" ]]; then
    (cd "$API_DIR" && .venv/bin/python -m pip install -U pip)
    (cd "$API_DIR" && .venv/bin/pip install -e ".[dev]")
  fi
}

api_install_if_needed() {
  if [[ ! -d "$API_DIR/.venv" ]]; then
    FORCE_INSTALL=1 ensure_python_venv
    return 0
  fi

  if [[ ! -x "$API_DIR/.venv/bin/uvicorn" ]]; then
    FORCE_INSTALL=1 ensure_python_venv
    return 0
  fi
}

api_migrate() {
  (cd "$API_DIR" && .venv/bin/alembic upgrade head)
}

start_api() {
  api_install_if_needed
  api_migrate

  local pid_file="$RUN_DIR/api.pid"
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    if [[ ! -f "$RUN_DIR/api.port" ]]; then
      printf "%s\n" "${API_PORT:-8000}" > "$RUN_DIR/api.port"
    fi
    return 0
  fi

  local api_port
  api_port="$(find_free_port "${API_PORT:-8000}" 8100)" || fail "未找到可用的 API 端口（8000-8100）"
  printf "%s\n" "$api_port" > "$RUN_DIR/api.port"

  (
    cd "$API_DIR"
    nohup .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$api_port" > uvicorn.log 2>&1 &
    echo $! > "$pid_file"
  )
  sleep 0.5
  if ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    tail -n 80 "$API_DIR/uvicorn.log" || true
    fail "API 启动失败（查看 apps/api/uvicorn.log）"
  fi
}

web_install_if_needed() {
  local pm
  pm="$(web_pm)"

  if [[ -x "$WEB_DIR/node_modules/.bin/next" ]]; then
    return 0
  fi

  if [[ "$pm" == "npm" ]]; then
    if [[ -f "$WEB_DIR/package-lock.json" ]]; then
      (cd "$WEB_DIR" && npm ci)
    else
      (cd "$WEB_DIR" && npm install)
    fi
    return 0
  fi

  if [[ "$pm" == "pnpm" ]]; then
    (cd "$WEB_DIR" && pnpm install)
    return 0
  fi
}

start_web() {
  web_install_if_needed
  local pm
  pm="$(web_pm)"

  # Clean Next.js cache to avoid corrupted dev runtime chunks
  if [[ "${CLEAN_NEXT_CACHE:-1}" == "1" ]]; then
    rm -rf "$WEB_DIR/.next"
  fi

  local pid_file="$RUN_DIR/web.pid"
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    if [[ ! -f "$RUN_DIR/web.port" ]]; then
      printf "%s\n" "${PORT:-3000}" > "$RUN_DIR/web.port"
    fi
    return 0
  fi

  local api_port api_url web_port
  api_port="$(cat "$RUN_DIR/api.port" 2>/dev/null || true)"
  if [[ -z "$api_port" ]]; then
    api_port="${API_PORT:-8000}"
  fi
  api_url="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:${api_port}}"
  web_port="$(find_free_port "${PORT:-3000}" 3100)" || fail "未找到可用的 Web 端口（3000-3100）"
  printf "%s\n" "$web_port" > "$RUN_DIR/web.port"

  if [[ "$pm" == "npm" ]]; then
    (
      cd "$WEB_DIR"
      export NEXT_PUBLIC_API_URL="$api_url"
      export PORT="$web_port"
      export HOSTNAME="0.0.0.0"
      nohup npm run dev > nextjs.log 2>&1 &
      echo $! > "$pid_file"
    )
    sleep 0.5
    # Self-heal: if Next dev hits module-not-found on runtime chunks, restart after cache clean
    if grep -q "Cannot find module './" "$WEB_DIR/nextjs.log" 2>/dev/null; then
      kill_pidfile "$pid_file"
      rm -rf "$WEB_DIR/.next"
      (
        cd "$WEB_DIR"
        export NEXT_PUBLIC_API_URL="$api_url"
        export PORT="$web_port"
        export HOSTNAME="0.0.0.0"
        nohup npm run dev > nextjs.log 2>&1 &
        echo $! > "$pid_file"
      )
      sleep 0.5
    fi
    if ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
      tail -n 80 "$WEB_DIR/nextjs.log" || true
      fail "Web 启动失败（查看 apps/web/nextjs.log）"
    fi
    return 0
  fi

  if [[ "$pm" == "pnpm" ]]; then
    (
      cd "$WEB_DIR"
      export NEXT_PUBLIC_API_URL="$api_url"
      export PORT="$web_port"
      export HOSTNAME="0.0.0.0"
      nohup pnpm dev > nextjs.log 2>&1 &
      echo $! > "$pid_file"
    )
    sleep 0.5
    # Self-heal: if Next dev hits module-not-found on runtime chunks, restart after cache clean
    if grep -q "Cannot find module './" "$WEB_DIR/nextjs.log" 2>/dev/null; then
      kill_pidfile "$pid_file"
      rm -rf "$WEB_DIR/.next"
      (
        cd "$WEB_DIR"
        export NEXT_PUBLIC_API_URL="$api_url"
        export PORT="$web_port"
        export HOSTNAME="0.0.0.0"
        nohup pnpm dev > nextjs.log 2>&1 &
        echo $! > "$pid_file"
      )
      sleep 0.5
    fi
    if ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
      tail -n 80 "$WEB_DIR/nextjs.log" || true
      fail "Web 启动失败（查看 apps/web/nextjs.log）"
    fi
    return 0
  fi
}

kill_pidfile() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 0
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] || { rm -f "$pid_file"; return 0; }
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$pid_file"
    return 0
  fi

  kill "$pid" 2>/dev/null || true
  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
      return 0
    fi
    sleep 0.25
  done
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

web_pm() {
  if [[ -f "$WEB_DIR/package-lock.json" ]]; then
    cmd_exists npm || fail "未找到 npm，请先安装 Node.js"
    printf "npm\n"
    return 0
  fi

  if [[ -f "$WEB_DIR/pnpm-lock.yaml" ]]; then
    cmd_exists pnpm || fail "未找到 pnpm，请先安装 pnpm"
    printf "pnpm\n"
    return 0
  fi

  if cmd_exists npm; then
    printf "npm\n"
    return 0
  fi

  if cmd_exists pnpm; then
    printf "pnpm\n"
    return 0
  fi

  fail "未找到 npm 或 pnpm，请先安装 Node.js"
}

status() {
  local api_status="stopped"
  local web_status="stopped"
  local api_port=""
  local web_port=""
  api_port="$(cat "$RUN_DIR/api.port" 2>/dev/null || true)"
  web_port="$(cat "$RUN_DIR/web.port" 2>/dev/null || true)"
  if [[ -f "$RUN_DIR/api.pid" ]] && kill -0 "$(cat "$RUN_DIR/api.pid")" 2>/dev/null; then
    api_status="running"
  fi
  if [[ -f "$RUN_DIR/web.pid" ]] && kill -0 "$(cat "$RUN_DIR/web.pid")" 2>/dev/null; then
    web_status="running"
  fi
  if [[ -n "$api_port" || -n "$web_port" ]]; then
    printf "api=%s(%s) web=%s(%s)\n" "$api_status" "${api_port:-?}" "$web_status" "${web_port:-?}"
  else
    printf "api=%s web=%s\n" "$api_status" "$web_status"
  fi
}

logs() {
  local target="${1:-all}"
  if [[ "$target" == "api" ]]; then
    tail -n 200 -f "$API_DIR/uvicorn.log"
  elif [[ "$target" == "web" ]]; then
    tail -n 200 -f "$WEB_DIR/nextjs.log"
  else
    tail -n 200 -f "$API_DIR/uvicorn.log" "$WEB_DIR/nextjs.log"
  fi
}

usage() {
  cat <<'TXT'
用法：
  ./dev.sh up        启动 postgres/redis + API + Web（默认）
  ./dev.sh stop      停止 API + Web（保留 postgres/redis）
  ./dev.sh down      停止 API + Web 并关闭 postgres/redis
  ./dev.sh status    查看 API/Web 运行状态
  ./dev.sh logs [api|web|all]  跟随日志（默认 all）

环境变量：
  FORCE_INSTALL=1    强制重装后端依赖
  NEXT_PUBLIC_API_URL=...  前端请求的 API 地址
  PORT=3000          前端端口
TXT
}

main() {
  local action="${1:-up}"
  case "$action" in
    up)
      ensure_env_file
      docker_up
      ensure_python_venv
      start_api
      start_web
      status
      printf "API: http://127.0.0.1:%s\nWeb: http://127.0.0.1:%s\n" "$(cat "$RUN_DIR/api.port")" "$(cat "$RUN_DIR/web.port")"
      ;;
    stop)
      kill_pidfile "$RUN_DIR/web.pid"
      kill_pidfile "$RUN_DIR/api.pid"
      status
      ;;
    down)
      kill_pidfile "$RUN_DIR/web.pid"
      kill_pidfile "$RUN_DIR/api.pid"
      docker_down
      status
      ;;
    status)
      status
      ;;
    logs)
      logs "${2:-all}"
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage
      exit 2
      ;;
  esac
}

main "$@"
