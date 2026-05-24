// _______________
// Tests for src/components/landingPage/TableOfContents.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableOfContents } from "@/components/landingPage/TableOfContents";

// ---------------------------------------------------------------------------
// Tests — navigation structure
// ---------------------------------------------------------------------------

describe("TableOfContents — navigation", () => {
	it("renders a nav element with an accessible label", () => {
		render(<TableOfContents />);

		const nav = screen.getByRole("navigation", { name: "Page sections" });
		expect(nav).toBeInTheDocument();
	});

	it("renders exactly 6 anchor links", () => {
		render(<TableOfContents />);

		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(6);
	});

	it("renders links inside a list", () => {
		const { container } = render(<TableOfContents />);

		expect(container.querySelector("ol")).not.toBeNull();
		expect(container.querySelectorAll("li")).toHaveLength(6);
	});
});

// ---------------------------------------------------------------------------
// Tests — anchor hrefs
// ---------------------------------------------------------------------------

describe("TableOfContents — link hrefs", () => {
	const EXPECTED_HREFS = [
		"#download-ready",
		"#how-it-works",
		"#sample-downloads",
		"#example-gallery",
		"#tech-stack",
		"#try-it",
	];

	it.each(EXPECTED_HREFS)("renders a link with href %s", (href) => {
		render(<TableOfContents />);

		const link = screen.getByRole("link", {
			name: (_, el) => el.getAttribute("href") === href,
		});
		expect(link).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — link labels
// ---------------------------------------------------------------------------

describe("TableOfContents — link labels", () => {
	const EXPECTED_LABELS = [
		"Download-ready portraits",
		"How it works",
		"Sample downloads",
		"Example gallery",
		"Tech stack",
		"Try it yourself",
	];

	it.each(EXPECTED_LABELS)("renders a link labelled %s", (label) => {
		render(<TableOfContents />);

		expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
	});
});
