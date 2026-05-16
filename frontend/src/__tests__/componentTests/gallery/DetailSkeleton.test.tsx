import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailSkeleton } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/DetailSkeleton";

describe("DetailSkeleton", () => {
	it("renders without crashing", () => {
		render(<DetailSkeleton />);
	});

	it("renders multiple skeleton placeholder blocks", () => {
		const { container } = render(<DetailSkeleton />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(6);
	});

	it("renders no interactive elements — it is a non-interactive loading state", () => {
		render(<DetailSkeleton />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
