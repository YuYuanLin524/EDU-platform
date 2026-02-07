import type { SortDirection, SortingAlgorithm } from "@/lib/sorting-visualizer";

export interface ManualRound {
  roundNumber: number;
  expectedValues: number[];
  sortedIndices: number[];
  instruction: string;
}

export interface ManualRoundVerifyResult {
  passed: boolean;
  firstErrorIndex: number | null;
  message: string;
}

const SUPPORTED_MANUAL_ALGORITHMS: SortingAlgorithm[] = ["bubble", "selection", "insertion"];

function shouldSwapAdjacent(left: number, right: number, direction: SortDirection): boolean {
  if (direction === "desc") {
    return left < right;
  }

  return left > right;
}

function shouldPickCandidate(candidate: number, baseline: number, direction: SortDirection): boolean {
  if (direction === "desc") {
    return candidate > baseline;
  }

  return candidate < baseline;
}

function shouldShift(existing: number, inserted: number, direction: SortDirection): boolean {
  if (direction === "desc") {
    return existing < inserted;
  }

  return existing > inserted;
}

function createBubbleRounds(values: number[], direction: SortDirection): ManualRound[] {
  const items = [...values];
  const rounds: ManualRound[] = [];

  for (let pass = 0; pass < items.length - 1; pass += 1) {
    let hasSwapped = false;

    for (let index = 0; index < items.length - pass - 1; index += 1) {
      if (shouldSwapAdjacent(items[index], items[index + 1], direction)) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        hasSwapped = true;
      }
    }

    const settledStart = Math.max(0, items.length - pass - 1);
    const sortedIndices = Array.from(
      { length: items.length - settledStart },
      (_, offset) => settledStart + offset
    );

    rounds.push({
      roundNumber: pass + 1,
      expectedValues: [...items],
      sortedIndices,
      instruction: `完成第 ${pass + 1} 轮冒泡后再校验`,
    });

    if (!hasSwapped) {
      break;
    }
  }

  return rounds;
}

function createSelectionRounds(values: number[], direction: SortDirection): ManualRound[] {
  const items = [...values];
  const rounds: ManualRound[] = [];

  for (let start = 0; start < items.length; start += 1) {
    let candidateIndex = start;

    for (let index = start + 1; index < items.length; index += 1) {
      if (shouldPickCandidate(items[index], items[candidateIndex], direction)) {
        candidateIndex = index;
      }
    }

    if (candidateIndex !== start) {
      [items[start], items[candidateIndex]] = [items[candidateIndex], items[start]];
    }

    rounds.push({
      roundNumber: start + 1,
      expectedValues: [...items],
      sortedIndices: Array.from({ length: start + 1 }, (_, index) => index),
      instruction: `完成第 ${start + 1} 轮选择后再校验`,
    });
  }

  return rounds;
}

function createInsertionRounds(values: number[], direction: SortDirection): ManualRound[] {
  const items = [...values];
  const rounds: ManualRound[] = [];

  for (let index = 1; index < items.length; index += 1) {
    const currentValue = items[index];
    let position = index - 1;

    while (position >= 0 && shouldShift(items[position], currentValue, direction)) {
      items[position + 1] = items[position];
      position -= 1;
    }

    items[position + 1] = currentValue;

    rounds.push({
      roundNumber: index,
      expectedValues: [...items],
      sortedIndices: Array.from({ length: index + 1 }, (_, cursor) => cursor),
      instruction: `完成第 ${index} 轮插入后再校验`,
    });
  }

  return rounds;
}

function countValues(values: number[]): Map<number, number> {
  const counts = new Map<number, number>();

  values.forEach((value) => {
    const currentCount = counts.get(value) ?? 0;
    counts.set(value, currentCount + 1);
  });

  return counts;
}

function hasSameMultiset(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftCounts = countValues(left);
  const rightCounts = countValues(right);

  if (leftCounts.size !== rightCounts.size) {
    return false;
  }

  return Array.from(leftCounts.entries()).every(
    ([value, count]) => rightCounts.get(value) === count
  );
}

export function isManualSupportedAlgorithm(algorithm: SortingAlgorithm): boolean {
  return SUPPORTED_MANUAL_ALGORITHMS.includes(algorithm);
}

export function buildManualRounds(
  values: number[],
  algorithm: SortingAlgorithm,
  direction: SortDirection
): ManualRound[] {
  if (values.length <= 1) {
    return [];
  }

  switch (algorithm) {
    case "bubble":
      return createBubbleRounds(values, direction);
    case "selection":
      return createSelectionRounds(values, direction);
    case "insertion":
      return createInsertionRounds(values, direction);
    default:
      return [];
  }
}

export function verifyManualRound(
  currentValues: number[],
  expectedRound: ManualRound
): ManualRoundVerifyResult {
  if (!hasSameMultiset(currentValues, expectedRound.expectedValues)) {
    return {
      passed: false,
      firstErrorIndex: null,
      message: "元素集合不一致，请确认没有遗漏或重复拖拽元素",
    };
  }

  for (let index = 0; index < currentValues.length; index += 1) {
    if (currentValues[index] === expectedRound.expectedValues[index]) {
      continue;
    }

    return {
      passed: false,
      firstErrorIndex: index,
      message: `第 ${index + 1} 位应为 ${expectedRound.expectedValues[index]}，当前为 ${currentValues[index]}`,
    };
  }

  return {
    passed: true,
    firstErrorIndex: null,
    message: `第 ${expectedRound.roundNumber} 轮校验通过`,
  };
}
