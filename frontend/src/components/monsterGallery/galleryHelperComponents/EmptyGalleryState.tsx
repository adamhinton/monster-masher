// _______________
// Shown in /gallery when the user has no saved monsters yet.
// Pure presentational; safe to use in a server component.
// _______________

import Link from "next/link";
import { Ghost } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Full-section empty state for the gallery.
 * Encourages the user to create their first monster.
 */
export function EmptyGalleryState() {
	return (
		<section
			aria-label="No monsters yet"
			className="flex flex-col items-center gap-6 py-24 text-center"
		>
			<Ghost
				aria-hidden="true"
				className="size-16 text-muted-foreground/40"
				strokeWidth={1.25}
			/>
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold text-foreground">
					No monsters here yet
				</h2>
				<p className="max-w-sm text-sm text-muted-foreground">
					Your creature collection is empty. Create your first monster and it
					will appear here.
				</p>
			</div>
			<Link href={"/create"} className={buttonVariants()}>
				Create your first monster
			</Link>
		</section>
	);
}
