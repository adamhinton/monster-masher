"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Returns true when the user has requested reduced motion.
 *
 * Use this hook in any animated component:
 *
 *   const shouldReduceMotion = useReducedMotion();
 *   const variants = shouldReduceMotion ? reducedVariants : fullVariants;
 *
 * Tailwind CSS: use `motion-safe:` and `motion-reduce:` variants for
 * CSS-only transitions. Reserve this hook for framer-motion animations.
 */
export function useReducedMotion(): boolean {
	return useFramerReducedMotion() ?? false;
}
