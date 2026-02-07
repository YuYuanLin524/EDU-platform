import * as React from "react";
import { toast } from "sonner";
import {
  generateSortSnapshots,
  getPreviewSnapshot,
  MAX_INPUT_COUNT,
  parseNumberInput,
  SORTING_ALGORITHMS,
  validateMaxInputCount,
  type SortDirection,
  type SortingAlgorithm,
  type SortBarItem,
  type SortSnapshot,
} from "@/lib/sorting-visualizer";
import { SPEED_OPTIONS, DEFAULT_NUMBERS, type PlaybackSpeed } from "@/app/toolbox/constants";
import {
  applyManualReorder,
  getSortMessage,
  getVerifiedRoundSortedIndices,
} from "@/app/toolbox/utils";
import {
  buildManualRounds,
  isManualSupportedAlgorithm,
  verifyManualRound,
  type ManualRound,
} from "@/lib/manual-sort-validator";

type SortMode = "auto" | "manual";

interface SortingPlaybackState {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  selectedAlgorithm: SortingAlgorithm;
  setSelectedAlgorithm: React.Dispatch<React.SetStateAction<SortingAlgorithm>>;
  selectedSpeed: PlaybackSpeed;
  setSelectedSpeed: React.Dispatch<React.SetStateAction<PlaybackSpeed>>;
  sortDirection: SortDirection;
  mode: SortMode;
  currentSnapshot: SortSnapshot;
  previousSnapshot: SortSnapshot | null;
  currentStep: number;
  isRunning: boolean;
  manualErrorIndex: number | null;
  manualRoundHint: string;
  canVerifyRound: boolean;
  isVerifyDisabled: boolean;
  isManualSortable: boolean;
  selectedAlgorithmInfo:
    | {
        id: SortingAlgorithm;
        name: string;
        complexity: string;
        description: string;
      }
    | undefined;
  maxInputCount: number;
  handleRun: () => void;
  handleReset: () => void;
  handleToggleMode: () => void;
  handleVerifyRound: () => void;
  handleDirectionChange: (direction: SortDirection) => void;
  handleManualReorder: (fromIndex: number, toIndex: number) => void;
}

function toItems(values: number[]): SortBarItem[] {
  return values.map((value, index) => ({ id: index, value }));
}

function toPreviewSnapshot(items: SortBarItem[], message: string, sortedIndices: number[] = []): SortSnapshot {
  return {
    items: items.map((item) => ({ ...item })),
    activeIndices: [],
    sortedIndices,
    message,
    stepType: "init",
  };
}

