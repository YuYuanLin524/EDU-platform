interface WorkerRequest {
  code: string;
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

interface PyodideLike {
  setStdout: (options: { batched: (message: string) => void }) => void;
  setStderr: (options: { batched: (message: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
}

declare const loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>;
declare function importScripts(...urls: string[]): void;

const PYODIDE_VERSION = "0.27.3";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_URL = `${PYODIDE_BASE_URL}pyodide.js`;

let pyodidePromise: Promise<PyodideLike> | null = null;

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function releasePyProxy(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return;
  }

  const destroy = (value as { destroy?: () => void }).destroy;
  if (typeof destroy === "function") {
    destroy.call(value);
  }
}

async function getPyodideRuntime(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    if (typeof importScripts !== "function") {
      throw new Error("当前环境不支持加载 Python 运行时");
    }

    importScripts(PYODIDE_SCRIPT_URL);
    pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });
  }

  return pyodidePromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const code = typeof event.data?.code === "string" ? event.data.code : "";
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  try {
    const pyodide = await getPyodideRuntime();
    pyodide.setStdout({
      batched: (message) => {
        stdoutLines.push(message);
      },
    });
    pyodide.setStderr({
      batched: (message) => {
        stderrLines.push(message);
      },
    });

    const result = await pyodide.runPythonAsync(code);
    const resultText = normalizeText(result);
    releasePyProxy(result);

    const response: WorkerSuccessMessage = {
      type: "success",
      stdout: stdoutLines.join("\n"),
      stderr: stderrLines.join("\n"),
      result: resultText,
      hasResult: resultText.length > 0,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerErrorMessage = {
      type: "error",
      stdout: stdoutLines.join("\n"),
      stderr: stderrLines.join("\n"),
      error: normalizeError(error),
    };
    self.postMessage(response);
  }
};

export {};
