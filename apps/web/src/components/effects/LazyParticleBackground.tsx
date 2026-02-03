"use client";

import { ParticleBackground } from "./ParticleBackground";

/**
 * Particle background wrapper.
 * Kept as a separate component so callers don't change imports.
 */
export function LazyParticleBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <ParticleBackground />
    </div>
  );
}
