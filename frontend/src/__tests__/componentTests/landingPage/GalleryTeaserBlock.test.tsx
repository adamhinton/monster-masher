// _______________
// Tests for src/components/landingPage/GalleryTeaserBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryTeaserBlock } from "@/components/landingPage/GalleryTeaserBlock";
import { exampleGalleryMonsters } from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/about",
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		className,
	}: {
		src: string;
		alt: string;
		className?: string;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} className={className} />
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel} {...rest}>
			{children}
		</a>
	),
}));

// ---------------------------------------------------------------------------
// Tests — section structure
// ---------------------------------------------------------------------------

describe("GalleryTeaserBlock — section", () => {
	it("has id='example-gallery'", () => {
		render(<GalleryTeaserBlock />);

		expect(document.querySelector("#example-gallery")).not.toBeNull();
	});

	it("renders the section heading", () => {
		render(<GalleryTeaserBlock />);

		expect(
			screen.getByRole("heading", { name: /keep your favourites/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — portrait grid
// ---------------------------------------------------------------------------

describe("GalleryTeaserBlock — portrait grid", () => {
	it("renders 6 monster portrait links", () => {
		render(<GalleryTeaserBlock />);

		// Each monster has an accessible link wrapping ExampleMonsterImage
		const monsterLinks = screen.getAllByRole("link", {
			name: (_, el) =>
				(el.getAttribute("href") ?? "").startsWith("/gallery/example/"),
		});
		// 6 portrait links + 1 CTA link to /gallery/example = ≥ 6 matching
		const portraitLinks = monsterLinks.filter(
			(l) => l.getAttribute("href") !== "/gallery/example",
		);
		expect(portraitLinks).toHaveLength(6);
	});

	it("each portrait link uses the correct monster id", () => {
		render(<GalleryTeaserBlock />);

		for (const monster of exampleGalleryMonsters) {
			const link = screen.getByRole("link", { name: monster.alt_text });
			expect(link).toHaveAttribute("href", `/gallery/example/${monster.id}`);
		}
	});
});

// ---------------------------------------------------------------------------
// Tests — CTA
// ---------------------------------------------------------------------------

describe("GalleryTeaserBlock — CTA", () => {
	it("renders 'See example gallery' link to /gallery/example", () => {
		render(<GalleryTeaserBlock />);

		const cta = screen.getByRole("link", { name: /see example gallery/i });
		expect(cta).toHaveAttribute("href", "/gallery/example");
	});
});
