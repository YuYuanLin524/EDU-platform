import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

import LoginPage from "../page";

describe("/login", () => {
  it("redirects to home with student login query when role=student", () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("role=student")
    );

    render(<LoginPage />);

    expect(screen.getByText("正在返回首页...")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/?login=student");
  });

  it("redirects to home with teacher login query when role=teacher", () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("role=teacher")
    );

    render(<LoginPage />);

    expect(replace).toHaveBeenCalledWith("/?login=teacher");
  });

  it("redirects to home without login query when role is missing", () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams(""));

    render(<LoginPage />);

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("redirects to home without login query when role is invalid", () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams("role=admin"));

    render(<LoginPage />);

    expect(replace).toHaveBeenCalledWith("/");
  });
});
