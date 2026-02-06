export interface ChatMessageLike {
  role: string;
  content: string;
}

const FENCED_CODE_BLOCK_REGEXP = /```(?:[a-zA-Z0-9_+#-]+)?\n[\s\S]*?```/g;
const OPENING_FENCE_REGEXP = /^```(?:[a-zA-Z0-9_+#-]+)?\n/;
const CLOSING_FENCE_REGEXP = /```$/;
const LANGUAGE_FENCE_REGEXP = /^```([a-zA-Z0-9_+#-]+)?\n/;
const FRAME_START_REGEXP =
  /^(?:python\s*)?(?:代码)?(?:参考)?(?:示例)?(?:填空)?框架\s*[:：]\s*(.*)$/i;
const FRAME_STOP_REGEXP = /^(解释|思路|说明|下一步|提示|问题|你先|请先)\s*[:：]?/;
const PYTHON_LINE_REGEXP =
  /^\s*(?:def\b|for\b|while\b|if\b|elif\b|else:|try:|except\b|class\b|with\b|return\b|print\s*\(|[A-Za-z_]\w*\s*=)/;
const PLACEHOLDER_REGEXP = /____\d+____/;

function isPythonFence(block: string): boolean {
  const language = block.match(LANGUAGE_FENCE_REGEXP)?.[1]?.toLowerCase();
  return language === "python" || language === "py";
}

function isPythonLikeLine(line: string): boolean {
  if (/^\s+\S/.test(line)) {
    return true;
  }

  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (PLACEHOLDER_REGEXP.test(trimmed)) {
    return true;
  }

  if (PYTHON_LINE_REGEXP.test(trimmed)) {
    return true;
  }

  if (trimmed.endsWith(":")) {
    return true;
  }

  return false;
}

function normalizeSnippet(lines: string[]): string | null {
  const normalized = [...lines];

  while (normalized.length > 0 && !normalized[0].trim()) {
    normalized.shift();
  }
  while (normalized.length > 0 && !normalized[normalized.length - 1].trim()) {
    normalized.pop();
  }

  const snippet = normalized.join("\n").trim();
  if (!snippet) {
    return null;
  }

  const codeLineCount = normalized.filter((line) => isPythonLikeLine(line)).length;
  if (codeLineCount < 2) {
    return null;
  }

  return snippet;
}

function extractLabeledFramework(content: string): string | null {
  const lines = content.split(/\r?\n/);
  let latestCandidate: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const matched = line.trim().match(FRAME_START_REGEXP);
    if (!matched) {
      continue;
    }

    const collected: string[] = [];
    const inlineCode = matched[1]?.trim();
    if (inlineCode && isPythonLikeLine(inlineCode)) {
      collected.push(inlineCode);
    }

    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLine = lines[j];
      const trimmed = nextLine.trim();

      if (FRAME_STOP_REGEXP.test(trimmed) && collected.length > 0) {
        break;
      }

      if (!trimmed) {
        if (collected.length > 0) {
          collected.push(nextLine);
        }
        continue;
      }

      if (isPythonLikeLine(nextLine)) {
        collected.push(nextLine);
        continue;
      }

      if (collected.length > 0) {
        break;
      }
    }

    const candidate = normalizeSnippet(collected);
    if (candidate) {
      latestCandidate = candidate;
    }
  }

  return latestCandidate;
}

function extractPythonLikeBlock(content: string): string | null {
  const lines = content.split(/\r?\n/);
  const candidates: string[] = [];
  let current: string[] = [];

  const commitCurrent = () => {
    const candidate = normalizeSnippet(current);
    if (candidate) {
      candidates.push(candidate);
    }
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (isPythonLikeLine(line)) {
      current.push(line);
      continue;
    }

    if (!trimmed && current.length > 0) {
      current.push(line);
      continue;
    }

    if (current.length > 0) {
      commitCurrent();
    }
  }

  if (current.length > 0) {
    commitCurrent();
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates[candidates.length - 1];
}

export function extractCodeSnippet(content: string): string | null {
  const matches = content.match(FENCED_CODE_BLOCK_REGEXP);
  if (matches && matches.length > 0) {
    const pythonBlock = [...matches].reverse().find((block) => isPythonFence(block));
    const targetBlock = pythonBlock ?? matches[matches.length - 1];

    if (!targetBlock) {
      return null;
    }

    const snippet = targetBlock
      .replace(OPENING_FENCE_REGEXP, "")
      .replace(CLOSING_FENCE_REGEXP, "")
      .trim();

    return snippet || null;
  }

  const labeledFramework = extractLabeledFramework(content);
  if (labeledFramework) {
    return labeledFramework;
  }

  return extractPythonLikeBlock(content);
}

export function getLatestAssistantCode(messages: ChatMessageLike[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    const snippet = extractCodeSnippet(message.content);
    if (snippet) {
      return snippet;
    }
  }

  return null;
}
