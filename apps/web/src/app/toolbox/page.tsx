"use client";

import { ToolboxContent } from "@/app/toolbox/components/ToolboxContent";
import { useSortingPlayback } from "@/app/toolbox/hooks/useSortingPlayback";

export default function ToolboxPage() {
  const {
    inputValue,
    setInputValue,
    selectedAlgorithm,
    setSelectedAlgorithm,
    selectedSpeed,
    setSelectedSpeed,
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
    selectedAlgorithmInfo,
    maxInputCount,
    handleRun,
    handleReset,
    handleToggleMode,
    handleVerifyRound,
    handleDirectionChange,
    handleManualReorder,
  } = useSortingPlayback();

  return (
    <ToolboxContent
      inputValue={inputValue}
      onInputChange={setInputValue}
      selectedAlgorithm={selectedAlgorithm}
      onSelectAlgorithm={setSelectedAlgorithm}
      selectedSpeed={selectedSpeed}
      onSelectSpeed={setSelectedSpeed}
      currentSnapshot={currentSnapshot}
      previousSnapshot={previousSnapshot}
      currentStep={currentStep}
      isRunning={isRunning}
      mode={mode}
      sortDirection={sortDirection}
      manualErrorIndex={manualErrorIndex}
      manualRoundHint={manualRoundHint}
      canVerifyRound={canVerifyRound}
      isVerifyDisabled={isVerifyDisabled}
      isManualSortable={isManualSortable}
      maxInputCount={maxInputCount}
      selectedAlgorithmName={selectedAlgorithmInfo?.name ?? "未知算法"}
      selectedAlgorithmComplexity={selectedAlgorithmInfo?.complexity ?? "-"}
      selectedAlgorithmDescription={selectedAlgorithmInfo?.description ?? "暂无算法说明"}
      onRun={handleRun}
      onReset={handleReset}
      onToggleMode={handleToggleMode}
      onVerifyRound={handleVerifyRound}
      onDirectionChange={handleDirectionChange}
      onManualReorder={handleManualReorder}
    />
  );
}
