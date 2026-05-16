import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterBadges } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterBadges";
import { validMonster } from "@/__tests__/__testUtils__/fixtures";

const { traits } = validMonster;

describe("MonsterBadges — card variant", () => {
	it("renders without crashing", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
	});
	it("renders the element badge", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		expect(screen.getByText(traits.element)).toBeInTheDocument();
	});

	it("renders the habitat badge", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		expect(screen.getByText(traits.habitat)).toBeInTheDocument();
	});

	it("does NOT render personality in card mode — it is detail-only", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		expect(screen.queryByText(traits.personality)).not.toBeInTheDocument();
	});

	it("does NOT render colour palette in card mode", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		expect(screen.queryByText(traits.color_palette)).not.toBeInTheDocument();
	});

	it("sets the title attribute on the element badge for full-text tooltip / truncation mitigation", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		const elementBadge = screen.getByTitle(traits.element);
		expect(elementBadge).toBeInTheDocument();
		expect(elementBadge).toHaveTextContent(traits.element);
	});

	it("sets the title attribute on the habitat badge", () => {
		render(<MonsterBadges traits={traits} variant="card" />);
		const habitatBadge = screen.getByTitle(traits.habitat);
		expect(habitatBadge).toBeInTheDocument();
		expect(habitatBadge).toHaveTextContent(traits.habitat);
	});

	it("forwards a custom className onto the wrapper div", () => {
		const { container } = render(
			<MonsterBadges
				traits={traits}
				variant="card"
				className="test-class-xyz"
			/>,
		);
		expect(container.firstElementChild).toHaveClass("test-class-xyz");
	});

	it("renders exactly 2 badges in card mode", () => {
		const { container } = render(
			<MonsterBadges traits={traits} variant="card" />,
		);
		// Badge renders a span; count by title attributes present
		const titled = container.querySelectorAll("[title]");
		expect(titled).toHaveLength(2);
	});

	it("handles long trait strings without crashing", () => {
		const longTraits = {
			...traits,
			element:
				"SuperLongElementNameThatGoesOnForeverWithoutAnySpacesAndShouldNotBreakAnything",
			habitat:
				"AnotherExtremelyLongHabitatStringThatShouldBeTruncatedButNotRemoved",
		};
		render(<MonsterBadges traits={longTraits} variant="card" />);
		expect(screen.getByTitle(longTraits.element)).toBeInTheDocument();
		expect(screen.getByTitle(longTraits.habitat)).toBeInTheDocument();
	});
});

describe("MonsterBadges — detail variant", () => {
	it("renders element badge", () => {
		render(<MonsterBadges traits={traits} variant="detail" />);
		expect(screen.getByText(traits.element)).toBeInTheDocument();
	});

	it("renders habitat badge", () => {
		render(<MonsterBadges traits={traits} variant="detail" />);
		expect(screen.getByText(traits.habitat)).toBeInTheDocument();
	});

	it("renders personality badge — only present in detail mode", () => {
		render(<MonsterBadges traits={traits} variant="detail" />);
		expect(screen.getByText(traits.personality)).toBeInTheDocument();
	});

	it("renders colour palette badge — only present in detail mode", () => {
		render(<MonsterBadges traits={traits} variant="detail" />);
		expect(screen.getByText(traits.color_palette)).toBeInTheDocument();
	});

	it("sets title attributes on all four badges in detail mode", () => {
		render(<MonsterBadges traits={traits} variant="detail" />);
		expect(screen.getByTitle(traits.element)).toBeInTheDocument();
		expect(screen.getByTitle(traits.habitat)).toBeInTheDocument();
		expect(screen.getByTitle(traits.personality)).toBeInTheDocument();
		expect(screen.getByTitle(traits.color_palette)).toBeInTheDocument();
	});

	it("renders exactly 4 badges in detail mode", () => {
		const { container } = render(
			<MonsterBadges traits={traits} variant="detail" />,
		);
		const titled = container.querySelectorAll("[title]");
		expect(titled).toHaveLength(4);
	});

	it("forwards a custom className onto the wrapper div in detail mode", () => {
		const { container } = render(
			<MonsterBadges
				traits={traits}
				variant="detail"
				className="detail-class-abc"
			/>,
		);
		expect(container.firstElementChild).toHaveClass("detail-class-abc");
	});
});
