import { describe, expect, it } from "vitest";
import { applyManualReorder } from "@/app/toolbox/utils";
import type { SortBarItem } from "@/lib/sorting-visualizer";

function toItems(values: number[]): SortBarItem[] {
  return values.map((value, index) => ({ id: index, value }));
}

function values(items: SortBarItem[]): number[] {
  return items.map((item) => item.value);
}

describe("applyManualReorder", () => {
  it("uses swap behavior for selection sort", () => {
    const result = applyManualReorder(toItems([9, 5, 2, 7, 1, 8, 3]), 4, 0, "selection");
    expect(values(result)).toEqual([1, 5, 2, 7, 9, 8, 3]);
  });

  it("uses insert behavior for insertion sort", () => {
    const result = applyManualReorder(toItems([9, 5, 2, 7, 1, 8, 3]), 4, 0, "insertion");
    expect(values(result)).toEqual([1, 9, 5, 2, 7, 8, 3]);
  });

  it("keeps current insert behavior for bubble sort", () => {
    const result = applyManualReorder(toItems([9, 5, 2, 7, 1, 8, 3]), 4, 0, "bubble");
    expect(values(result)).toEqual([1, 9, 5, 2, 7, 8, 3]);
  });

  it("returns original array for invalid indexes", () => {
    const items = toItems([9, 5, 2]);
    expect(applyManualReorder(items, -1, 0, "selection")).toBe(items);
    expect(applyManualReorder(items, 0, 9, "selection")).toBe(items);
    expect(applyManualReorder(items, 1, 1, "selection")).toBe(items);
  });
});
