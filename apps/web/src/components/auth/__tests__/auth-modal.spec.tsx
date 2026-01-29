import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthModal } from "../auth-modal";

describe("AuthModal", () => {
  it("renders student label when entry=student", () => {
    render(<AuthModal open={true} onOpenChange={() => {}} entry="student" />);
    expect(screen.getByText("学号")).toBeInTheDocument();
  });

  it("does not show entry switcher inside modal", () => {
    render(<AuthModal open={true} onOpenChange={() => {}} entry="student" />);
    expect(screen.queryAllByText("教师入口")).toHaveLength(0);
  });
});
