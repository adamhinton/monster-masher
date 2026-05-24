// _______________
// Tests for src/components/landingPage/DownloadShowcaseBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadShowcaseBlock } from "@/components/landingPage/DownloadShowcaseBlock";

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
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		[key: string]: unknown;
	}) => (
		<a href={href} className={className} {...rest}>
			{children}
		</a>
	),
}));

// ---------------------------------------------------------------------------
// Tests — section structure
// ---------------------------------------------------------------------------

describe("DownloadShowcaseBlock — section", () => {
	it("has id='download-ready'", () => {
		render(<DownloadShowcaseBlock />);

		expect(document.querySelector("#download-ready")).not.toBeNull();
	});

	it("renders the section heading 'Download-ready portraits'", () => {
		render(<DownloadShowcaseBlock />);

		expect(
			screen.getByRole("heading", { name: /download-ready portraits/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — flow stages
// ---------------------------------------------------------------------------

describe("DownloadShowcaseBlock — flow stages", () => {
	const STAGE_LABELS = [
		"Monster generated",
		"Framed square portrait",
		"Downloaded PNG",
	];

	it.each(STAGE_LABELS)("renders stage label '%s'", (label) => {
		render(<DownloadShowcaseBlock />);

		expect(screen.getByText(label)).toBeInTheDocument();
	});

	it("renders monster images for the visual stages", () => {
		render(<DownloadShowcaseBlock />);

		const images = screen.getAllByRole("img");
		expect(images.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests — feature chips
// ---------------------------------------------------------------------------

describe("DownloadShowcaseBlock — feature chips", () => {
	const CHIPS = [
		"Square PNG export",
		"Profile-picture frame",
		"Works from generated result",
		"Works from saved monsters later",
	];

	it.each(CHIPS)("renders chip '%s'", (chip) => {
		render(<DownloadShowcaseBlock />);

		expect(screen.getByText(chip)).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — CTA
// ---------------------------------------------------------------------------

describe("DownloadShowcaseBlock — CTA", () => {
	it("renders a CTA link to /create", () => {
		render(<DownloadShowcaseBlock />);

		const cta = screen.getByRole("link", { name: /create my monster/i });
		expect(cta).toBeInTheDocument();
		expect(cta).toHaveAttribute("href", "/create");
	});

	it("does not render a real download button (example monsters are preview only)", () => {
		render(<DownloadShowcaseBlock />);

		// There should be no button with "download" accessible name
		const buttons = screen.queryAllByRole("button", { name: /download/i });
		expect(buttons).toHaveLength(0);
	});
});
