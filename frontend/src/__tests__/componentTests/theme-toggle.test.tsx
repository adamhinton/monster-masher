import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/darkTheming/ThemeToggle";

const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

// @base-ui/react Menu uses portals and requires layout APIs unavailable in jsdom.
// Mock the ShadCN dropdown-menu wrappers with simple always-visible equivalents
// so the test focuses on ThemeToggle's setTheme integration, not dropdown mechanics.
vi.mock("@/components/ui/dropdown-menu", () => {
	function DropdownMenu({ children }: { children: React.ReactNode }) {
		return <div>{children}</div>;
	}
	// ThemeToggle passes `render={<Button aria-label="Toggle theme" />}`.
	// Clone that element so the accessible label reaches the DOM.
	function DropdownMenuTrigger({
		children,
		render: renderProp,
	}: {
		children: React.ReactNode;
		render?: React.ReactElement;
	}) {
		if (renderProp) {
			return React.cloneElement(renderProp, {}, children);
		}
		return <button>{children}</button>;
	}
	// Always render content so items are immediately queryable.
	function DropdownMenuContent({ children }: { children: React.ReactNode }) {
		return <div>{children}</div>;
	}
	function DropdownMenuItem({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
	}) {
		return <button onClick={onClick}>{children}</button>;
	}
	return {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	};
});

describe("ThemeToggle", () => {
	beforeEach(() => {
		mockSetTheme.mockClear();
	});

	it("renders a button with an accessible label", () => {
		render(<ThemeToggle />);
		const button = screen.getByRole("button", { name: /toggle theme/i });
		expect(button).toBeInTheDocument();
	});

	it("renders Light, Dark, and System options", () => {
		render(<ThemeToggle />);
		expect(screen.getByText("Light")).toBeInTheDocument();
		expect(screen.getByText("Dark")).toBeInTheDocument();
		expect(screen.getByText("System")).toBeInTheDocument();
	});

	it("calls setTheme('dark') when Dark option is clicked", async () => {
		const user = userEvent.setup();
		render(<ThemeToggle />);
		await user.click(screen.getByText("Dark"));
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("calls setTheme('light') when Light option is clicked", async () => {
		const user = userEvent.setup();
		render(<ThemeToggle />);
		await user.click(screen.getByText("Light"));
		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});

	it("calls setTheme('system') when System option is clicked", async () => {
		const user = userEvent.setup();
		render(<ThemeToggle />);
		await user.click(screen.getByText("System"));
		expect(mockSetTheme).toHaveBeenCalledWith("system");
	});
});
