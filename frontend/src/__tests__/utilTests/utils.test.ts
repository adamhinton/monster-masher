import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
	it("returns a single class unchanged", () => {
		expect(cn("bg-red-500")).toBe("bg-red-500");
	});

	it("joins multiple classes", () => {
		expect(cn("px-4", "py-2")).toBe("px-4 py-2");
	});

	it("ignores falsy values", () => {
		expect(cn("px-4", false, undefined, null, "py-2")).toBe("px-4 py-2");
	});

	it("merges conflicting Tailwind classes — last wins", () => {
		// tailwind-merge resolves this; bg-blue-500 replaces bg-red-500
		expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
	});

	it("handles conditional object syntax from clsx", () => {
		expect(cn({ "font-bold": true, "font-normal": false })).toBe("font-bold");
	});
});
