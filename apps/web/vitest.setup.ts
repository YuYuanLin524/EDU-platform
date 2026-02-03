import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// jsdom doesn't implement canvas; a few pages mount a canvas background.
// Stub it so React effects don't throw during tests.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => null),
});

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();

  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(""),
  };
});
