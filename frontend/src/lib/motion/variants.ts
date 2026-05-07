import type { Variants } from "framer-motion";

/**
 * Standard motion variants for Monster Masher.
 *
 * Use with framer-motion's `motion.*` components.
 * Always check useReducedMotion() and provide a no-motion fallback.
 *
 * Example:
 *   const shouldReduce = useReducedMotion();
 *   <motion.div variants={shouldReduce ? fadeInInstant : fadeIn} initial="hidden" animate="visible">
 */

/** Fade in from invisible — good for page sections, dialogs, cards */
export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

/** No-motion version of fadeIn for reduced-motion users */
export const fadeInInstant: Variants = {
	hidden: { opacity: 1 },
	visible: { opacity: 1 },
};

/** Slide up + fade — good for hero section entrance, card reveals */
export const slideUpFade: Variants = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: "easeOut" },
	},
};

/** No-motion version of slideUpFade */
export const slideUpFadeInstant: Variants = {
	hidden: { opacity: 1, y: 0 },
	visible: { opacity: 1, y: 0 },
};

/** Stagger container — use as the parent when staggering children */
export const staggerContainer: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.08 } },
};
