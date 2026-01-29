import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LoginPage from "../page";

describe("/login", () => {
  it("renders shared auth form", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("学生登录").length).toBeGreaterThan(0);
  });
});
