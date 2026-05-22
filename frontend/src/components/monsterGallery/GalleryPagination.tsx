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
	totalMonsters?: number;
	onPageChange: (page: number) => void;
}

/**UI helper for /gallery monster pagination */
export function GalleryPagination({
	currentPage,
	totalPages,
	totalMonsters = 0,
	onPageChange,
}: GalleryPaginationProps) {
	const monsterLabel = totalMonsters === 1 ? "monster" : "monsters";

	return (
		<Pagination aria-label="Gallery pagination" className="m-8">
			<PaginationContent className="flex-wrap justify-center gap-2">
				{totalPages > 1 && (
					<PaginationItem>
						<Button
							variant="outline"
							onClick={() => onPageChange(currentPage - 1)}
							disabled={currentPage === 1}
						>
							Previous
						</Button>
					</PaginationItem>
				)}
				<PaginationItem>
					<p
						aria-live="polite"
						className="min-w-28 px-2 text-center text-sm text-muted-foreground"
					>
						{totalMonsters} {monsterLabel} saved · Page {currentPage} of{" "}
						{totalPages}
					</p>
				</PaginationItem>
				{totalPages > 1 && (
					<PaginationItem>
						<Button
							variant="outline"
							onClick={() => onPageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
						>
							Next
						</Button>
					</PaginationItem>
				)}
			</PaginationContent>
		</Pagination>
	);
}