export function useSortingPlayback(): SortingPlaybackState {
  const [inputValue, setInputValue] = React.useState<string>(DEFAULT_NUMBERS);
  const [selectedAlgorithm, setSelectedAlgorithm] = React.useState<SortingAlgorithm>("bubble");
  const [selectedSpeed, setSelectedSpeed] = React.useState<PlaybackSpeed>("slow");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [mode, setMode] = React.useState<SortMode>("auto");
  const [snapshots, setSnapshots] = React.useState<SortSnapshot[]>(() => {
    const initialValues = parseNumberInput(DEFAULT_NUMBERS);
    return [getPreviewSnapshot(initialValues, "asc")];
  });
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [manualItems, setManualItems] = React.useState<SortBarItem[]>(() => toItems(parseNumberInput(DEFAULT_NUMBERS)));
  const [manualRounds, setManualRounds] = React.useState<ManualRound[]>([]);
  const [manualRoundIndex, setManualRoundIndex] = React.useState<number>(0);
  const [manualErrorIndex, setManualErrorIndex] = React.useState<number | null>(null);

  const manualSupported = React.useMemo(
    () => isManualSupportedAlgorithm(selectedAlgorithm),
    [selectedAlgorithm]
  );

  const currentManualRound = React.useMemo(
    () => manualRounds[manualRoundIndex] ?? null,
    [manualRoundIndex, manualRounds]
  );

  const manualRoundHint = React.useMemo(() => {
    if (!manualSupported) {
      return "当前算法暂不支持手动逐轮校验，请切换为冒泡/选择/插入排序";
    }

    if (!currentManualRound) {
      return "排序完成";
    }

    return `第 ${currentManualRound.roundNumber} 轮：${currentManualRound.instruction}`;
  }, [currentManualRound, manualSupported]);

  const manualSnapshot = React.useMemo(() => {
    const hasFinished = manualSupported && currentManualRound === null;
    const sortedIndices = getVerifiedRoundSortedIndices(
      manualRounds,
      manualRoundIndex,
      manualItems.length,
      hasFinished
    );

    return toPreviewSnapshot(manualItems, manualRoundHint, sortedIndices);
  }, [
    currentManualRound,
    manualItems,
    manualRoundHint,
    manualRoundIndex,
    manualRounds,
    manualSupported,
  ]);

  const autoSnapshot = React.useMemo(
    () => snapshots[currentStep] ?? snapshots[snapshots.length - 1],
    [currentStep, snapshots]
  );

  const currentSnapshot = React.useMemo(
    () => (mode === "manual" ? manualSnapshot : autoSnapshot),
    [autoSnapshot, manualSnapshot, mode]
  );

  const previousSnapshot = React.useMemo(() => {
    if (mode === "manual") {
      return null;
    }

    if (currentStep <= 0) {
      return null;
    }
    return snapshots[currentStep - 1] ?? null;
  }, [currentStep, mode, snapshots]);

  const selectedAlgorithmInfo = React.useMemo(
    () => SORTING_ALGORITHMS.find((item) => item.id === selectedAlgorithm),
    [selectedAlgorithm]
  );

  const currentDisplayStep =
    mode === "manual" ? Math.min(manualRoundIndex, Math.max(manualRounds.length - 1, 0)) : currentStep;

  const isManualFinished = mode === "manual" && manualSupported && currentManualRound === null;
  const canVerifyRound = mode === "manual" && manualSupported && currentManualRound !== null;
  const isVerifyDisabled = !canVerifyRound;
  const isManualSortable = mode === "manual" && manualSupported && !isRunning && !isManualFinished;

  const rebuildManualState = React.useCallback(
    (values: number[]) => {
      const rounds = buildManualRounds(values, selectedAlgorithm, sortDirection);
      setManualItems(toItems(values));
      setManualRounds(rounds);
      setManualRoundIndex(0);
      setManualErrorIndex(null);
    },
    [selectedAlgorithm, sortDirection]
  );

  React.useEffect(() => {
    if (mode !== "manual") {
      return;
    }

    try {
      const values = parseNumberInput(inputValue);
      validateMaxInputCount(values);
      rebuildManualState(values);
    } catch {
      setManualItems([]);
      setManualRounds([]);
      setManualRoundIndex(0);
      setManualErrorIndex(null);
    }
  }, [inputValue, mode, rebuildManualState]);

  const prepareAutoPreview = React.useCallback(
    (values: number[]) => {
      setSnapshots([getPreviewSnapshot(values, sortDirection)]);
      setCurrentStep(0);
      setIsRunning(false);
    },
    [sortDirection]
  );

  const handleReset = React.useCallback(() => {
    try {
      const values = parseNumberInput(inputValue);
      validateMaxInputCount(values);

      if (mode === "manual") {
        rebuildManualState(values);
      } else {
        prepareAutoPreview(values);
      }
    } catch (error: unknown) {
      const message = getSortMessage(error);
      toast.error(message);
    }
  }, [inputValue, mode, prepareAutoPreview, rebuildManualState]);

  const handleRun = React.useCallback(() => {
    try {
      const values = parseNumberInput(inputValue);
      validateMaxInputCount(values);

      if (mode === "manual") {
        toast.error("请在手动模式中使用“校验本轮”推进学习步骤");
        return;
      }

      const preparedSnapshots = generateSortSnapshots(values, selectedAlgorithm, sortDirection);
      setSnapshots(preparedSnapshots);
      setCurrentStep(0);
      setIsRunning(true);
    } catch (error: unknown) {
      const message = getSortMessage(error);
      toast.error(message);
    }
  }, [inputValue, mode, selectedAlgorithm, sortDirection]);

  const handleDirectionChange = React.useCallback(
    (direction: SortDirection) => {
      if (isRunning || direction === sortDirection) {
        return;
      }

      try {
        const values = parseNumberInput(inputValue);
        validateMaxInputCount(values);
        setSortDirection(direction);

        if (mode === "manual") {
          const rounds = buildManualRounds(values, selectedAlgorithm, direction);
          setManualItems(toItems(values));
          setManualRounds(rounds);
          setManualRoundIndex(0);
          setManualErrorIndex(null);
          return;
        }

        setSnapshots([getPreviewSnapshot(values, direction)]);
        setCurrentStep(0);
        setIsRunning(false);
      } catch (error: unknown) {
        const message = getSortMessage(error);
        toast.error(message);
      }
    },
    [inputValue, isRunning, mode, selectedAlgorithm, sortDirection]
  );

  const handleToggleMode = React.useCallback(() => {
    if (isRunning) {
      return;
    }

    try {
      const values = parseNumberInput(inputValue);
      validateMaxInputCount(values);

      if (mode === "manual") {
        setMode("auto");
        prepareAutoPreview(values);
        return;
      }

      if (!manualSupported) {
        toast.error("当前算法暂不支持手动逐轮校验，请切换为冒泡/选择/插入排序");
        return;
      }

      setMode("manual");
      rebuildManualState(values);
      setIsRunning(false);
    } catch (error: unknown) {
      const message = getSortMessage(error);
      toast.error(message);
    }
  }, [inputValue, isRunning, manualSupported, mode, prepareAutoPreview, rebuildManualState]);

  const handleManualReorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!isManualSortable || currentManualRound === null) {
        return;
      }

      setManualItems((prevItems) =>
        applyManualReorder(prevItems, fromIndex, toIndex, selectedAlgorithm)
      );
      setManualErrorIndex(null);
    },
    [currentManualRound, isManualSortable, selectedAlgorithm]
  );

  const handleVerifyRound = React.useCallback(() => {
    if (!canVerifyRound || currentManualRound === null) {
      return;
    }

    const values = manualItems.map((item) => item.value);
    const result = verifyManualRound(values, currentManualRound);

    if (!result.passed) {
      setManualErrorIndex(result.firstErrorIndex);
      toast.error(result.message);
      return;
    }

    const isLastRound = manualRoundIndex + 1 >= manualRounds.length;
    setManualErrorIndex(null);
    toast.success(result.message);
    setManualRoundIndex((previousRoundIndex) => previousRoundIndex + 1);

    if (isLastRound) {
      toast.success("排序完成");
    }
  }, [canVerifyRound, currentManualRound, manualItems, manualRoundIndex, manualRounds.length]);

  React.useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (currentStep >= snapshots.length - 1) {
      setIsRunning(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setCurrentStep((prevStep) => prevStep + 1);
    }, SPEED_OPTIONS[selectedSpeed].durationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [currentStep, isRunning, snapshots.length, selectedSpeed]);

  return {
    inputValue,
    setInputValue,
    selectedAlgorithm,
    setSelectedAlgorithm,
    selectedSpeed,
    setSelectedSpeed,
    sortDirection,
    mode,
    currentSnapshot,
    previousSnapshot,
    currentStep: currentDisplayStep,
    isRunning,
    manualErrorIndex,
    manualRoundHint,
    canVerifyRound,
    isVerifyDisabled,
    isManualSortable,
    selectedAlgorithmInfo,
    maxInputCount: MAX_INPUT_COUNT,
    handleRun,
    handleReset,
    handleToggleMode,
    handleVerifyRound,
    handleDirectionChange,
    handleManualReorder,
  };
}
