import { describe, expect, it } from "vitest";
import {
  buildManualRounds,
  isManualSupportedAlgorithm,
  verifyManualRound,
} from "@/lib/manual-sort-validator";

describe("isManualSupportedAlgorithm", () => {
  it("supports bubble/selection/insertion", () => {
    expect(isManualSupportedAlgorithm("bubble")).toBe(true);
    expect(isManualSupportedAlgorithm("selection")).toBe(true);
    expect(isManualSupportedAlgorithm("insertion")).toBe(true);
  });

  it("does not support quick/merge", () => {
    expect(isManualSupportedAlgorithm("quick")).toBe(false);
    expect(isManualSupportedAlgorithm("merge")).toBe(false);
  });
});

describe("buildManualRounds", () => {
  it("builds bubble rounds in ascending order", () => {
    const rounds = buildManualRounds([4, 1, 3], "bubble", "asc");
    expect(rounds).toHaveLength(2);
    expect(rounds[0].expectedValues).toEqual([1, 3, 4]);
    expect(rounds[0].sortedIndices).toEqual([2]);
    expect(rounds[1].expectedValues).toEqual([1, 3, 4]);
  });

  it("stops bubble rounds early when sequence becomes sorted", () => {
    const rounds = buildManualRounds([9, 5, 2, 7, 1, 8, 3], "bubble", "asc");
    expect(rounds).toHaveLength(5);
    expect(rounds[rounds.length - 1].expectedValues).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it("stops bubble rounds early in descending mode too", () => {
    const rounds = buildManualRounds([1, 4, 2, 9, 3], "bubble", "desc");
    expect(rounds).toHaveLength(4);
    expect(rounds[rounds.length - 1].expectedValues).toEqual([9, 4, 3, 2, 1]);
  });

  it("builds selection rounds in descending order", () => {
    const rounds = buildManualRounds([4, 1, 3], "selection", "desc");
    expect(rounds).toHaveLength(3);
    expect(rounds[0].expectedValues).toEqual([4, 1, 3]);
    expect(rounds[2].expectedValues).toEqual([4, 3, 1]);
  });

  it("builds insertion rounds in ascending order", () => {
    const rounds = buildManualRounds([5, 2, 4, 1], "insertion", "asc");
    expect(rounds).toHaveLength(3);
    expect(rounds[0].expectedValues).toEqual([2, 5, 4, 1]);
    expect(rounds[2].expectedValues).toEqual([1, 2, 4, 5]);
  });

  it("returns empty rounds for unsupported algorithms", () => {
    expect(buildManualRounds([4, 1, 3], "quick", "asc")).toEqual([]);
    expect(buildManualRounds([4, 1, 3], "merge", "desc")).toEqual([]);
  });
});

describe("verifyManualRound", () => {
  it("passes when current sequence equals expected round", () => {
    const round = buildManualRounds([3, 1, 2], "bubble", "asc")[0];
    const result = verifyManualRound(round.expectedValues, round);

    expect(result.passed).toBe(true);
    expect(result.firstErrorIndex).toBeNull();
    expect(result.message).toContain("校验通过");
  });

  it("fails with first error index when order is wrong", () => {
    const round = buildManualRounds([3, 1, 2], "bubble", "asc")[0];
    const wrong = [...round.expectedValues];
    [wrong[0], wrong[1]] = [wrong[1], wrong[0]];

    const result = verifyManualRound(wrong, round);
    expect(result.passed).toBe(false);
    expect(result.firstErrorIndex).toBe(0);
    expect(result.message).toContain("第 1 位应为");
  });

  it("fails when multiset differs", () => {
    const round = buildManualRounds([3, 1, 2], "selection", "asc")[0];
    const result = verifyManualRound([999, ...round.expectedValues.slice(1)], round);

    expect(result.passed).toBe(false);
    expect(result.firstErrorIndex).toBeNull();
    expect(result.message).toContain("元素集合不一致");
  });

  it("supports duplicate values", () => {
    const rounds = buildManualRounds([2, 2, 1], "insertion", "desc");
    const finalRound = rounds[rounds.length - 1];
    const result = verifyManualRound(finalRound.expectedValues, finalRound);

    expect(result.passed).toBe(true);
  });
});
