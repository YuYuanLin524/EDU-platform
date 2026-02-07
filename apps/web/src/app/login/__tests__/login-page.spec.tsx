import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

import LoginPage from "../page";

describe("/login", () => {
  it("redirects to home with login query", () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams("role=student"));

    render(<LoginPage />);

    expect(screen.getByText("正在返回首页...")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/?login=student");
  });
});
