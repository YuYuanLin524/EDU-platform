import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthForm } from "../auth-form";

import React from "react";

describe("AuthForm", () => {
  it("switches label/placeholder between student and teacher", () => {
    render(<AuthForm initialEntry="student" />);

    expect(screen.getByText("学号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入学号")).toBeInTheDocument();
  });
});
