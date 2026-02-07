import { describe, expect, it } from "vitest";
import {
  MAX_INPUT_COUNT,
  generateSortSnapshots,
  getPreviewSnapshot,
  parseNumberInput,
  validateMaxInputCount,
  type SortDirection,
  type SortStepType,
  type SortingAlgorithm,
} from "@/lib/sorting-visualizer";

describe("parseNumberInput", () => {
  it("parses comma and whitespace separated values", () => {
    expect(parseNumberInput("8, 3  5，1;7")).toEqual([8, 3, 5, 1, 7]);
  });

  it("throws when input has invalid token", () => {
    expect(() => parseNumberInput("1, two, 3")).toThrow("包含无效字符");
  });

  it("throws when input is empty", () => {
    expect(() => parseNumberInput("   , ,, ")).toThrow("请先输入一组数字");
  });

  it("allows fewer than three numbers", () => {
    const values = parseNumberInput("8, 3");
    expect(values).toEqual([8, 3]);
    expect(() => validateMaxInputCount(values)).not.toThrow();
  });

  it("rejects inputs larger than maximum", () => {
    const values = Array.from({ length: MAX_INPUT_COUNT + 1 }, (_, index) => index + 1);
    expect(() => validateMaxInputCount(values)).toThrow(`最多支持输入 ${MAX_INPUT_COUNT} 个数字`);
  });

  it("accepts inputs up to maximum", () => {
    const values = Array.from({ length: MAX_INPUT_COUNT }, (_, index) => index + 1);
    expect(() => validateMaxInputCount(values)).not.toThrow();
  });
});

describe("generateSortSnapshots", () => {
  const algorithms: SortingAlgorithm[] = ["bubble", "selection", "insertion", "quick", "merge"];
  const directions: SortDirection[] = ["asc", "desc"];
  const selectionOnlySteps: SortStepType[] = ["selection_pick", "selection_place"];
  const insertionOnlySteps: SortStepType[] = [
    "insertion_lift",
    "insertion_shift",
    "insertion_place",
  ];

  it.each(algorithms)("sorts values correctly with %s in asc", (algorithm) => {
    const values = [9, 1, 5, 3, 2];
    const snapshots = generateSortSnapshots(values, algorithm, "asc");
    const lastSnapshot = snapshots[snapshots.length - 1];

    expect(lastSnapshot.items.map((item) => item.value)).toEqual([1, 2, 3, 5, 9]);
    expect(lastSnapshot.sortedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(lastSnapshot.stepType).toBe("done");
  });

  it.each(algorithms)("sorts values correctly with %s in desc", (algorithm) => {
    const values = [9, 1, 5, 3, 2];
    const snapshots = generateSortSnapshots(values, algorithm, "desc");
    const lastSnapshot = snapshots[snapshots.length - 1];

    expect(lastSnapshot.items.map((item) => item.value)).toEqual([9, 5, 3, 2, 1]);
    expect(lastSnapshot.sortedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(lastSnapshot.stepType).toBe("done");
  });

  it.each(directions)("does not mutate original input in %s", (direction) => {
    const values = [4, 2, 1];
    generateSortSnapshots(values, "bubble", direction);
    expect(values).toEqual([4, 2, 1]);
  });

  it("marks swap steps with swap item ids", () => {
    const snapshots = generateSortSnapshots([5, 1, 4], "bubble");
    const swapSnapshots = snapshots.filter((snapshot) => snapshot.stepType === "swap");

    expect(swapSnapshots.length).toBeGreaterThan(0);
    expect(swapSnapshots.every((snapshot) => snapshot.swapItemIds?.length === 2)).toBe(true);
  });

  it("keeps stable item ids for duplicate values", () => {
    const snapshots = generateSortSnapshots([3, 1, 3, 2], "selection");
    const allIds = snapshots.flatMap((snapshot) => snapshot.items.map((item) => item.id));

    expect(new Set(allIds)).toEqual(new Set([0, 1, 2, 3]));
  });

  it("only uses swap step type for explicit swaps", () => {
    const snapshots = generateSortSnapshots([4, 3, 2, 1], "merge");
    const stepTypes = new Set<SortStepType>(snapshots.map((snapshot) => snapshot.stepType));

    expect(stepTypes.has("write")).toBe(true);
    expect(stepTypes.has("compare")).toBe(true);
    expect(stepTypes.has("swap")).toBe(false);
  });

  it("keeps bubble focused on compare/swap semantics", () => {
    const snapshots = generateSortSnapshots([9, 5, 2, 7], "bubble");
    const stepTypes = new Set<SortStepType>(snapshots.map((snapshot) => snapshot.stepType));

    selectionOnlySteps.forEach((stepType) => {
      expect(stepTypes.has(stepType)).toBe(false);
    });

    insertionOnlySteps.forEach((stepType) => {
      expect(stepTypes.has(stepType)).toBe(false);
    });
  });

  it("stops bubble pass snapshots early when already sorted", () => {
    const snapshots = generateSortSnapshots([9, 5, 2, 7, 1, 8, 3], "bubble", "asc");
    const settledSteps = snapshots.filter((snapshot) => snapshot.stepType === "settled");
    expect(settledSteps).toHaveLength(5);
  });

  it("adds pick and place semantics for selection sort", () => {
    const snapshots = generateSortSnapshots([9, 5, 2, 7], "selection");
    const stepTypes = new Set<SortStepType>(snapshots.map((snapshot) => snapshot.stepType));

    expect(stepTypes.has("selection_pick")).toBe(true);
    expect(stepTypes.has("selection_place")).toBe(true);

    const placement = snapshots.find((snapshot) => snapshot.stepType === "selection_place");
    expect(placement?.focusItemId).toBeDefined();
    expect(placement?.fromIndex).toBeDefined();
    expect(placement?.toIndex).toBeDefined();
  });

  it("adds lift/shift/place semantics for insertion sort", () => {
    const snapshots = generateSortSnapshots([9, 5, 2, 7], "insertion");
    const stepTypes = new Set<SortStepType>(snapshots.map((snapshot) => snapshot.stepType));

    expect(stepTypes.has("insertion_lift")).toBe(true);
    expect(stepTypes.has("insertion_shift")).toBe(true);
    expect(stepTypes.has("insertion_place")).toBe(true);

    const shift = snapshots.find((snapshot) => snapshot.stepType === "insertion_shift");
    expect(shift?.affectedRange).toBeDefined();

    const place = snapshots.find((snapshot) => snapshot.stepType === "insertion_place");
    expect(place?.focusItemId).toBeDefined();
    expect(place?.toIndex).toBeDefined();
  });

  it.each(algorithms)("keeps unique item ids in every snapshot for %s", (algorithm) => {
    const snapshots = generateSortSnapshots([9, 5, 2, 7, 1, 8, 3], algorithm);

    snapshots.forEach((snapshot) => {
      const ids = snapshot.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

describe("getPreviewSnapshot", () => {
  it("returns snapshot with same values and empty highlights", () => {
    const snapshot = getPreviewSnapshot([7, 4, 6], "asc");

    expect(snapshot.items.map((item) => item.value)).toEqual([7, 4, 6]);
    expect(snapshot.activeIndices).toEqual([]);
    expect(snapshot.sortedIndices).toEqual([]);
    expect(snapshot.stepType).toBe("init");
    expect(snapshot.message).toContain("准备就绪");
    expect(snapshot.message).toContain("从小到大");
  });

  it("shows descending hint when direction is desc", () => {
    const snapshot = getPreviewSnapshot([7, 4, 6], "desc");
    expect(snapshot.message).toContain("从大到小");
  });
});
