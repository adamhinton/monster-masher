// ________
// Tests for src/app/gallery/page.tsx  (/gallery)
// ________
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GalleryPage from "@/app/gallery/page";

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

describe("GalleryPage", () => {
	it("renders without crashing", () => {
		render(<GalleryPage />);
	});

	it("has the 'Gallery' heading", () => {
		render(<GalleryPage />);
		expect(
			screen.getByRole("heading", { name: /^gallery$/i }),
		).toBeInTheDocument();
	});

	it("shows the 'Coming soon' badge", () => {
		render(<GalleryPage />);
		expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
	});

	it("has a '← Back home' link pointing to /", () => {
		render(<GalleryPage />);
		const link = screen.getByRole("link", { name: /back home/i });
		expect(link).toHaveAttribute("href", "/");
	});
});
