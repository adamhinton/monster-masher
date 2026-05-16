import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterSpecimenMetaCard } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/MonsterSpecimenMetaCard";
import {
	validMonster,
	validMonsterWithImage,
} from "@/__tests__/__testUtils__/fixtures";

// validMonster.id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
// last 8 chars = "aaaaaaaa" → uppercased → "#AAAAAAAA"
// dates = "2026-01-01T00:00:00.000Z" → formatDate → "January 1, 2026"

describe("MonsterSpecimenMetaCard", () => {
	it("renders without crashing", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
	});
	it("renders a Card element", () => {
		const { container } = render(
			<MonsterSpecimenMetaCard monster={validMonster} />,
		);
		expect(container.firstElementChild).toBeInTheDocument();
	});

	it("renders the Created label", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		expect(screen.getByText("Created")).toBeInTheDocument();
	});

	it("renders the Updated label", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		expect(screen.getByText("Updated")).toBeInTheDocument();
	});

	it("renders the Specimen ID label", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		expect(screen.getByText("Specimen ID")).toBeInTheDocument();
	});

	it("shows the created date formatted as 'Month D, YYYY'", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		// Both created_at and updated_at are the same date in validMonster, so two matches are expected
		expect(screen.getAllByText("January 1, 2026")).toHaveLength(2);
	});

	it("shows the specimen ID as # + last 8 chars of UUID uppercased", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		expect(screen.getByText("#AAAAAAAA")).toBeInTheDocument();
	});

	it("derives the specimen ID from the correct end of the UUID", () => {
		// validMonsterWithImage has id = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
		// last 8 chars = "bbbbbbbb" → "#BBBBBBBB"
		render(<MonsterSpecimenMetaCard monster={validMonsterWithImage} />);
		expect(screen.getByText("#BBBBBBBB")).toBeInTheDocument();
	});

	it("uses a semantic <dl> element for the metadata rows", () => {
		const { container } = render(
			<MonsterSpecimenMetaCard monster={validMonster} />,
		);
		expect(container.querySelector("dl")).toBeInTheDocument();
	});

	it("each label is a <dt> and each value is a <dd>", () => {
		const { container } = render(
			<MonsterSpecimenMetaCard monster={validMonster} />,
		);
		const dl = container.querySelector("dl")!;
		const dts = dl.querySelectorAll("dt");
		const dds = dl.querySelectorAll("dd");
		expect(dts).toHaveLength(3);
		expect(dds).toHaveLength(3);
	});

	it("Created dt and dd are paired correctly", () => {
		const { container } = render(
			<MonsterSpecimenMetaCard monster={validMonster} />,
		);
		const dl = container.querySelector("dl")!;
		const dts = dl.querySelectorAll("dt");
		const dds = dl.querySelectorAll("dd");
		expect(dts[0]).toHaveTextContent("Created");
		expect(dds[0]).toHaveTextContent("January 1, 2026");
	});

	it("Specimen ID dt and dd are paired correctly", () => {
		const { container } = render(
			<MonsterSpecimenMetaCard monster={validMonster} />,
		);
		const dl = container.querySelector("dl")!;
		const dts = dl.querySelectorAll("dt");
		const dds = dl.querySelectorAll("dd");
		expect(dts[2]).toHaveTextContent("Specimen ID");
		expect(dds[2]).toHaveTextContent("#AAAAAAAA");
	});

	it("renders within correct section for screen reader", () => {
		render(<MonsterSpecimenMetaCard monster={validMonster} />);
		const idCell = screen.getByText("#AAAAAAAA");
		// should be inside a dd element
		expect(idCell.tagName.toLowerCase()).toBe("dd");
	});
});
