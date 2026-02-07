import { describe, expect, it } from "vitest";
import { getVerifiedRoundSortedIndices } from "@/app/toolbox/utils";

describe("getVerifiedRoundSortedIndices", () => {
  const rounds = [
    { sortedIndices: [6] },
    { sortedIndices: [5, 6] },
    { sortedIndices: [4, 5, 6] },
  ];

  it("returns empty when no round has been verified", () => {
    expect(getVerifiedRoundSortedIndices(rounds, 0, 7, false)).toEqual([]);
  });

  it("highlights previous verified round while showing next round", () => {
    expect(getVerifiedRoundSortedIndices(rounds, 2, 7, false)).toEqual([5, 6]);
  });

  it("clamps to latest verified round when index exceeds rounds", () => {
    expect(getVerifiedRoundSortedIndices(rounds, 99, 7, false)).toEqual([4, 5, 6]);
  });

  it("marks all elements when sorting is finished", () => {
    expect(getVerifiedRoundSortedIndices(rounds, 3, 7, true)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
