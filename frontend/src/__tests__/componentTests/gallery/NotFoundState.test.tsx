import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotFoundState } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/NotFoundState";

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

describe("NotFoundState", () => {
	it("renders without errors", () => {
		render(<NotFoundState />);
	});
	it("renders the Monster not found heading", () => {
		render(<NotFoundState />);
		expect(
			screen.getByRole("heading", { level: 1, name: /monster not found/i }),
		).toBeInTheDocument();
	});

	it("renders copy that does not leak ownership — mentions deleted or account without specifying which", () => {
		render(<NotFoundState />);
		expect(
			screen.getByText(
				/it may have been deleted or may not belong to this account/i,
			),
		).toBeInTheDocument();
	});

	it("renders a Back to gallery link pointing to /gallery", () => {
		render(<NotFoundState />);
		expect(
			screen.getByRole("link", { name: /back to gallery/i }),
		).toHaveAttribute("href", "/gallery");
	});

	it("does not render any edit, delete, or action buttons", () => {
		render(<NotFoundState />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
