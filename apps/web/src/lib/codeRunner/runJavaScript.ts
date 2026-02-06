export interface JavaScriptRunOptions {
  timeoutMs?: number;
}

export interface JavaScriptRunResult {
  status: "success" | "error" | "timeout";
  output: string;
  durationMs: number;
}

interface WorkerSuccessMessage {
  type: "success";
  stdout: string;
  stderr: string;
  result: string;
  hasResult: boolean;
}

interface WorkerErrorMessage {
  type: "error";
  stdout: string;
  stderr: string;
  error: string;
}

type WorkerMessage = WorkerSuccessMessage | WorkerErrorMessage;

const DEFAULT_TIMEOUT_MS = 3000;

function getNow(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

export async function runJavaScript(
  code: string,
  options: JavaScriptRunOptions = {}
): Promise<JavaScriptRunResult> {
  const source = code.trim();
  if (!source) {
    return {
      status: "error",
      output: "请先输入要验证的代码。",
      durationMs: 0,
    };
  }

  if (
    typeof window === "undefined" ||
    typeof Worker === "undefined" ||
    typeof URL === "undefined" ||
    typeof import.meta.url === "undefined"
  ) {
    return {
      status: "error",
      output: "当前环境不支持浏览器内代码执行。",
      durationMs: 0,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = getNow();
  const worker = new Worker(new URL("./runner.worker.ts", import.meta.url));

  return new Promise((resolve) => {
    let settled = false;

    const finish = (status: JavaScriptRunResult["status"], output: string) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      worker.terminate();
      resolve({
        status,
        output,
        durationMs: Math.max(0, Math.round(getNow() - startedAt)),
      });
    };

    const timeoutId = window.setTimeout(() => {
      finish("timeout", `运行超时（>${timeoutMs}ms），请检查是否存在死循环。`);
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const payload = event.data;
      if (!payload || (payload.type !== "success" && payload.type !== "error")) {
        finish("error", "运行器返回了未知结果，请重试。");
        return;
      }

      const lines: string[] = [];

      const stdoutText = payload.stdout.trim();
      const stderrText = payload.stderr.trim();

      if (stdoutText) {
        lines.push(stdoutText);
      }

      if (stderrText) {
        lines.push(`[stderr]\n${stderrText}`);
      }

      if (payload.type === "success") {
        if (payload.hasResult) {
          lines.push(`返回值: ${payload.result}`);
        }

        if (lines.length === 0) {
          lines.push("代码执行完成，没有输出内容。");
        }

        finish("success", lines.join("\n"));
        return;
      }

      lines.push(`错误: ${payload.error}`);
      finish("error", lines.join("\n"));
    };

    worker.onerror = () => {
      finish("error", "运行器发生异常，请稍后重试。");
    };

    worker.postMessage({ code: source });
  });
}
