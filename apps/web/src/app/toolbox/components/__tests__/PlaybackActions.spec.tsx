import React from "react";
import { describe, expect, it, vi } from "vitest";
import { afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlaybackActions } from "@/app/toolbox/components/PlaybackActions";

afterEach(() => {
  cleanup();
});

describe("PlaybackActions", () => {
  it("shows manual toggle button in manual mode", () => {
    render(
      <PlaybackActions
        isRunning={false}
        mode="manual"
        sortDirection="asc"
        onRun={vi.fn()}
        onReset={vi.fn()}
        onToggleMode={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "退出手动排序" })).toBeInTheDocument();
  });

  it("hides manual-mode verify controls in actions", () => {
    render(
      <PlaybackActions
        isRunning={false}
        mode="auto"
        sortDirection="asc"
        onRun={vi.fn()}
        onReset={vi.fn()}
        onToggleMode={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "校验本轮" })).not.toBeInTheDocument();
    expect(screen.queryByText(/轮次：/)).not.toBeInTheDocument();
  });

  it("switches direction via buttons", () => {
    const handleDirectionChange = vi.fn();
    render(
      <PlaybackActions
        isRunning={false}
        mode="auto"
        sortDirection="asc"
        onRun={vi.fn()}
        onReset={vi.fn()}
        onToggleMode={vi.fn()}
        onDirectionChange={handleDirectionChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /降序/ }));
    expect(handleDirectionChange).toHaveBeenCalledWith("desc");
  });
});
