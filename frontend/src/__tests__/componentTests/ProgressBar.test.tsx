import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProgressBar } from "@/components/ProgressBar";

function getProgress(): number {
	return Number(
		screen.getByTestId("progress-bar").getAttribute("data-progress"),
	);
}

describe("ProgressBar", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders without crashing", () => {
		render(<ProgressBar />);
		expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
	});

	it("starts at 0%", () => {
		render(<ProgressBar />);
		expect(getProgress()).toBe(0);
	});

	it("advances progress after roughly half the duration has elapsed", () => {
		render(<ProgressBar durationMs={1000} />);

		// 500ms out of 1000ms → 97% * 0.5 ≈ 48.5%
		act(() => {
			vi.advanceTimersByTime(500);
		});

		const progress = getProgress();
		expect(progress).toBeGreaterThan(40);
		expect(progress).toBeLessThan(60);
	});

	it("reaches approximately 97% after the full duration has elapsed", () => {
		render(<ProgressBar durationMs={1000} />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		// 10 ticks × 100ms = 1000ms → exactly MAX_PROGRESS_PERCENT
		expect(getProgress()).toBeCloseTo(97, 0);
	});

	it("never exceeds 97% even long after the full duration has passed", () => {
		render(<ProgressBar durationMs={1000} />);

		act(() => {
			vi.advanceTimersByTime(10_000);
		});

		expect(getProgress()).toBeLessThanOrEqual(97);
	});

	it("respects a custom durationMs — reaches ~48% at the halfway mark", () => {
		render(<ProgressBar durationMs={2000} />);

		// 1000ms out of 2000ms → ~48.5%
		act(() => {
			vi.advanceTimersByTime(1000);
		});

		const progress = getProgress();
		expect(progress).toBeGreaterThan(40);
		expect(progress).toBeLessThan(60);
	});

	it("resets to 0 when the component is unmounted and remounted", () => {
		const { unmount } = render(<ProgressBar durationMs={1000} />);

		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(getProgress()).toBeGreaterThan(0);

		unmount();

		render(<ProgressBar durationMs={1000} />);
		expect(getProgress()).toBe(0);
	});

	it("cleans up the interval on unmount — no updates after unmount", () => {
		const { unmount } = render(<ProgressBar durationMs={1000} />);

		act(() => {
			vi.advanceTimersByTime(200);
		});
		unmount();

		// Advancing more time after unmount should not throw
		act(() => {
			vi.advanceTimersByTime(2000);
		});
	});
});
