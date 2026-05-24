// _______________
// Tests for src/app/gallery/example/page.tsx (/gallery/example)
//
// Covers:
//   - Page heading renders
//   - All six example monsters appear
//   - CTA links to /create
//   - Back link goes to /about
// _______________

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExampleGalleryPage from "@/app/gallery/example/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...rest
	}: {
		href: string;
		children: ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/gallery/example",
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ExampleGalleryPage", () => {
	it("renders without crashing", () => {
		render(<ExampleGalleryPage />);
	});

	it("renders the Example Monsters heading", () => {
		render(<ExampleGalleryPage />);
		expect(
			screen.getByRole("heading", { name: /example monsters/i }),
		).toBeInTheDocument();
	});

	it("renders all six example monster names", () => {
		render(<ExampleGalleryPage />);
		expect(
			screen.getByRole("heading", { name: /magleta/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /pyrix/i })).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /quawalix/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /ursola/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /pemdrath/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /ventanilla/i }),
		).toBeInTheDocument();
	});

	it("renders a CTA link to /create", () => {
		render(<ExampleGalleryPage />);
		const createLinks = screen.getAllByRole("link", {
			name: /create my monster/i,
		});
		expect(createLinks.length).toBeGreaterThanOrEqual(1);
		expect(createLinks[0]).toHaveAttribute("href", "/create");
	});

	it("renders a back link to /about", () => {
		render(<ExampleGalleryPage />);
		const backLink = screen.getByRole("link", { name: /back to about/i });
		expect(backLink).toHaveAttribute("href", "/about");
	});

	it("renders images with alt text for each monster", () => {
		render(<ExampleGalleryPage />);
		expect(
			screen.getByRole("img", {
				name: /cute electricity and steel monster named magleta/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", {
				name: /cute fiery tabby monster named pyrix/i,
			}),
		).toBeInTheDocument();
	});

	it("renders detail links for each monster", () => {
		render(<ExampleGalleryPage />);
		const detailLinks = screen.getAllByRole("link", {
			name: /^view .+ detail$/i,
		});
		expect(detailLinks).toHaveLength(6);
	});

	it("renders taglines for each monster", () => {
		render(<ExampleGalleryPage />);
		expect(
			screen.getByText(/outlet muncher with a taste for spare voltage/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/low-maintenance, assuming you brought spicy snacks/i),
		).toBeInTheDocument();
	});
});
