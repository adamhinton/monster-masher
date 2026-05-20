// ________
// Tests for src/components/emailTemplatesToUser/imageGenerationDone/ImageGenerationSuccess.tsx
// ________

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
	ImageGenerationDoneEmail,
	type ImageGenerationDoneEmailProps,
} from "@/components/emailTemplatesToUser/imageGenerationDone/ImageGenerationSuccess";
import type { ImageGenerationDoneScenario } from "@/lib/api/email/imageGenerationDoneTypes";

const APP_URL = "https://monstermash.io";

function renderEmail(overrides: Partial<ImageGenerationDoneEmailProps> = {}) {
	const props: ImageGenerationDoneEmailProps = {
		scenario: "succeeded",
		appUrl: APP_URL,
		...overrides,
	};
	return render(<ImageGenerationDoneEmail {...props} />);
}

describe("ImageGenerationDoneEmail — succeeded", () => {
	it("renders the success heading", () => {
		renderEmail({ scenario: "succeeded" });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Your monster is ready!",
		);
	});

	it("includes a link to the gallery", () => {
		renderEmail({ scenario: "succeeded" });
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(`${APP_URL}/gallery`);
	});

	it("weaves monster name into the body when provided", () => {
		renderEmail({ scenario: "succeeded", monsterName: "Grumblor" });
		expect(screen.getByText(/Grumblor/)).toBeInTheDocument();
	});

	it("renders without a monster name when omitted", () => {
		renderEmail({ scenario: "succeeded" });
		// Should still render the success message without crashing
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
	});
});

describe("ImageGenerationDoneEmail — failed/moderation", () => {
	it("renders the moderation-blocked heading", () => {
		renderEmail({ scenario: "failed/moderation" });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"We couldn't create your monster",
		);
	});

	it("includes a link to the create page", () => {
		renderEmail({ scenario: "failed/moderation" });
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(`${APP_URL}/create`);
	});

	it("weaves monster name into the body when provided", () => {
		renderEmail({ scenario: "failed/moderation", monsterName: "Grumblor" });
		expect(screen.getByText(/Grumblor/)).toBeInTheDocument();
	});
});

describe("ImageGenerationDoneEmail — failed/network-error", () => {
	it("renders the network-error heading", () => {
		renderEmail({ scenario: "failed/network-error" });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Generation ran into a problem",
		);
	});

	it("includes a link to the create page", () => {
		renderEmail({ scenario: "failed/network-error" });
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(`${APP_URL}/create`);
	});

	it("weaves monster name into the body when provided", () => {
		renderEmail({ scenario: "failed/network-error", monsterName: "Zorblax" });
		expect(screen.getByText(/Zorblax/)).toBeInTheDocument();
	});
});

describe("ImageGenerationDoneEmail — failed/unspecified", () => {
	it("renders the unspecified-failure heading", () => {
		renderEmail({ scenario: "failed/unspecified" });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Generation didn't complete",
		);
	});

	it("includes a link to the create page", () => {
		renderEmail({ scenario: "failed/unspecified" });
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(`${APP_URL}/create`);
	});

	it("weaves monster name into the body when provided", () => {
		renderEmail({ scenario: "failed/unspecified", monsterName: "Blorbis" });
		expect(screen.getByText(/Blorbis/)).toBeInTheDocument();
	});
});

describe("ImageGenerationDoneEmail — structure", () => {
	const allScenarios: ImageGenerationDoneScenario[] = [
		"succeeded",
		"failed/moderation",
		"failed/network-error",
		"failed/unspecified",
	];

	it.each(allScenarios)(
		"renders a <main> landmark element for scenario %s",
		(scenario) => {
			renderEmail({ scenario });
			expect(screen.getByRole("main")).toBeInTheDocument();
		},
	);

	it.each(allScenarios)(
		"renders exactly one CTA link for scenario %s",
		(scenario) => {
			renderEmail({ scenario });
			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(1);
		},
	);

	it.each(allScenarios)(
		"uses APP_URL correctly in the CTA href for scenario %s",
		(scenario) => {
			renderEmail({ scenario });
			const link = screen.getByRole("link");
			expect(link.getAttribute("href")).toMatch(/^https:\/\/monstermash\.io\//);
		},
	);
});
