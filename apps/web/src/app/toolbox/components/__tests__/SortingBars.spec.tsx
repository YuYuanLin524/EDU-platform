import React from "react";
import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { SortingBars } from "@/app/toolbox/components/SortingBars";
import type { SortSnapshot } from "@/lib/sorting-visualizer";

afterEach(() => {
  cleanup();
});

function makeSnapshot(values: number[]): SortSnapshot {
  return {
    items: values.map((value, index) => ({ id: index, value })),
    activeIndices: [],
    sortedIndices: [],
    message: "测试快照",
    stepType: "init",
  };
}

describe("SortingBars", () => {
  it("shows verify controls in manual mode", () => {
    render(
      <SortingBars
        snapshot={makeSnapshot([3, 1, 2])}
        previousSnapshot={null}
        mode="manual"
        manualErrorIndex={null}
        isManualSortable
        currentStep={1}
        canVerifyRound
        isVerifyDisabled={false}
        manualRoundHint="第 2 轮"
        onVerifyRound={vi.fn()}
        onManualReorder={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "校验本轮" })).toBeInTheDocument();
    expect(screen.getByText("轮次：2")).toBeInTheDocument();
  });

  it("hides verify controls in auto mode", () => {
    render(
      <SortingBars
        snapshot={makeSnapshot([3, 1, 2])}
        previousSnapshot={null}
        mode="auto"
        manualErrorIndex={null}
        isManualSortable={false}
        currentStep={0}
        canVerifyRound={false}
        isVerifyDisabled
        manualRoundHint="第 1 轮"
        onVerifyRound={vi.fn()}
        onManualReorder={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "校验本轮" })).not.toBeInTheDocument();
    expect(screen.queryByText(/轮次：/)).not.toBeInTheDocument();
  });

  it("locks drag and shows completion badge when manual round finished", () => {
    render(
      <SortingBars
        snapshot={makeSnapshot([9, 8, 7])}
        previousSnapshot={null}
        mode="manual"
        manualErrorIndex={null}
        isManualSortable={false}
        currentStep={2}
        canVerifyRound={false}
        isVerifyDisabled
        manualRoundHint="排序完成"
        onVerifyRound={vi.fn()}
        onManualReorder={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "校验本轮" })).not.toBeInTheDocument();

    const completionTexts = screen.getAllByText("排序完成");
    expect(completionTexts.length).toBe(2);
  });
});
