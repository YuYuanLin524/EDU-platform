import { describe, expect, it } from "vitest";
import { buildManualRounds } from "@/lib/manual-sort-validator";

describe("manual round sorted indices", () => {
  it("bubble tracks settled suffix after each verified round", () => {
    const rounds = buildManualRounds([9, 5, 2, 7, 1, 8, 3], "bubble", "asc");
    expect(rounds[0].sortedIndices).toEqual([6]);
    expect(rounds[1].sortedIndices).toEqual([5, 6]);
    expect(rounds[2].sortedIndices).toEqual([4, 5, 6]);
    expect(rounds[3].sortedIndices).toEqual([3, 4, 5, 6]);
    expect(rounds[4].sortedIndices).toEqual([2, 3, 4, 5, 6]);
  });

  it("selection tracks settled prefix after each verified round", () => {
    const rounds = buildManualRounds([9, 5, 2, 7, 1, 8, 3], "selection", "asc");
    expect(rounds[0].sortedIndices).toEqual([0]);
    expect(rounds[1].sortedIndices).toEqual([0, 1]);
    expect(rounds[2].sortedIndices).toEqual([0, 1, 2]);
  });

  it("insertion tracks sorted prefix after each verified round", () => {
    const rounds = buildManualRounds([9, 5, 2, 7], "insertion", "asc");
    expect(rounds[0].sortedIndices).toEqual([0, 1]);
    expect(rounds[1].sortedIndices).toEqual([0, 1, 2]);
    expect(rounds[2].sortedIndices).toEqual([0, 1, 2, 3]);
  });
});
