import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GalleryGrid } from "@/components/monsterGallery/GalleryGrid";
import {
	validMonster,
	validMonsterWithImage,
} from "@/__tests__/__testUtils__/fixtures";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

describe("GalleryGrid — rendering correct count", () => {
	it("renders without errors", () => {
		render(<GalleryGrid monsters={[validMonster]} />);
	});
	it("renders one card per provided monster", () => {
		render(<GalleryGrid monsters={[validMonster, validMonsterWithImage]} />);

		expect(
			screen.getByRole("list", { name: /saved monsters/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: validMonsterWithImage.display_name }),
		).toBeInTheDocument();
	});

	it("renders an empty list when passed zero monsters — no crash", () => {
		render(<GalleryGrid monsters={[]} />);
		expect(
			screen.getByRole("list", { name: /saved monsters/i }),
		).toBeInTheDocument();
		// No headings rendered since there are no cards
		expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
	});

	it("renders exactly one card for a single monster", () => {
		render(<GalleryGrid monsters={[validMonster]} />);
		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", {
				name: validMonsterWithImage.display_name,
			}),
		).not.toBeInTheDocument();
	});

	it("renders the correct number of list items", () => {
		render(<GalleryGrid monsters={[validMonster, validMonsterWithImage]} />);
		const list = screen.getByRole("list", { name: /saved monsters/i });
		expect(list.querySelectorAll("li").length).toBe(2);
	});
});

describe("GalleryGrid — view mode toggle", () => {
	it("defaults to detailed mode and shows flavor text", () => {
		render(<GalleryGrid monsters={[validMonster]} />);
		expect(
			screen.getByText(validMonster.flavor_text ?? ""),
		).toBeInTheDocument();
	});

	it("switches to image-only mode on toggle click — hides flavor text", async () => {
		const user = userEvent.setup();
		render(<GalleryGrid monsters={[validMonster]} />);

		expect(
			screen.getByText(validMonster.flavor_text ?? ""),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /image-only view/i }));

		expect(
			screen.queryByText(validMonster.flavor_text ?? ""),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
	});

	it("toggling back to detailed mode shows flavor text again", async () => {
		const user = userEvent.setup();
		render(<GalleryGrid monsters={[validMonster]} />);

		await user.click(screen.getByRole("button", { name: /image-only view/i }));
		expect(
			screen.queryByText(validMonster.flavor_text ?? ""),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /detailed view/i }));
		expect(
			screen.getByText(validMonster.flavor_text ?? ""),
		).toBeInTheDocument();
	});

	it("image-only toggle button is present initially", () => {
		render(<GalleryGrid monsters={[validMonster]} />);
		expect(
			screen.getByRole("button", { name: /image-only view/i }),
		).toBeInTheDocument();
	});

	it("detailed view toggle button appears after switching to image-only mode", async () => {
		const user = userEvent.setup();
		render(<GalleryGrid monsters={[validMonster]} />);
		await user.click(screen.getByRole("button", { name: /image-only view/i }));
		expect(
			screen.getByRole("button", { name: /detailed view/i }),
		).toBeInTheDocument();
	});

	it("image-only mode still renders the monster heading overlay", async () => {
		const user = userEvent.setup();
		render(<GalleryGrid monsters={[validMonster, validMonsterWithImage]} />);
		await user.click(screen.getByRole("button", { name: /image-only view/i }));
		// Names still in DOM in image-only (as overlay headings)
		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: validMonsterWithImage.display_name }),
		).toBeInTheDocument();
	});
});
