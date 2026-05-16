import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterCardSkeleton } from "@/components/monsterGallery/galleryHelperComponents/MonsterCardSkeleton";

describe("MonsterCardSkeleton", () => {
	it("renders without crashing", () => {
		render(<MonsterCardSkeleton />);
	});

	it("has aria-hidden set to true — purely decorative loading placeholder", () => {
		const { container } = render(<MonsterCardSkeleton />);
		const article = container.querySelector("article");
		expect(article).toHaveAttribute("aria-hidden", "true");
	});

	it("renders as an article element approximating the MonsterCard shape", () => {
		const { container } = render(<MonsterCardSkeleton />);
		expect(container.querySelector("article")).toBeInTheDocument();
	});

	it("renders multiple skeleton blocks representing image, name, chips, and action row", () => {
		const { container } = render(<MonsterCardSkeleton />);
		// The component renders at least 6 Skeleton elements
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(6);
	});

	it("is not interactive — no buttons or links present", () => {
		render(<MonsterCardSkeleton />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
