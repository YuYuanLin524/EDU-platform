import { ArrowDownWideNarrow, ArrowUpNarrowWide, Hand, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortDirection } from "@/lib/sorting-visualizer";

type SortMode = "auto" | "manual";

interface PlaybackActionsProps {
  isRunning: boolean;
  mode: SortMode;
  sortDirection: SortDirection;
  onRun: () => void;
  onReset: () => void;
  onToggleMode: () => void;
  onDirectionChange: (direction: SortDirection) => void;
}

export function PlaybackActions({
  isRunning,
  mode,
  sortDirection,
  onRun,
  onReset,
  onToggleMode,
  onDirectionChange,
}: PlaybackActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={onRun} disabled={isRunning}>
        <Play className="size-4" />
        一键运行排序
      </Button>
      <Button variant={mode === "manual" ? "default" : "outline"} onClick={onToggleMode} disabled={isRunning}>
        <Hand className="size-4" />
        {mode === "manual" ? "退出手动排序" : "手动排序"}
      </Button>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
        <Button
          type="button"
          variant={sortDirection === "asc" ? "default" : "ghost"}
          className="rounded-none"
          disabled={isRunning}
          onClick={() => onDirectionChange("asc")}
        >
          <ArrowUpNarrowWide className="size-4" />升序
        </Button>
        <Button
          type="button"
          variant={sortDirection === "desc" ? "default" : "ghost"}
          className="rounded-none"
          disabled={isRunning}
          onClick={() => onDirectionChange("desc")}
        >
          <ArrowDownWideNarrow className="size-4" />降序
        </Button>
      </div>
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw className="size-4" />
        重置预览
      </Button>
    </div>
  );
}
