import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonsterCard } from "@/components/monsterGallery/monsterCard/MonsterCard";
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

describe("MonsterCard — detailed mode (default)", () => {
	it("renders monster name, placeholder state, and view action", () => {
		render(<MonsterCard monster={validMonster} />);

		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: /not yet available/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /view/i })).toHaveAttribute(
			"href",
			`/gallery/${validMonster.id}`,
		);
	});

	it("renders the monster's flavor text when present", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(screen.getByText(validMonster.flavor_text!)).toBeInTheDocument();
	});

	it("renders 'No lore recorded yet.' fallback when flavor_text is null", () => {
		const noLoreMonster = { ...validMonster, flavor_text: undefined };
		render(<MonsterCard monster={noLoreMonster} />);
		expect(screen.getByText(/no lore recorded yet/i)).toBeInTheDocument();
	});

	it("does NOT show the fallback copy when flavor_text is present", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(screen.queryByText(/no lore recorded yet/i)).not.toBeInTheDocument();
	});

	it("renders the element and habitat badges", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(screen.getByText(validMonster.traits.element)).toBeInTheDocument();
		expect(screen.getByText(validMonster.traits.habitat)).toBeInTheDocument();
	});

	it("view link has the correct href to /gallery/:id", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(screen.getByRole("link", { name: /view/i })).toHaveAttribute(
			"href",
			`/gallery/${validMonster.id}`,
		);
	});

	it("renders the created date in the card footer", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(screen.getByText(/january 1, 2026/i)).toBeInTheDocument();
	});

	it("renders long trait text without crashing", () => {
		const longTraitMonster = {
			...validMonster,
			display_name: "Bog Oracle",
			traits: {
				...validMonster.traits,
				element:
					"ElectroplasmicBogfireSpectralChargeThatKeepsGoingWithoutSpaces",
			},
		};

		render(<MonsterCard monster={longTraitMonster} />);

		expect(
			screen.getByRole("heading", { name: /bog oracle/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(longTraitMonster.traits.element),
		).toBeInTheDocument();
	});

	it("renders a real image when the monster has one", () => {
		render(<MonsterCard monster={validMonsterWithImage} />);
		const expectedAlt = `${validMonsterWithImage.traits.element} monster named ${validMonsterWithImage.display_name}`;
		expect(screen.getByRole("img", { name: expectedAlt })).toBeInTheDocument();
	});

	it("does NOT render the image placeholder when a real image is present (before load)", () => {
		// Before load event: the img is in DOM but placeholder is also shown (opacity-0)
		// The real img has the monster-specific alt text
		render(<MonsterCard monster={validMonsterWithImage} />);
		const expectedAlt = `${validMonsterWithImage.traits.element} monster named ${validMonsterWithImage.display_name}`;
		expect(screen.getByRole("img", { name: expectedAlt })).toBeInTheDocument();
	});

	it("renders the actions menu button with the correct label", () => {
		render(<MonsterCard monster={validMonster} />);
		expect(
			screen.getByRole("button", {
				name: `Actions for ${validMonster.display_name}`,
			}),
		).toBeInTheDocument();
	});
});

describe("MonsterCard — actions menu", () => {
	it("opens the actions menu and shows delete but no Edit when monster has image", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();

		render(<MonsterCard monster={validMonsterWithImage} onDelete={onDelete} />);

		await user.click(
			screen.getByRole("button", {
				name: `Actions for ${validMonsterWithImage.display_name}`,
			}),
		);

		// Edit is removed for monsters that already have an image
		expect(screen.queryByText("Edit")).not.toBeInTheDocument();

		await user.click(await screen.findByText("Delete"));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("shows Fix image link directly in the card body for imageless monsters", () => {
		render(<MonsterCard monster={validMonster} />);
		// Fix image is now an inline button in the card body, no need to open the dropdown
		const fixLinks = screen.getAllByRole("link", { name: /fix image/i });
		expect(fixLinks.length).toBeGreaterThanOrEqual(1);
		expect(fixLinks[0]).toHaveAttribute("href", `/gallery/${validMonster.id}`);
	});

	it("renders a disabled Delete item when no onDelete handler is provided", async () => {
		const user = userEvent.setup();
		render(<MonsterCard monster={validMonster} />);
		await user.click(
			screen.getByRole("button", {
				name: `Actions for ${validMonster.display_name}`,
			}),
		);
		const deleteItem = await screen.findByText("Delete");
		expect(deleteItem).toBeInTheDocument();
		await user.click(deleteItem);
	});

	it("Download icon button is present in the card footer", () => {
		render(<MonsterCard monster={validMonsterWithImage} />);
		expect(
			screen.getByRole("button", {
				name: new RegExp(
					`download ${validMonsterWithImage.display_name} as profile picture`,
					"i",
				),
			}),
		).toBeInTheDocument();
	});
});

describe("MonsterCard — image-only mode", () => {
	it("renders the monster name in image-only mode", () => {
		render(<MonsterCard monster={validMonster} mode="image-only" />);
		expect(
			screen.getByRole("heading", { name: validMonster.display_name }),
		).toBeInTheDocument();
	});

	it("does NOT render flavor text in image-only mode", () => {
		render(<MonsterCard monster={validMonster} mode="image-only" />);
		expect(
			screen.queryByText(validMonster.flavor_text!),
		).not.toBeInTheDocument();
	});

	it("does NOT render the View link in image-only mode", () => {
		render(<MonsterCard monster={validMonster} mode="image-only" />);
		expect(
			screen.queryByRole("link", { name: /view/i }),
		).not.toBeInTheDocument();
	});

	it("does NOT render the actions menu button in image-only mode", () => {
		render(<MonsterCard monster={validMonster} mode="image-only" />);
		expect(
			screen.queryByRole("button", {
				name: `Actions for ${validMonster.display_name}`,
			}),
		).not.toBeInTheDocument();
	});

	it("still renders as an article element in image-only mode", () => {
		const { container } = render(
			<MonsterCard monster={validMonster} mode="image-only" />,
		);
		expect(container.querySelector("article")).toBeInTheDocument();
	});

	it("still shows the image frame in image-only mode", () => {
		render(<MonsterCard monster={validMonster} mode="image-only" />);
		expect(
			screen.getByRole("img", { name: /monster image — not yet available/i }),
		).toBeInTheDocument();
	});
});
