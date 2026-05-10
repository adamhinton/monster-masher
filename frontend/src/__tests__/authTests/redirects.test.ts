// ________
// Tests for src/lib/auth/redirects.ts
// ________
import { describe, it, expect } from "vitest";
import {
	getSafeNextPath,
	DEFAULT_AUTH_REDIRECT_PATH,
} from "@/lib/auth/redirects";

describe("DEFAULT_AUTH_REDIRECT_PATH", () => {
	it("equals /gallery", () => {
		expect(DEFAULT_AUTH_REDIRECT_PATH).toBe("/gallery");
	});
});

describe("getSafeNextPath", () => {
	it("returns default for null", () => {
		expect(getSafeNextPath(null)).toBe(DEFAULT_AUTH_REDIRECT_PATH);
	});

	it("returns default for empty string", () => {
		expect(getSafeNextPath("")).toBe(DEFAULT_AUTH_REDIRECT_PATH);
	});

	it("returns default for double-slash open-redirect attempt", () => {
		expect(getSafeNextPath("//evil.com")).toBe(DEFAULT_AUTH_REDIRECT_PATH);
	});

	it("returns default for external https URL", () => {
		expect(getSafeNextPath("https://evil.com")).toBe(
			DEFAULT_AUTH_REDIRECT_PATH,
		);
	});

	it("returns default for external http URL", () => {
		expect(getSafeNextPath("http://evil.com/steal")).toBe(
			DEFAULT_AUTH_REDIRECT_PATH,
		);
	});

	it("passes /gallery through", () => {
		expect(getSafeNextPath("/gallery")).toBe("/gallery");
	});

	it("passes /create through", () => {
		expect(getSafeNextPath("/create")).toBe("/create");
	});

	it("preserves query string on safe paths", () => {
		expect(getSafeNextPath("/create?foo=bar")).toBe("/create?foo=bar");
	});
});
