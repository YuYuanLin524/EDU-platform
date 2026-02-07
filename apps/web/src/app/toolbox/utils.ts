import type { SortBarItem, SortSnapshot, SortingAlgorithm } from "@/lib/sorting-visualizer";

export function getBarHeight(value: number, minValue: number, maxValue: number): number {
  if (maxValue === minValue) {
    return 55;
  }

  return 24 + ((value - minValue) / (maxValue - minValue)) * 68;
}

export function getSortMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "排序启动失败，请稍后重试";
}

export function getSwapDelta(
  itemId: number,
  snapshot: SortSnapshot,
  previousSnapshot: SortSnapshot | null
): number {
  if (!previousSnapshot || snapshot.stepType !== "swap" || !snapshot.swapItemIds?.includes(itemId)) {
    return 0;
  }

  const previousIndex = previousSnapshot.items.findIndex((item) => item.id === itemId);
  const currentIndex = snapshot.items.findIndex((item) => item.id === itemId);

  if (previousIndex < 0 || currentIndex < 0) {
    return 0;
  }

  return previousIndex - currentIndex;
}

export function getVerifiedRoundSortedIndices(
  rounds: Array<{ sortedIndices: number[] }>,
  manualRoundIndex: number,
  itemCount: number,
  isFinished: boolean
): number[] {
  if (itemCount <= 0) {
    return [];
  }

  if (isFinished) {
    return Array.from({ length: itemCount }, (_, index) => index);
  }

  if (manualRoundIndex <= 0 || rounds.length === 0) {
    return [];
  }

  const verifiedRound = rounds[Math.min(manualRoundIndex - 1, rounds.length - 1)];
  return [...verifiedRound.sortedIndices];
}

function insertReorder(items: SortBarItem[], fromIndex: number, toIndex: number): SortBarItem[] {
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

function swapReorder(items: SortBarItem[], fromIndex: number, toIndex: number): SortBarItem[] {
  const result = [...items];
  [result[fromIndex], result[toIndex]] = [result[toIndex], result[fromIndex]];
  return result;
}

export function applyManualReorder(
  items: SortBarItem[],
  fromIndex: number,
  toIndex: number,
  algorithm: SortingAlgorithm
): SortBarItem[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  if (algorithm === "selection") {
    return swapReorder(items, fromIndex, toIndex);
  }

  return insertReorder(items, fromIndex, toIndex);
}
