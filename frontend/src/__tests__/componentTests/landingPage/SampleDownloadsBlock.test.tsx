// _______________
// Tests for src/components/landingPage/SampleDownloadsBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SampleDownloadsBlock } from "@/components/landingPage/SampleDownloadsBlock";
import { sampleDownloadMonsters } from "@/lib/landingPage/landingExampleData";

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

describe("SampleDownloadsBlock — section", () => {
	it("has id='sample-downloads'", () => {
		render(<SampleDownloadsBlock />);

		expect(document.querySelector("#sample-downloads")).not.toBeNull();
	});

	it("renders the section heading", () => {
		render(<SampleDownloadsBlock />);

		expect(
			screen.getByRole("heading", { name: /sample downloads/i }),
		).toBeInTheDocument();
	});

	it("renders exactly 3 cards", () => {
		const { container } = render(<SampleDownloadsBlock />);

		// 3 article elements — one per sample
		expect(container.querySelectorAll("article")).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Tests — card content
// ---------------------------------------------------------------------------

describe("SampleDownloadsBlock — card content", () => {
	it("renders each sample monster name", () => {
		render(<SampleDownloadsBlock />);

		for (const monster of sampleDownloadMonsters) {
			expect(screen.getByText(monster.display_name)).toBeInTheDocument();
		}
	});

	it("renders each sample monster element badge", () => {
		render(<SampleDownloadsBlock />);

		for (const monster of sampleDownloadMonsters) {
			// There may be multiple badges per page; at least one per monster
			expect(
				screen.getAllByText(monster.traits.element).length,
			).toBeGreaterThanOrEqual(1);
		}
	});

	it("renders each sample monster download filename", () => {
		render(<SampleDownloadsBlock />);

		for (const monster of sampleDownloadMonsters) {
			expect(screen.getByText(monster.download_filename)).toBeInTheDocument();
		}
	});
});

// ---------------------------------------------------------------------------
// Tests — detail links
// ---------------------------------------------------------------------------

describe("SampleDownloadsBlock — detail links", () => {
	it("renders 3 'See full portrait' links", () => {
		render(<SampleDownloadsBlock />);

		expect(
			screen.getAllByRole("link", { name: /see full portrait/i }),
		).toHaveLength(3);
	});

	it("links each card to the correct example detail page", () => {
		render(<SampleDownloadsBlock />);

		const links = screen.getAllByRole("link", { name: /see full portrait/i });

		links.forEach((link, i) => {
			expect(link).toHaveAttribute(
				"href",
				`/gallery/example/${sampleDownloadMonsters[i].id}`,
			);
		});
	});
});
