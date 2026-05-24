// _______________
// Tests for src/components/landingPage/LandingPageBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";

// ---------------------------------------------------------------------------
// Tests — section structure
// ---------------------------------------------------------------------------

describe("LandingPageBlock — section element", () => {
	it("renders a section element", () => {
		render(
			<LandingPageBlock>
				<p>child content</p>
			</LandingPageBlock>,
		);

		// section is rendered (no role="region" unless it has an accessible name)
		const el = document.querySelector("section");
		expect(el).not.toBeNull();
	});

	it("applies the id to the section", () => {
		render(
			<LandingPageBlock id="how-it-works">
				<p>children</p>
			</LandingPageBlock>,
		);

		expect(document.querySelector("#how-it-works")).not.toBeNull();
	});

	it("does not set an id attribute when id prop is omitted", () => {
		const { container } = render(
			<LandingPageBlock>
				<p>children</p>
			</LandingPageBlock>,
		);

		const section = container.querySelector("section");
		expect(section?.hasAttribute("id")).toBe(false);
	});

	it("sets aria-labelledby to {id}-heading when title is provided", () => {
		render(
			<LandingPageBlock id="my-section" title="My Title">
				<p>children</p>
			</LandingPageBlock>,
		);

		const section = document.querySelector("section");
		expect(section?.getAttribute("aria-labelledby")).toBe("my-section-heading");
	});

	it("does not set aria-labelledby when title prop is omitted", () => {
		render(
			<LandingPageBlock id="no-title-section">
				<p>children</p>
			</LandingPageBlock>,
		);

		const section = document.querySelector("section");
		expect(section?.hasAttribute("aria-labelledby")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tests — header content
// ---------------------------------------------------------------------------

describe("LandingPageBlock — header content", () => {
	it("renders eyebrow text", () => {
		render(
			<LandingPageBlock eyebrow="Our process">
				<p>children</p>
			</LandingPageBlock>,
		);

		expect(screen.getByText("Our process")).toBeInTheDocument();
	});

	it("renders title as an h2", () => {
		render(
			<LandingPageBlock title="Section title">
				<p>children</p>
			</LandingPageBlock>,
		);

		const heading = screen.getByRole("heading", {
			level: 2,
			name: "Section title",
		});
		expect(heading).toBeInTheDocument();
	});

	it("gives the h2 id={id}-heading", () => {
		render(
			<LandingPageBlock id="tech-stack" title="Tech Stack">
				<p>children</p>
			</LandingPageBlock>,
		);

		const heading = screen.getByRole("heading", { name: "Tech Stack" });
		expect(heading.id).toBe("tech-stack-heading");
	});

	it("renders description text", () => {
		render(
			<LandingPageBlock description="Some supporting copy here.">
				<p>children</p>
			</LandingPageBlock>,
		);

		expect(screen.getByText("Some supporting copy here.")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<LandingPageBlock>
				<p>Child element text</p>
			</LandingPageBlock>,
		);

		expect(screen.getByText("Child element text")).toBeInTheDocument();
	});

	it("renders no header element when eyebrow, title, and description are all absent", () => {
		const { container } = render(
			<LandingPageBlock>
				<p>only children</p>
			</LandingPageBlock>,
		);

		expect(container.querySelector("header")).toBeNull();
	});

	it("renders a header element when at least one of eyebrow/title/description is provided", () => {
		const { container } = render(
			<LandingPageBlock eyebrow="Label">
				<p>children</p>
			</LandingPageBlock>,
		);

		expect(container.querySelector("header")).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Tests — className passthrough
// ---------------------------------------------------------------------------

describe("LandingPageBlock — className", () => {
	it("adds extra className to the section without crashing", () => {
		const { container } = render(
			<LandingPageBlock className="items-center text-center">
				<p>children</p>
			</LandingPageBlock>,
		);

		const section = container.querySelector("section");
		expect(section?.className).toContain("items-center");
	});
});
