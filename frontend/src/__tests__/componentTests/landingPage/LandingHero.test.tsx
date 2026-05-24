// _______________
// Tests for src/components/landingPage/LandingHero.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingHero } from "@/components/landingPage/LandingHero";

// ---------------------------------------------------------------------------
// Mocks — dependencies pulled in via ExampleMonsterImage
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
// Tests — copy
// ---------------------------------------------------------------------------

describe("LandingHero — copy", () => {
	it("renders the hero headline", () => {
		render(<LandingHero />);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /your next profile picture/i,
			}),
		).toBeInTheDocument();
	});

	it("renders the subheadline copy", () => {
		render(<LandingHero />);

		expect(
			screen.getByText(/describe a weird little creature/i),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — CTAs
// ---------------------------------------------------------------------------

describe("LandingHero — CTAs", () => {
	it("renders 'Try it yourself' CTA linking to /create", () => {
		render(<LandingHero />);

		const cta = screen.getByRole("link", { name: /try it yourself/i });
		expect(cta).toBeInTheDocument();
		expect(cta).toHaveAttribute("href", "/create");
	});

	it("renders 'See example gallery' CTA linking to /gallery/example", () => {
		render(<LandingHero />);

		const cta = screen.getByRole("link", { name: /see example gallery/i });
		expect(cta).toBeInTheDocument();
		expect(cta).toHaveAttribute("href", "/gallery/example");
	});
});

// ---------------------------------------------------------------------------
// Tests — hero visual
// ---------------------------------------------------------------------------

describe("LandingHero — hero visual", () => {
	it("renders an image for the featured monster", () => {
		const { container } = render(<LandingHero />);

		// The hero visual is aria-hidden (decorative), so we query the DOM
		// directly rather than through the accessibility tree.
		const images = container.querySelectorAll("img");
		expect(images.length).toBeGreaterThan(0);
	});

	it("renders the featured monster's download filename", () => {
		render(<LandingHero />);

		// The filename should appear somewhere in the visual area
		// e.g. "monster-masher-magleta.png"
		const filenameEl = screen.getByText(/monster-masher-.+\.png/i);
		expect(filenameEl).toBeInTheDocument();
	});

	it("renders PNG badge", () => {
		render(<LandingHero />);

		expect(screen.getByText("PNG")).toBeInTheDocument();
	});

	it("renders Profile-ready badge", () => {
		render(<LandingHero />);

		expect(screen.getByText("Profile-ready")).toBeInTheDocument();
	});

	it("renders Save favorite badge", () => {
		render(<LandingHero />);

		expect(screen.getByText("Save favorite")).toBeInTheDocument();
	});
});
