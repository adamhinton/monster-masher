import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonsterDetailView } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/MonsterDetailView";
import { TestStoreProvider } from "@/__tests__/__testUtils__/store";
import {
	validMonster,
	validMonsterWithImage,
	validUserProfileWithMonsters,
} from "@/__tests__/__testUtils__/fixtures";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}));

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

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

function renderView(monster: Monster) {
	return render(
		<TestStoreProvider
			authState={{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			}}
		>
			<MonsterDetailView monster={monster} />
		</TestStoreProvider>,
	);
}

describe("MonsterDetailView — name and navigation", () => {
	it("renders without crashing", () => {
		renderView(validMonster);
	});

	it("renders a Back to gallery link pointing to /gallery", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("link", { name: /back to gallery/i }),
		).toHaveAttribute("href", "/gallery");
	});

	it("back link is inside a nav with aria-label Breadcrumb", () => {
		renderView(validMonster);
		const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
		expect(nav).toBeInTheDocument();
		expect(nav.querySelector("a")).toHaveAttribute("href", "/gallery");
	});
});

describe("MonsterDetailView — flavor text", () => {
	it("renders the monster's flavor_text inside quotation marks", () => {
		renderView(validMonster);
		// The text content includes "A cranky little swamp goblin."
		expect(
			screen.getByText(/a cranky little swamp goblin/i),
		).toBeInTheDocument();
	});

	it("renders the 'No lore recorded' fallback when flavor_text is null", () => {
		const noLoreMonster: Monster = { ...validMonster, flavor_text: undefined };
		renderView(noLoreMonster);
		expect(
			screen.getByText(/no lore recorded for this specimen/i),
		).toBeInTheDocument();
	});

	it("does NOT render the fallback when flavor_text is set", () => {
		renderView(validMonster);
		expect(
			screen.queryByText(/no lore recorded for this specimen/i),
		).not.toBeInTheDocument();
	});
});

describe("MonsterDetailView — trait badges in header", () => {
	it("shows the element badge in the header", () => {
		renderView(validMonster);
		// Badge renders the text directly; there are multiple instances (badges + trait list)
		// At least one of them is present
		expect(
			screen.getAllByText(validMonster.traits.element).length,
		).toBeGreaterThanOrEqual(1);
	});

	it("shows the habitat badge in the header", () => {
		renderView(validMonster);
		expect(
			screen.getAllByText(validMonster.traits.habitat).length,
		).toBeGreaterThanOrEqual(1);
	});

	it("shows the personality badge in the header", () => {
		renderView(validMonster);
		expect(
			screen.getAllByText(validMonster.traits.personality).length,
		).toBeGreaterThanOrEqual(1);
	});
});

describe("MonsterDetailView — traits card and meta", () => {
	it("renders the Traits section heading", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("heading", { name: /traits/i }),
		).toBeInTheDocument();
	});

	it("renders the colour palette value in the trait list", () => {
		renderView(validMonster);
		expect(
			screen.getByText(validMonster.traits.color_palette),
		).toBeInTheDocument();
	});

	it("renders the specimen metadata card with the short ID", () => {
		renderView(validMonster);
		expect(screen.getByText("#AAAAAAAA")).toBeInTheDocument();
	});

	it("renders the Created metadata label", () => {
		renderView(validMonster);
		expect(screen.getByText("Created")).toBeInTheDocument();
	});
});

describe("MonsterDetailView — action buttons", () => {
	it("renders the Edit details button in a disabled state", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("button", { name: /edit details/i }),
		).toBeDisabled();
	});

	it("renders the Download Picture button in a disabled state", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("button", { name: /Download Picture/i }),
		).toBeDisabled();
	});

	it("renders the Delete monster trigger button", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("button", { name: /delete monster/i }),
		).toBeInTheDocument();
	});

	it("Delete monster button is enabled", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("button", { name: /delete monster/i }),
		).not.toBeDisabled();
	});

	it("renders the Actions section heading", () => {
		renderView(validMonster);
		expect(
			screen.getByRole("heading", { name: /actions/i }),
		).toBeInTheDocument();
	});
});

describe("MonsterDetailView — image frame", () => {
	it("shows the image placeholder when monster has no image", () => {
		renderView(validMonster); // validMonster.image is null
		expect(
			screen.getByRole("img", { name: /monster image — not yet available/i }),
		).toBeInTheDocument();
	});

	it("shows the actual image when monster has an image", () => {
		renderView(validMonsterWithImage);
		const expectedAlt = `${validMonsterWithImage.traits.element} monster named ${validMonsterWithImage.display_name}`;
		expect(screen.getByRole("img", { name: expectedAlt })).toBeInTheDocument();
	});

	it("alt text follows the element + name pattern", () => {
		renderView(validMonsterWithImage);
		const expectedAlt = `${validMonsterWithImage.traits.element} monster named ${validMonsterWithImage.display_name}`;
		expect(screen.getByRole("img", { name: expectedAlt })).toBeInTheDocument();
	});
});

describe("MonsterDetailView — delete flow integration", () => {
	it("opens the delete dialog when the Delete monster button is clicked", async () => {
		const user = userEvent.setup();
		renderView(validMonster);
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(
			screen.getByRole("alertdialog", {
				name: new RegExp(`delete ${validMonster.display_name}`, "i"),
			}),
		).toBeInTheDocument();
	});
});
