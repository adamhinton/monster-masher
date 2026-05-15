// tests for frontend/src/lib/date/formatDate.ts

import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/date/formatDate";

describe("formatDate", () => {
	describe("valid ISO date strings", () => {
		it("formats a full ISO datetime string", () => {
			expect(formatDate("2026-05-13T00:00:00.000Z")).toBe("May 13, 2026");
		});

		it("formats a date-only string", () => {
			expect(formatDate("2026-01-01")).toBe("January 1, 2026");
		});

		it("formats a date in December", () => {
			expect(formatDate("2025-12-25")).toBe("December 25, 2025");
		});

		it("formats a single-digit day correctly", () => {
			expect(formatDate("2026-03-05")).toBe("March 5, 2026");
		});

		it("formats a leap-day date", () => {
			expect(formatDate("2024-02-29")).toBe("February 29, 2024");
		});
	});

	describe("missing input", () => {
		it("returns 'Unknown date' for null", () => {
			expect(formatDate(null)).toBe("Unknown date");
		});

		it("returns 'Unknown date' for undefined", () => {
			expect(formatDate(undefined)).toBe("Unknown date");
		});
	});

	describe("invalid input", () => {
		it("returns 'Invalid date' for an empty string", () => {
			expect(formatDate("")).toBe("Invalid date");
		});

		it("returns 'Invalid date' for a non-date string", () => {
			expect(formatDate("not-a-date")).toBe("Invalid date");
		});

		it("returns 'Invalid date' for a partial date string", () => {
			expect(formatDate("2026-13-01")).toBe("Invalid date");
		});

		it("returns 'Invalid date' for a random number string", () => {
			expect(formatDate("99999999999999999")).toBe("Invalid date");
		});
	});
});
