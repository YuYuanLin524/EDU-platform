import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { SORTING_ALGORITHMS, type SortingAlgorithm } from "@/lib/sorting-visualizer";
import { cn } from "@/lib/utils";

interface AlgorithmSelectorProps {
  selectedAlgorithm: SortingAlgorithm;
  disabled: boolean;
  onSelect: (algorithm: SortingAlgorithm) => void;
}

export function AlgorithmSelector({ selectedAlgorithm, disabled, onSelect }: AlgorithmSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {SORTING_ALGORITHMS.map((algorithm) => {
        const isActive = selectedAlgorithm === algorithm.id;

        return (
          <button
            key={algorithm.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(algorithm.id)}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40 hover:bg-accent"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{algorithm.name}</p>
              <Badge variant="secondary" className="shrink-0">
                {algorithm.complexity}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{algorithm.description}</p>
          </button>
        );
      })}
    </div>
  );
}
