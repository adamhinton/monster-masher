// _______________
// Tests for src/components/landingPage/FinalCtaBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinalCtaBlock } from "@/components/landingPage/FinalCtaBlock";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

describe("FinalCtaBlock — section", () => {
	it("has id='try-it'", () => {
		render(<FinalCtaBlock />);

		expect(document.querySelector("#try-it")).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Tests — copy
// ---------------------------------------------------------------------------

describe("FinalCtaBlock — copy", () => {
	it("renders the heading 'Go make something weird.'", () => {
		render(<FinalCtaBlock />);

		expect(
			screen.getByRole("heading", { name: /go make something weird/i }),
		).toBeInTheDocument();
	});

	it("renders the supporting copy", () => {
		render(<FinalCtaBlock />);

		expect(screen.getByText(/start with a few traits/i)).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — CTAs
// ---------------------------------------------------------------------------

describe("FinalCtaBlock — CTAs", () => {
	it("renders 'Try it yourself' CTA linking to /create", () => {
		render(<FinalCtaBlock />);

		const cta = screen.getByRole("link", { name: /try it yourself/i });
		expect(cta).toHaveAttribute("href", "/create");
	});

	it("renders 'See example gallery' CTA linking to /gallery/example", () => {
		render(<FinalCtaBlock />);

		const cta = screen.getByRole("link", { name: /see example gallery/i });
		expect(cta).toHaveAttribute("href", "/gallery/example");
	});
});
