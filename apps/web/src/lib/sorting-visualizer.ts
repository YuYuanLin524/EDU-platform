import {
  runBubbleSort,
  runInsertionSort,
  runMergeSort,
  runQuickSort,
  runSelectionSort,
} from "@/lib/sorting-visualizer-runners";

export type SortingAlgorithm = "bubble" | "selection" | "insertion" | "quick" | "merge";

export type SortDirection = "asc" | "desc";

export type SortStepType =
  | "init"
  | "compare"
  | "swap"
  | "write"
  | "pivot"
  | "settled"
  | "selection_pick"
  | "selection_place"
  | "insertion_lift"
  | "insertion_shift"
  | "insertion_place"
  | "done";

export interface SortingAlgorithmOption {
  id: SortingAlgorithm;
  name: string;
  complexity: string;
  description: string;
}

function formatTargetOrder(direction: SortDirection): string {
  return direction === "desc" ? "从大到小" : "从小到大";
}

export interface SortBarItem {
  id: number;
  value: number;
}

export interface SortSnapshot {
  items: SortBarItem[];
  activeIndices: number[];
  sortedIndices: number[];
  message: string;
  stepType: SortStepType;
  swapItemIds?: [number, number];
  focusItemId?: number;
  fromIndex?: number;
  toIndex?: number;
  affectedRange?: [number, number];
}

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

export const SORTING_ALGORITHMS: SortingAlgorithmOption[] = [
  {
    id: "bubble",
    name: "冒泡排序",
    complexity: "平均 O(n²)",
    description: "相邻元素两两比较，把较大的数字逐步“冒泡”到末尾。",
  },
  {
    id: "selection",
    name: "选择排序",
    complexity: "平均 O(n²)",
    description: "每一轮从剩余元素中挑出最小值，放到已排序区末尾。",
  },
  {
    id: "insertion",
    name: "插入排序",
    complexity: "平均 O(n²)",
    description: "像整理扑克牌一样，把新元素插入到前面有序区的合适位置。",
  },
  {
    id: "quick",
    name: "快速排序",
    complexity: "平均 O(n log n)",
    description: "选择基准值进行分区，递归处理左右子区间。",
  },
  {
    id: "merge",
    name: "归并排序",
    complexity: "稳定 O(n log n)",
    description: "先拆分再合并，将两个有序子序列合成更大的有序序列。",
  },
];

const INPUT_DELIMITER = /[\s,，、;；]+/;

export const RECOMMENDED_MIN_INPUT_COUNT = 3;
export const MAX_INPUT_COUNT = 10;

function cloneItems(items: SortBarItem[]): SortBarItem[] {
  return items.map((item) => ({ ...item }));
}

function makeSnapshot(items: SortBarItem[], message: string, options: SnapshotOptions = {}): SortSnapshot {
  return {
    items: cloneItems(items),
    activeIndices: [...(options.activeIndices ?? [])],
    sortedIndices: [...(options.sortedIndices ?? [])].sort((left, right) => left - right),
    message,
    stepType: options.stepType ?? "compare",
    swapItemIds: options.swapItemIds,
    focusItemId: options.focusItemId,
    fromIndex: options.fromIndex,
    toIndex: options.toIndex,
    affectedRange: options.affectedRange,
  };
}

function rangeIndices(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

export function parseNumberInput(rawInput: string): number[] {
  const tokens = rawInput
    .split(INPUT_DELIMITER)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error("请先输入一组数字，例如：8, 3, 5, 1");
  }

  const numbers = tokens.map((token) => Number(token));

  if (numbers.some((num) => !Number.isFinite(num))) {
    throw new Error("包含无效字符，请仅输入数字并用逗号或空格分隔");
  }

  return numbers;
}

export function validateMaxInputCount(numbers: number[]): void {
  if (numbers.length > MAX_INPUT_COUNT) {
    throw new Error(`最多支持输入 ${MAX_INPUT_COUNT} 个数字`);
  }
}

export function getPreviewSnapshot(values: number[], direction: SortDirection = "asc"): SortSnapshot {
  const items = values.map((value, index) => ({ id: index, value }));
  return makeSnapshot(items, `准备就绪，点击“一键运行排序”开始${formatTargetOrder(direction)}演示`, {
    stepType: "init",
  });
}

export function generateSortSnapshots(
  inputValues: number[],
  algorithm: SortingAlgorithm,
  direction: SortDirection = "asc"
): SortSnapshot[] {
  const items: SortBarItem[] = inputValues.map((value, index) => ({ id: index, value }));
  const snapshots: SortSnapshot[] = [
    makeSnapshot(items, `开始排序，目标是${formatTargetOrder(direction)}`, {
      stepType: "init",
    }),
  ];

  const pushSnapshot: SnapshotRecorder = (message, options = {}) => {
    snapshots.push(makeSnapshot(items, message, options));
  };

  switch (algorithm) {
    case "bubble":
      runBubbleSort(items, pushSnapshot, direction);
      break;
    case "selection":
      runSelectionSort(items, pushSnapshot, direction);
      break;
    case "insertion":
      runInsertionSort(items, pushSnapshot, direction);
      break;
    case "quick":
      runQuickSort(items, pushSnapshot, direction);
      break;
    case "merge":
      runMergeSort(items, pushSnapshot, direction);
      break;
    default:
      break;
  }

  snapshots.push(
    makeSnapshot(items, `排序完成！全部元素已按${formatTargetOrder(direction)}排列`, {
      sortedIndices: rangeIndices(items.length),
      stepType: "done",
    })
  );

  return snapshots;
}
