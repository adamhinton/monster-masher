import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GalleryPagination } from "@/components/monsterGallery/GalleryPagination";

describe("GalleryPagination — visibility", () => {
	it("renders without errors", () => {
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={2}
				onPageChange={vi.fn()}
			/>,
		);
	});
	it("does not render when only one page exists", () => {
		const { container } = render(
			<GalleryPagination
				currentPage={1}
				totalPages={1}
				onPageChange={vi.fn()}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders when there are two or more pages", () => {
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={2}
				onPageChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", { name: /previous/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
	});
});

describe("GalleryPagination — first page", () => {
	it("disables the Previous button on page 1", () => {
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={3}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
	});

	it("enables the Next button on page 1", () => {
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={3}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
	});

	it("calls onPageChange with 2 when Next is clicked from page 1", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={3}
				onPageChange={onPageChange}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /next/i }));
		expect(onPageChange).toHaveBeenCalledWith(2);
	});
});

describe("GalleryPagination — last page", () => {
	it("disables the Next button on the last page", () => {
		render(
			<GalleryPagination
				currentPage={5}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
	});

	it("enables the Previous button on the last page", () => {
		render(
			<GalleryPagination
				currentPage={5}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
	});

	it("calls onPageChange with the previous page number when Previous is clicked on last page", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<GalleryPagination
				currentPage={5}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /previous/i }));
		expect(onPageChange).toHaveBeenCalledWith(4);
	});
});

describe("GalleryPagination — middle page", () => {
	it("enables both Previous and Next on a middle page", () => {
		render(
			<GalleryPagination
				currentPage={2}
				totalPages={4}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
		expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
	});

	it("calls onPageChange with page + 1 when Next is clicked from middle", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<GalleryPagination
				currentPage={3}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /next/i }));
		expect(onPageChange).toHaveBeenCalledWith(4);
	});

	it("calls onPageChange with page - 1 when Previous is clicked from middle", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<GalleryPagination
				currentPage={3}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /previous/i }));
		expect(onPageChange).toHaveBeenCalledWith(2);
	});
});

describe("GalleryPagination — page display text", () => {
	it("shows 'Page X of Y' text with the current and total page", () => {
		render(
			<GalleryPagination
				currentPage={2}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
	});

	it("shows 'Page 1 of 2' on the first of two pages", () => {
		render(
			<GalleryPagination
				currentPage={1}
				totalPages={2}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
	});

	it("page display has aria-live='polite' to announce page changes to screen readers", () => {
		const { container } = render(
			<GalleryPagination
				currentPage={1}
				totalPages={2}
				onPageChange={vi.fn()}
			/>,
		);
		const liveRegion = container.querySelector("[aria-live='polite']");
		expect(liveRegion).toBeInTheDocument();
		expect(liveRegion).toHaveTextContent(/page 1 of 2/i);
	});

	it("does not call onPageChange until a button is actually clicked", () => {
		const onPageChange = vi.fn();
		render(
			<GalleryPagination
				currentPage={2}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		expect(onPageChange).not.toHaveBeenCalled();
	});
});
