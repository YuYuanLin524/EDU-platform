import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SortBarItem, SortSnapshot } from "@/lib/sorting-visualizer";
import { getBarHeight, getSwapDelta } from "@/app/toolbox/utils";

type SortMode = "auto" | "manual";

interface MotionProps {
  x: number | number[];
  y: number | number[];
  scale: number | number[];
}

function getSelectionDeltas(snapshot: SortSnapshot): { selectionXDelta: number; insertionXDelta: number } {
  const delta =
    snapshot.fromIndex !== undefined && snapshot.toIndex !== undefined
      ? snapshot.fromIndex - snapshot.toIndex
      : 0;

  return {
    selectionXDelta: delta,
    insertionXDelta: delta,
  };
}

function getMotionState(
  item: SortBarItem,
  index: number,
  snapshot: SortSnapshot,
  swapDelta: number
): MotionProps {
  const isSwapHighlight = snapshot.stepType === "swap" && snapshot.swapItemIds?.includes(item.id);
  const isSelectionPickFocus = snapshot.stepType === "selection_pick" && snapshot.focusItemId === item.id;
  const isSelectionPlaceFocus = snapshot.stepType === "selection_place" && snapshot.focusItemId === item.id;
  const isInsertionLiftFocus = snapshot.stepType === "insertion_lift" && snapshot.focusItemId === item.id;
  const isInsertionPlaceFocus = snapshot.stepType === "insertion_place" && snapshot.focusItemId === item.id;
  const isInsertionShiftStep = snapshot.stepType === "insertion_shift" && snapshot.affectedRange;

  const { selectionXDelta, insertionXDelta } = getSelectionDeltas(snapshot);

  if (isSwapHighlight) {
    return {
      x: [0, swapDelta * 10, 0],
      y: [0, -18, 0],
      scale: [1, 1.02, 1],
    };
  }

  if (isSelectionPickFocus) {
    return {
      x: 0,
      y: [0, -24, -16],
      scale: [1, 1.04, 1.02],
    };
  }

  if (isSelectionPlaceFocus) {
    return {
      x: [0, selectionXDelta * 10, 0],
      y: [-14, -24, 0],
      scale: [1.02, 1.05, 1],
    };
  }

  if (isInsertionLiftFocus) {
    return {
      x: 0,
      y: [0, -28, -20],
      scale: [1, 1.05, 1.03],
    };
  }

  if (isInsertionShiftStep) {
    const [rangeStart, rangeEnd] = snapshot.affectedRange;
    if (index >= rangeStart && index <= rangeEnd) {
      return {
        x: [0, 12, 0],
        y: 0,
        scale: [1, 1.01, 1],
      };
    }
  }

  if (isInsertionPlaceFocus) {
    return {
      x: [0, insertionXDelta * 10, 0],
      y: [-16, -24, 0],
      scale: [1.03, 1.06, 1],
    };
  }

  return { x: 0, y: 0, scale: 1 };
}

interface SortBarProps {
  item: SortBarItem;
  index: number;
  snapshot: SortSnapshot;
  previousSnapshot: SortSnapshot | null;
  minValue: number;
  maxValue: number;
  isManualError: boolean;
}

function SortBar({
  item,
  index,
  snapshot,
  previousSnapshot,
  minValue,
  maxValue,
  isManualError,
}: SortBarProps) {
  const isActive = snapshot.activeIndices.includes(index);
  const isSorted = snapshot.sortedIndices.includes(index);
  const swapDelta = getSwapDelta(item.id, snapshot, previousSnapshot);
  const motionState = getMotionState(item, index, snapshot, swapDelta);
  const hasTrajectory = [motionState.x, motionState.y, motionState.scale].some(Array.isArray);

  return (
    <motion.div
      layout
      key={item.id}
      className="flex h-full min-h-[220px] flex-col justify-end gap-2"
      transition={{
        layout: {
          duration: hasTrajectory ? 0.62 : 0.28,
          ease: hasTrajectory ? [0.16, 1, 0.3, 1] : "easeOut",
        },
      }}
      animate={motionState}
    >
      <div
        className={cn(
          "w-full rounded-md transition-all duration-300",
          isSorted ? "bg-primary" : "bg-muted-foreground/45",
          isActive && "origin-bottom bg-destructive shadow-md shadow-destructive/30 animate-sort-active-breathe",
          isManualError && "bg-amber-500 shadow-md shadow-amber-500/30"
        )}
        style={{ height: `${getBarHeight(item.value, minValue, maxValue)}%` }}
      />
      <span
        className={cn(
          "text-center text-xs font-medium",
          isSorted ? "text-primary" : "text-foreground/80",
          isActive && "text-destructive",
          isManualError && "text-amber-600"
        )}
      >
        {item.value}
      </span>
    </motion.div>
  );
}

