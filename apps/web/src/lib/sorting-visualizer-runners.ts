import type { SortBarItem, SortDirection } from "@/lib/sorting-visualizer";

type SortStepType =
  | "compare"
  | "swap"
  | "write"
  | "pivot"
  | "settled"
  | "selection_pick"
  | "selection_place"
  | "insertion_lift"
  | "insertion_shift"
  | "insertion_place";

interface SnapshotOptions {
  activeIndices?: number[];
  sortedIndices?: number[];
  stepType?: SortStepType;
  swapItemIds?: [number, number];
  focusItemId?: number;
  fromIndex?: number;
  toIndex?: number;
  affectedRange?: [number, number];
}

type SnapshotRecorder = (message: string, options?: SnapshotOptions) => void;

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

function shouldStayAtPivotSide(value: number, pivot: number, direction: SortDirection): boolean {
  if (direction === "desc") {
    return value >= pivot;
  }

  return value <= pivot;
}

function shouldTakeLeftBeforeRight(
  leftValue: number,
  rightValue: number,
  direction: SortDirection
): boolean {
  if (direction === "desc") {
    return leftValue >= rightValue;
  }

  return leftValue <= rightValue;
}

function getDirectionNoun(direction: SortDirection): string {
  return direction === "desc" ? "最大值" : "最小值";
}

function getDirectionPlacementHint(direction: SortDirection): string {
  return direction === "desc" ? "较小" : "较大";
}

function prefixIndices(endInclusive: number): number[] {
  if (endInclusive < 0) {
    return [];
  }

  return Array.from({ length: endInclusive + 1 }, (_, index) => index);
}

