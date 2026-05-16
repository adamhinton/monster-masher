import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterTraitList } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterTraitList";
import { validMonster } from "@/__tests__/__testUtils__/fixtures";

describe("MonsterTraitList — all four traits", () => {
	it("renders without crashing", () => {
		render(<MonsterTraitList traits={validMonster.traits} />);
	});
	it("renders semantic trait labels and values", () => {
		render(<MonsterTraitList traits={validMonster.traits} />);

		const traitSection = screen.getByRole("region", {
			name: /monster traits/i,
		});
		const definitionList = traitSection.querySelector("dl");

		expect(definitionList).not.toBeNull();
		expect(within(traitSection).getByText("Element")).toBeInTheDocument();
		expect(
			within(traitSection).getByText(validMonster.traits.element),
		).toBeInTheDocument();
		expect(within(traitSection).getByText("Habitat")).toBeInTheDocument();
		expect(
			within(traitSection).getByText(validMonster.traits.habitat),
		).toBeInTheDocument();
		expect(within(traitSection).getByText("Personality")).toBeInTheDocument();
		expect(
			within(traitSection).getByText(validMonster.traits.personality),
		).toBeInTheDocument();
		expect(
			within(traitSection).getByText(/colour palette/i),
		).toBeInTheDocument();
		expect(
			within(traitSection).getByText(validMonster.traits.color_palette),
		).toBeInTheDocument();
	});

	it("uses a <dl> element as the semantic container for traits", () => {
		const { container } = render(
			<MonsterTraitList traits={validMonster.traits} />,
		);
		expect(container.querySelector("dl")).toBeInTheDocument();
	});

	it("renders exactly 4 <dt> labels", () => {
		const { container } = render(
			<MonsterTraitList traits={validMonster.traits} />,
		);
		const dl = container.querySelector("dl")!;
		expect(dl.querySelectorAll("dt")).toHaveLength(4);
	});

	it("renders exactly 4 <dd> values", () => {
		const { container } = render(
			<MonsterTraitList traits={validMonster.traits} />,
		);
		const dl = container.querySelector("dl")!;
		expect(dl.querySelectorAll("dd")).toHaveLength(4);
	});

	it("labels the outer section as 'Monster traits' for screen readers", () => {
		render(<MonsterTraitList traits={validMonster.traits} />);
		expect(
			screen.getByRole("region", { name: /monster traits/i }),
		).toBeInTheDocument();
	});

	it("label text says 'Colour palette' (UK spelling) not 'Color palette'", () => {
		render(<MonsterTraitList traits={validMonster.traits} />);
		expect(screen.getByText("Colour palette")).toBeInTheDocument();
		expect(screen.queryByText("Color palette")).not.toBeInTheDocument();
	});

	it("forwards a custom className to the outer section", () => {
		const { container } = render(
			<MonsterTraitList
				traits={validMonster.traits}
				className="custom-trait-class"
			/>,
		);
		const section = container.querySelector("section");
		expect(section).toHaveClass("custom-trait-class");
	});

	it("renders long unspaced values without crashing", () => {
		const longTraits = {
			...validMonster.traits,
			element: "VeryLongNoSpaceElementNameThatShouldNotCauseALayoutBreak",
			habitat: "AnotherSuperLongHabitatValueWithNoSpacesWhatsoever",
			personality: "SilentlyBrooding",
			color_palette:
				"ExtremeLyLongColorPaletteStringWithNoSpacesAtAllShouldWork",
		};
		render(<MonsterTraitList traits={longTraits} />);
		expect(screen.getByText(longTraits.element)).toBeInTheDocument();
		expect(screen.getByText(longTraits.habitat)).toBeInTheDocument();
		expect(screen.getByText(longTraits.personality)).toBeInTheDocument();
		expect(screen.getByText(longTraits.color_palette)).toBeInTheDocument();
	});
});

describe("MonsterTraitList — flavor text", () => {
	it("renders flavor text when provided", () => {
		render(
			<MonsterTraitList
				traits={validMonster.traits}
				flavorText={validMonster.flavor_text ?? undefined}
			/>,
		);

		expect(
			screen.getByText(/a cranky little swamp goblin/i),
		).toBeInTheDocument();
	});

	it("renders flavor text inside a <p> element", () => {
		const { container } = render(
			<MonsterTraitList
				traits={validMonster.traits}
				flavorText="A test creature."
			/>,
		);
		// The flavor paragraph is styled with italic; it lives outside the dl
		const para = container.querySelector("p");
		expect(para).toBeInTheDocument();
		expect(para).toHaveTextContent("A test creature.");
	});

	it("does NOT render a flavor text paragraph when flavorText is undefined", () => {
		const { container } = render(
			<MonsterTraitList traits={validMonster.traits} />,
		);
		expect(container.querySelector("p")).not.toBeInTheDocument();
	});

	it("does NOT render a Separator when flavorText is undefined", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { container } = render(
			<MonsterTraitList traits={validMonster.traits} />,
		);
		// Separator renders as <hr> or a div; check no separator role is present
		expect(screen.queryByRole("separator")).not.toBeInTheDocument();
	});

	it("renders a Separator between the dl and the flavor text", () => {
		render(
			<MonsterTraitList
				traits={validMonster.traits}
				flavorText="Some lore here."
			/>,
		);
		expect(screen.getByRole("separator")).toBeInTheDocument();
	});
});
