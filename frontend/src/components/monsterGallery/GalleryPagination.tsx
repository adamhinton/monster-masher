// _____________
// UI for pagination in /gallery/page.tsx. Renders "Previous" and "Next" buttons and the current page number.
// Only shows a speciic number of monsters per page.
// _____________

import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
} from "@/components/ui/pagination";

interface GalleryPaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

/**UI helper for /gallery monster pagination */
export function GalleryPagination({
	currentPage,
	totalPages,
	onPageChange,
}: GalleryPaginationProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<Pagination aria-label="Gallery pagination" className="m-8">
			<PaginationContent className="flex-wrap justify-center gap-2">
				<PaginationItem>
					<Button
						variant="outline"
						onClick={() => onPageChange(currentPage - 1)}
						disabled={currentPage === 1}
					>
						Previous
					</Button>
				</PaginationItem>
				<PaginationItem>
					<p
						aria-live="polite"
						className="min-w-28 px-2 text-center text-sm text-muted-foreground"
					>
						Page {currentPage} of {totalPages}
					</p>
				</PaginationItem>
				<PaginationItem>
					<Button
						variant="outline"
						onClick={() => onPageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
