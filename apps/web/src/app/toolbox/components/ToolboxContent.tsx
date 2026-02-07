import * as React from "react";
import { Boxes, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SPEED_OPTIONS, type PlaybackSpeed } from "@/app/toolbox/constants";
import { AlgorithmSelector } from "@/app/toolbox/components/AlgorithmSelector";
import { AlgorithmInfoCard } from "@/app/toolbox/components/AlgorithmInfoCard";
import { InputGuidance } from "@/app/toolbox/components/InputGuidance";
import { PlaybackActions } from "@/app/toolbox/components/PlaybackActions";
import { PlaybackSpeedControl } from "@/app/toolbox/components/PlaybackSpeedControl";
import { SortingBars } from "@/app/toolbox/components/SortingBars";
import { ToolboxHeader } from "@/app/toolbox/components/ToolboxHeader";
import type { SortDirection, SortSnapshot, SortingAlgorithm } from "@/lib/sorting-visualizer";

type SortMode = "auto" | "manual";

interface ToolboxContentProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  selectedAlgorithm: SortingAlgorithm;
  onSelectAlgorithm: (algorithm: SortingAlgorithm) => void;
  selectedSpeed: PlaybackSpeed;
  onSelectSpeed: (speed: PlaybackSpeed) => void;
  currentSnapshot: SortSnapshot;
  previousSnapshot: SortSnapshot | null;
  currentStep: number;
  isRunning: boolean;
  mode: SortMode;
  sortDirection: SortDirection;
  manualErrorIndex: number | null;
  manualRoundHint: string;
  canVerifyRound: boolean;
  isVerifyDisabled: boolean;
  isManualSortable: boolean;
  maxInputCount: number;
  selectedAlgorithmName: string;
  selectedAlgorithmComplexity: string;
  selectedAlgorithmDescription: string;
  onRun: () => void;
  onReset: () => void;
  onToggleMode: () => void;
  onVerifyRound: () => void;
  onDirectionChange: (direction: SortDirection) => void;
  onManualReorder: (fromIndex: number, toIndex: number) => void;
}

export function ToolboxContent({
  inputValue,
  onInputChange,
  selectedAlgorithm,
  onSelectAlgorithm,
  selectedSpeed,
  onSelectSpeed,
  currentSnapshot,
  previousSnapshot,
  currentStep,
  isRunning,
  mode,
  sortDirection,
  manualErrorIndex,
  manualRoundHint,
  canVerifyRound,
  isVerifyDisabled,
  isManualSortable,
  maxInputCount,
  selectedAlgorithmName,
  selectedAlgorithmComplexity,
  selectedAlgorithmDescription,
  onRun,
  onReset,
  onToggleMode,
  onVerifyRound,
  onDirectionChange,
  onManualReorder,
}: ToolboxContentProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <ToolboxHeader />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Boxes className="size-5" />
              选择排序算法
            </CardTitle>
            <CardDescription>
              当前算法：{selectedAlgorithmName}（{selectedAlgorithmComplexity}）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlgorithmSelector
              selectedAlgorithm={selectedAlgorithm}
              disabled={isRunning}
              onSelect={onSelectAlgorithm}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>输入数字序列</CardTitle>
              <CardDescription>
                <InputGuidance maxInputCount={maxInputCount} />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputValue}
                rows={4}
                disabled={isRunning}
                placeholder="例如：8, 3, 6, 1, 5"
                onChange={(event) => onInputChange(event.target.value)}
              />

              <PlaybackActions
                isRunning={isRunning}
                mode={mode}
                sortDirection={sortDirection}
                onRun={onRun}
                onReset={onReset}
                onToggleMode={onToggleMode}
                onDirectionChange={onDirectionChange}
              />

              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-foreground">
                  <Gauge className="size-4" />
                  当前速度：{SPEED_OPTIONS[selectedSpeed].label}速
                </div>
                <PlaybackSpeedControl
                  selectedSpeed={selectedSpeed}
                  disabled={isRunning || mode === "manual"}
                  onSelect={onSelectSpeed}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>排序过程演示</CardTitle>
              <AlgorithmInfoCard
                name={selectedAlgorithmName}
                complexity={selectedAlgorithmComplexity}
                description={selectedAlgorithmDescription}
              />
              <CardDescription>
                深色柱体表示已归位元素，浅色柱体表示未归位元素，亮色柱体表示当前操作元素。
                {mode === "manual" ? " 手动模式下请拖拽柱体后点击“校验本轮”。" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SortingBars
                snapshot={currentSnapshot}
                previousSnapshot={previousSnapshot}
                mode={mode}
                manualErrorIndex={manualErrorIndex}
                manualRoundHint={manualRoundHint}
                isManualSortable={isManualSortable}
                currentStep={currentStep}
                canVerifyRound={canVerifyRound}
                isVerifyDisabled={isVerifyDisabled}
                onVerifyRound={onVerifyRound}
                onManualReorder={onManualReorder}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
