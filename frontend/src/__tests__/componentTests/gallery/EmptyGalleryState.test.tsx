import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyGalleryState } from "@/components/monsterGallery/galleryHelperComponents/EmptyGalleryState";

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

describe("EmptyGalleryState", () => {
	it("Renders without errors", () => {
		render(<EmptyGalleryState />);
	});
	it("renders a Ghost icon that is aria-hidden — decorative", () => {
		const { container } = render(<EmptyGalleryState />);
		const icon = container.querySelector("svg[aria-hidden='true']");
		expect(icon).toBeInTheDocument();
	});

	it("the Create your first monster link points to /create", () => {
		render(<EmptyGalleryState />);
		const link = screen.getByRole("link", {
			name: /create your first monster/i,
		});
		expect(link).toHaveAttribute("href", "/create");
	});

	it("renders a section element wrapping the content", () => {
		const { container } = render(<EmptyGalleryState />);
		expect(container.querySelector("section")).toBeInTheDocument();
	});
});
