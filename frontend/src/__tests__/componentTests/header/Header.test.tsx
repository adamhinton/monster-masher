// ________
// Tests for src/components/layout/Header/Header.tsx
// Child components (HeaderAuthButton, MobileNav, ThemeToggle) are mocked — they have their own suites.
// Covers: logo → /, main nav aria-label, Create and Gallery links, child placeholders present.
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/Header/Header";

// Mock the child components that have their own test suites
vi.mock("@/components/layout/Header/HeaderAuthButton", () => ({
	default: () => <div data-testid="header-auth-button" />,
}));
vi.mock("@/components/layout/MobileNav", () => ({
	MobileNav: () => <div data-testid="mobile-nav" />,
}));
vi.mock("@/components/darkTheming/ThemeToggle", () => ({
	ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

describe("Header", () => {
	beforeEach(() => {
		render(<Header />);
	});

	it("renders without crashing", () => {
		// Will fail if beforeEach render fails
	});

	it("has a logo link to /", () => {
		const logo = screen.getByRole("link", { name: /monster masher/i });
		expect(logo).toHaveAttribute("href", "/");
	});

	it("has a desktop nav with the correct aria-label", () => {
		expect(
			screen.getByRole("navigation", { name: /main navigation/i }),
		).toBeInTheDocument();
	});

	it("has a Create link pointing to /create", () => {
		const links = screen.getAllByRole("link", { name: /^create$/i });
		expect(links.some((l) => l.getAttribute("href") === "/create")).toBe(true);
	});

	it("has a Gallery link pointing to /gallery", () => {
		const links = screen.getAllByRole("link", { name: /^gallery$/i });
		expect(links.some((l) => l.getAttribute("href") === "/gallery")).toBe(true);
	});

	it("renders the HeaderAuthButton placeholder", () => {
		expect(screen.getByTestId("header-auth-button")).toBeInTheDocument();
	});

	it("renders the MobileNav placeholder", () => {
		expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
	});
});
