import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryHeader } from "@/components/monsterGallery/galleryHelperComponents/GalleryHeader";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

describe("GalleryHeader", () => {
	it("renders without errors", () => {
		render(<GalleryHeader />);
	});
	it("renders the page h1 with the correct text", () => {
		render(<GalleryHeader />);
		expect(
			screen.getByRole("heading", { level: 1, name: /my monster gallery/i }),
		).toBeInTheDocument();
	});

	it("the h1 has id gallery-title for aria-labelledby wiring", () => {
		render(<GalleryHeader />);
		expect(
			screen.getByRole("heading", { level: 1, name: /my monster gallery/i }),
		).toHaveAttribute("id", "gallery-title");
	});

	it("renders a Create monster link pointing to /create", () => {
		render(<GalleryHeader />);
		expect(
			screen.getByRole("link", { name: /create monster/i }),
		).toHaveAttribute("href", "/create");
	});
});
