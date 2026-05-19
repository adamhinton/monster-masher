// _______________
// Timer-driven progress indicator for image generation.
//
// This is a dummy progress bar based on the average 85-second image generation duration.
// The image generation pipeline passes through multiple external providers
// (content moderation → image generation → Supabase Storage upload). None of
// those stages stream real-time progress back to the browser. Rather than
// leaving the user staring at a spinner with no sense of elapsed time, this
// component shows a progress bar that ticks linearly from 0 → ~97% over the
// expected pipeline duration.
//
// It deliberately NEVER reaches 100% while mounted:
// - 100% would falsely signal that generation is complete before the server responds.
// - When the server responds, the parent unmounts this component and shows the
//   result UI, so reaching 100% here is never needed.
//
// USAGE:
//   Mount when generation starts → unmount on success or failure.
//   Each mount resets to 0%, so retriggering always starts fresh.
// _______________

"use client";

import { useEffect, useState } from "react";

import { Progress } from "@/components/ui/progress";

/** How often the bar ticks forward. 100ms gives a smooth visual fill. */
const TICK_INTERVAL_MS = 100;

/**
 * The bar stops here while the operation is in flight.
 * Prevents the UI from implying completion before the server responds.
 */
const MAX_PROGRESS_PERCENT = 97;

export interface ProgressBarProps {
	/**
	 * Estimated total operation duration in milliseconds.
	 * The bar reaches ~97% at this point and then holds.
	 * Default: 85_000 (85 seconds — chosen to cover typical generation time).
	 */
	durationMs?: number;
	/** Accessible label shown to screen-reader users. */
	"aria-label"?: string;
}

/**
 * Progress indicator for the image generation pipeline.
 *
 * Advances from 0 → ~97% linearly over `durationMs`. The bar never shows
 * 100% while mounted — the parent should unmount it once the real operation
 * completes or fails.
 */
export function ProgressBar({
	durationMs = 85_000,
	"aria-label": ariaLabel = "Image generation progress",
}: ProgressBarProps) {
	const [tickCount, setTickCount] = useState(() => 0);

	useEffect(() => {
		const id = setInterval(() => {
			setTickCount((prev) => prev + 1);
		}, TICK_INTERVAL_MS);

		return () => clearInterval(id);
	}, []);

	const progress = Math.min(
		MAX_PROGRESS_PERCENT,
		((tickCount * TICK_INTERVAL_MS) / durationMs) * 100,
	);

	return (
		// data-progress is a test handle — avoids coupling tests to internals of
		// the underlying @base-ui/react Progress primitive.
		<div data-testid="progress-bar" data-progress={progress}>
			<Progress value={progress} aria-label={ariaLabel} />
		</div>
	);
}
