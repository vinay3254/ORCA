import type { Transition } from "motion/react";

export { useReducedMotion } from "motion/react";

export const springs = {
  default: { type: "spring", bounce: 0, duration: 0.35 },
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 },
  sheet: { type: "spring", bounce: 0.15, duration: 0.3 },
} satisfies Record<string, Transition>;