function segmentIndices(start: number, end: number): number[] {
  if (end < start) {
    return [];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function swapItems(items: SortBarItem[], leftIndex: number, rightIndex: number): [number, number] {
  const leftId = items[leftIndex].id;
  const rightId = items[rightIndex].id;
  [items[leftIndex], items[rightIndex]] = [items[rightIndex], items[leftIndex]];
  return [leftId, rightId];
}

export function runBubbleSort(
  items: SortBarItem[],
  push: SnapshotRecorder,
  direction: SortDirection
): void {
  const length = items.length;
  const settled = new Set<number>();
  const sortedIndices = (): number[] => Array.from(settled);

  for (let pass = 0; pass < length - 1; pass += 1) {
    let hasSwapped = false;

    for (let index = 0; index < length - pass - 1; index += 1) {
      push(`比较 ${items[index].value} 与 ${items[index + 1].value}`, {
        activeIndices: [index, index + 1],
        sortedIndices: sortedIndices(),
        stepType: "compare",
      });

      if (!shouldSwapAdjacent(items[index].value, items[index + 1].value, direction)) {
        continue;
      }

      const swapItemIds = swapItems(items, index, index + 1);
      hasSwapped = true;
      push(`交换 ${items[index + 1].value} 和 ${items[index].value}`, {
        activeIndices: [index, index + 1],
        sortedIndices: sortedIndices(),
        stepType: "swap",
        swapItemIds,
      });
    }

    settled.add(length - pass - 1);
    push(`第 ${pass + 1} 轮结束，末尾元素已确定`, {
      sortedIndices: sortedIndices(),
      stepType: "settled",
    });

    if (!hasSwapped) {
      const unsettledUpperBound = length - pass - 2;
      for (let cursor = unsettledUpperBound; cursor >= 0; cursor -= 1) {
        settled.add(cursor);
      }

      break;
    }
  }
}

export function runSelectionSort(
  items: SortBarItem[],
  push: SnapshotRecorder,
  direction: SortDirection
): void {
  const length = items.length;
  const settled = new Set<number>();
  const sortedIndices = (): number[] => Array.from(settled);

  for (let start = 0; start < length; start += 1) {
    let minIndex = start;

    for (let index = start + 1; index < length; index += 1) {
      push(`扫描${getDirectionNoun(direction)}候选：${items[minIndex].value} 与 ${items[index].value}`, {
        activeIndices: [minIndex, index],
        sortedIndices: sortedIndices(),
        stepType: "compare",
      });

      if (shouldPickCandidate(items[index].value, items[minIndex].value, direction)) {
        minIndex = index;
        push(`更新${getDirectionNoun(direction)}为 ${items[minIndex].value}`, {
          activeIndices: [minIndex],
          sortedIndices: sortedIndices(),
          stepType: "compare",
        });
      }
    }

    if (minIndex !== start) {
      const minItemId = items[minIndex].id;
      push(`锁定${getDirectionNoun(direction)} ${items[minIndex].value}，准备放入有序区`, {
        activeIndices: [minIndex],
        sortedIndices: sortedIndices(),
        stepType: "selection_pick",
        focusItemId: minItemId,
        fromIndex: minIndex,
        toIndex: start,
      });

      const swapItemIds = swapItems(items, start, minIndex);
      push(`把${getDirectionNoun(direction)}放到索引 ${start + 1}`, {
        activeIndices: [start, minIndex],
        sortedIndices: sortedIndices(),
        stepType: "selection_place",
        swapItemIds,
        focusItemId: minItemId,
        fromIndex: minIndex,
        toIndex: start,
      });
    } else {
      push(`当前位置已是${getDirectionNoun(direction)}，无需移动`, {
        activeIndices: [start],
        sortedIndices: sortedIndices(),
        stepType: "selection_pick",
        focusItemId: items[start].id,
        fromIndex: start,
        toIndex: start,
      });
    }

    settled.add(start);
    push(`前 ${start + 1} 个元素已就位`, {
      sortedIndices: sortedIndices(),
      stepType: "settled",
    });
  }
}

export function runInsertionSort(
  items: SortBarItem[],
  push: SnapshotRecorder,
  direction: SortDirection
): void {
  if (items.length === 0) {
    return;
  }

  push("默认第 1 个元素有序", {
    activeIndices: [0],
    sortedIndices: [0],
    stepType: "settled",
  });

  for (let index = 1; index < items.length; index += 1) {
    const pickedItem = { ...items[index] };
    const sourceIndex = index;
    let position = index - 1;

    push(`取出 ${pickedItem.value}，向前寻找插入位置`, {
      activeIndices: [index],
      sortedIndices: prefixIndices(index - 1),
      stepType: "insertion_lift",
      focusItemId: pickedItem.id,
      fromIndex: sourceIndex,
    });

    while (position >= 0 && shouldShift(items[position].value, pickedItem.value, direction)) {
      position -= 1;
    }

    const insertIndex = position + 1;
    const hasShift = insertIndex !== sourceIndex;

    if (hasShift) {
      push(`为插入 ${pickedItem.value} 右移有序区元素`, {
        activeIndices: segmentIndices(insertIndex, sourceIndex),
        sortedIndices: prefixIndices(index - 1),
        stepType: "insertion_shift",
        focusItemId: pickedItem.id,
        affectedRange: [insertIndex, sourceIndex],
      });

      for (let cursor = sourceIndex - 1; cursor >= insertIndex; cursor -= 1) {
        items[cursor + 1] = { ...items[cursor] };
      }
    }

    items[insertIndex] = pickedItem;
    push(`把 ${pickedItem.value} 插入到索引 ${insertIndex + 1}`, {
      activeIndices: [insertIndex],
      sortedIndices: prefixIndices(index),
      stepType: "insertion_place",
      focusItemId: pickedItem.id,
      fromIndex: sourceIndex,
      toIndex: insertIndex,
    });
  }
}

export function runQuickSort(
  items: SortBarItem[],
  push: SnapshotRecorder,
  direction: SortDirection
): void {
  const settled = new Set<number>();

  const sortedIndices = (): number[] => Array.from(settled).sort((left, right) => left - right);

  const partition = (left: number, right: number): number => {
    const pivot = items[right].value;
    let low = left;

    push(`选择 ${pivot} 作为基准值`, {
      activeIndices: [right],
      sortedIndices: sortedIndices(),
      stepType: "pivot",
    });

    for (let scan = left; scan < right; scan += 1) {
      push(`比较 ${items[scan].value} 与基准 ${pivot}`, {
        activeIndices: [scan, right],
        sortedIndices: sortedIndices(),
        stepType: "compare",
      });

      if (!shouldStayAtPivotSide(items[scan].value, pivot, direction)) {
        continue;
      }

      if (low !== scan) {
        const swapItemIds = swapItems(items, low, scan);
        push(`把 ${items[low].value} 放到基准${getDirectionPlacementHint(direction)}一侧`, {
          activeIndices: [low, scan],
          sortedIndices: sortedIndices(),
          stepType: "swap",
          swapItemIds,
        });
      }

      low += 1;
    }

    settled.add(low);

    if (low !== right) {
      const swapItemIds = swapItems(items, low, right);
      push(`基准 ${pivot} 已归位`, {
        activeIndices: [low],
        sortedIndices: sortedIndices(),
        stepType: "swap",
        swapItemIds,
      });
    } else {
      push(`基准 ${pivot} 已归位`, {
        activeIndices: [low],
        sortedIndices: sortedIndices(),
        stepType: "settled",
      });
    }

    return low;
  };

  const quickSort = (left: number, right: number): void => {
    if (left > right) {
      return;
    }

    if (left === right) {
      settled.add(left);
      push(`元素 ${items[left].value} 的位置确定`, {
        activeIndices: [left],
        sortedIndices: sortedIndices(),
        stepType: "settled",
      });
      return;
    }

    const pivotIndex = partition(left, right);
    quickSort(left, pivotIndex - 1);
    quickSort(pivotIndex + 1, right);
  };

  quickSort(0, items.length - 1);
}

export function runMergeSort(
  items: SortBarItem[],
  push: SnapshotRecorder,
  direction: SortDirection
): void {
  const merge = (left: number, mid: number, right: number): void => {
    const temp: SortBarItem[] = [];
    let leftCursor = left;
    let rightCursor = mid + 1;

    while (leftCursor <= mid && rightCursor <= right) {
      push(`比较左右子序列：${items[leftCursor].value} 与 ${items[rightCursor].value}`, {
        activeIndices: [leftCursor, rightCursor],
        stepType: "compare",
      });

      if (shouldTakeLeftBeforeRight(items[leftCursor].value, items[rightCursor].value, direction)) {
        temp.push({ ...items[leftCursor] });
        leftCursor += 1;
      } else {
        temp.push({ ...items[rightCursor] });
        rightCursor += 1;
      }
    }

    while (leftCursor <= mid) {
      temp.push({ ...items[leftCursor] });
      leftCursor += 1;
    }

    while (rightCursor <= right) {
      temp.push({ ...items[rightCursor] });
      rightCursor += 1;
    }

    for (let offset = 0; offset < temp.length; offset += 1) {
      items[left + offset] = { ...temp[offset] };
    }

    push(`区间 ${left + 1} 到 ${right + 1} 已完成归并写回`, {
      activeIndices: segmentIndices(left, right),
      stepType: "write",
    });
  };

  const mergeSort = (left: number, right: number): void => {
    if (left >= right) {
      return;
    }

    const mid = Math.floor((left + right) / 2);
    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    merge(left, mid, right);
  };

  mergeSort(0, items.length - 1);
}
