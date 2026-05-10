// ________
// Tests for src/app/create/page.tsx  (/create)
// ________
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "@/app/create/page";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

describe("CreatePage", () => {
	it("renders without crashing", () => {
		render(<CreatePage />);
	});

	it("has the 'Create a Monster' heading", () => {
		render(<CreatePage />);
		expect(
			screen.getByRole("heading", { name: /create a monster/i }),
		).toBeInTheDocument();
	});

	it("shows the 'Coming soon' badge", () => {
		render(<CreatePage />);
		expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
	});

	it("has a '← Back home' link pointing to /", () => {
		render(<CreatePage />);
		const link = screen.getByRole("link", { name: /back home/i });
		expect(link).toHaveAttribute("href", "/");
	});
});
