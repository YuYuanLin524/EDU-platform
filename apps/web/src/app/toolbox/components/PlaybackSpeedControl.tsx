import * as React from "react";
import { Button } from "@/components/ui/button";
import { SPEED_OPTIONS, type PlaybackSpeed } from "@/app/toolbox/constants";

interface PlaybackSpeedControlProps {
  selectedSpeed: PlaybackSpeed;
  disabled: boolean;
  onSelect: (speed: PlaybackSpeed) => void;
}

export function PlaybackSpeedControl({
  selectedSpeed,
  disabled,
  onSelect,
}: PlaybackSpeedControlProps) {
  const optionEntries = Object.entries(SPEED_OPTIONS) as [
    PlaybackSpeed,
    (typeof SPEED_OPTIONS)[PlaybackSpeed],
  ][];

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">播放速度</p>
      <div className="flex items-center gap-2">
        {optionEntries.map(([speedKey, option]) => (
          <Button
            key={speedKey}
            type="button"
            size="sm"
            disabled={disabled}
            variant={selectedSpeed === speedKey ? "default" : "outline"}
            onClick={() => onSelect(speedKey)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
