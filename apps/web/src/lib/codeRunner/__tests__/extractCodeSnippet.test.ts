import { describe, expect, it } from "vitest";
import { extractCodeSnippet, getLatestAssistantCode } from "../extractCodeSnippet";

describe("extractCodeSnippet", () => {
  it("extracts python fill-in framework from plain text", () => {
    const content = [
      "好的，我们先用填空方式。",
      "填空框架：",
      "total = ____1____",
      "for i in range(____2____, ____3____):",
      "    total += ____4____",
      "print(total)",
      "解释：____1____ 是累加器初值。",
    ].join("\n");

    expect(extractCodeSnippet(content)).toBe(
      [
        "total = ____1____",
        "for i in range(____2____, ____3____):",
        "    total += ____4____",
        "print(total)",
      ].join("\n")
    );
  });

  it("extracts python-like block when no fence and no label", () => {
    const content = [
      "你可以先写：",
      "count = 0",
      "for x in nums:",
      "    count += x",
      "print(count)",
      "然后再试试边界情况。",
    ].join("\n");

    expect(extractCodeSnippet(content)).toBe(
      ["count = 0", "for x in nums:", "    count += x", "print(count)"].join("\n")
    );
  });

  it("prefers latest python fenced block", () => {
    const content = [
      "先是 JavaScript：",
      "```js",
      "console.log('hello')",
      "```",
      "再是 Python：",
      "```python",
      "print('hello python')",
      "```",
      "最后又来一段 JS：",
      "```javascript",
      "console.log('latest js')",
      "```",
    ].join("\n");

    expect(extractCodeSnippet(content)).toBe("print('hello python')");
  });

  it("returns latest fenced code block", () => {
    const content = [
      "先看第一版：",
      "```js",
      "console.log('v1')",
      "```",
      "再看第二版：",
      "```javascript",
      "console.log('v2')",
      "```",
    ].join("\n");

    expect(extractCodeSnippet(content)).toBe("console.log('v2')");
  });

  it("returns null when no fenced block", () => {
    expect(extractCodeSnippet("这里只有解释文本，没有代码框架")).toBeNull();
  });
});

describe("getLatestAssistantCode", () => {
  it("reads newest assistant snippet only", () => {
    const result = getLatestAssistantCode([
      { role: "assistant", content: "```js\nconst a = 1;\n```" },
      { role: "user", content: "```js\nconst b = 2;\n```" },
      { role: "assistant", content: "这里没代码" },
      { role: "assistant", content: "```js\nconst c = 3;\n```" },
    ]);

    expect(result).toBe("const c = 3;");
  });
});
