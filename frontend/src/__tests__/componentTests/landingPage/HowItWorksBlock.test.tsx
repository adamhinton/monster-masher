// _______________
// Tests for src/components/landingPage/HowItWorksBlock.tsx
// _______________

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorksBlock } from "@/components/landingPage/HowItWorksBlock";

// ---------------------------------------------------------------------------
// Tests — section structure
// ---------------------------------------------------------------------------

describe("HowItWorksBlock — section", () => {
	it("has id='how-it-works'", () => {
		render(<HowItWorksBlock />);

		expect(document.querySelector("#how-it-works")).not.toBeNull();
	});

	it("renders the section heading", () => {
		render(<HowItWorksBlock />);

		expect(
			screen.getByRole("heading", { name: /how it works/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — step cards
// ---------------------------------------------------------------------------

describe("HowItWorksBlock — steps", () => {
	const STEP_TITLES = [
		"Describe the creature",
		"Generate the monster",
		"Download the portrait",
		"Save your favorites",
	];

	it.each(STEP_TITLES)("renders step title '%s'", (title) => {
		render(<HowItWorksBlock />);

		expect(screen.getByText(title)).toBeInTheDocument();
	});

	it("renders steps in correct order", () => {
		render(<HowItWorksBlock />);

		const titles = STEP_TITLES.map((t) => screen.getByText(t));
		// Check DOM order by comparing position
		const positions = titles.map((el) =>
			Array.from(document.querySelectorAll("p")).indexOf(
				el as HTMLParagraphElement,
			),
		);
		for (let i = 0; i < positions.length - 1; i++) {
			expect(positions[i]).toBeLessThan(positions[i + 1]);
		}
	});

	it("renders Download as step 3 and Save as step 4", () => {
		render(<HowItWorksBlock />);

		const downloadStep = screen.getByText("Download the portrait");
		const saveStep = screen.getByText("Save your favorites");

		// Download (step 3) appears before Save (step 4) in the DOM
		expect(
			downloadStep.compareDocumentPosition(saveStep) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("renders steps inside an ordered list", () => {
		const { container } = render(<HowItWorksBlock />);

		expect(container.querySelector("ol")).not.toBeNull();
		expect(container.querySelectorAll("li")).toHaveLength(4);
	});
});