interface SortingBarsProps {
  snapshot: SortSnapshot;
  previousSnapshot: SortSnapshot | null;
  mode: SortMode;
  manualErrorIndex: number | null;
  isManualSortable: boolean;
  currentStep: number;
  canVerifyRound: boolean;
  isVerifyDisabled: boolean;
  manualRoundHint: string;
  onVerifyRound: () => void;
  onManualReorder: (fromIndex: number, toIndex: number) => void;
}

export function SortingBars({
  snapshot,
  previousSnapshot,
  mode,
  manualErrorIndex,
  isManualSortable,
  currentStep,
  canVerifyRound,
  isVerifyDisabled,
  manualRoundHint,
  onVerifyRound,
  onManualReorder,
}: SortingBarsProps) {
  const values = snapshot.items.map((item) => item.value);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);

  const handleDrop = React.useCallback(
    (toIndex: number) => {
      if (dragFromIndex === null || dragFromIndex === toIndex) {
        setDragFromIndex(null);
        return;
      }

      onManualReorder(dragFromIndex, toIndex);
      setDragFromIndex(null);
    },
    [dragFromIndex, onManualReorder]
  );

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      {mode === "manual" ? (
        <div className="mb-2 flex items-center justify-end gap-2">
          {canVerifyRound ? (
            <Button size="sm" onClick={onVerifyRound} disabled={isVerifyDisabled}>
              <Check className="size-4" />
              校验本轮
            </Button>
          ) : null}
          <Badge variant="outline">{canVerifyRound ? `轮次：${currentStep + 1}` : "排序完成"}</Badge>
        </div>
      ) : null}
      <div className="mb-2 text-sm text-muted-foreground">
        {mode === "manual" ? manualRoundHint : snapshot.message}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-muted-foreground/45" />未归位
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-destructive" />当前操作
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" />已归位
        </div>
        {mode === "manual" ? (
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-500" />错误位
          </div>
        ) : null}
      </div>
      <div
        data-testid="sorting-bars-grid"
        onDragOver={(event) => {
          if (mode !== "manual" || !isManualSortable) {
            return;
          }

          event.preventDefault();
        }}
        className="grid min-h-72 items-end gap-2 rounded-lg border border-dashed border-border bg-background/70 p-3"
        style={{ gridTemplateColumns: `repeat(${Math.max(snapshot.items.length, 1)}, minmax(0, 1fr))` }}
      >
        {snapshot.items.map((item, index) => (
          <motion.div
            key={item.id}
            className={cn(
              "h-full",
              mode === "manual" && isManualSortable && "cursor-grab active:cursor-grabbing"
            )}
            draggable={mode === "manual" && isManualSortable}
            onDragStart={() => {
              if (mode !== "manual" || !isManualSortable) {
                return;
              }
              setDragFromIndex(index);
            }}
            onDragOver={(event) => {
              if (mode !== "manual" || !isManualSortable) {
                return;
              }

              event.preventDefault();
            }}
            onDrop={(event) => {
              if (mode !== "manual" || !isManualSortable) {
                return;
              }

              event.preventDefault();
              handleDrop(index);
            }}
            onDragEnd={() => setDragFromIndex(null)}
          >
            <SortBar
              item={item}
              index={index}
              snapshot={snapshot}
              previousSnapshot={previousSnapshot}
              minValue={minValue}
              maxValue={maxValue}
              isManualError={mode === "manual" && manualErrorIndex === index}
            />
          </motion.div>
        ))}
      </div>
      {snapshot.items.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          请输入有效数字后开始排序。
        </div>
      ) : null}
    </div>
  );
}
