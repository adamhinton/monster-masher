// _______________
// Page header for /gallery — title, description, and Create CTA.
// Pure presentational; safe to use in a server component.
// _______________

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/**
 * Hero header for the gallery page.
 * Renders the page title, a short description, and a CTA to /create.
 */
export function GalleryHeader() {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="flex flex-col gap-2">
				<h1
					id="gallery-title"
					className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
				>
					My Monster Gallery
				</h1>
				<p className="max-w-prose text-base text-muted-foreground">
					Browse your saved monsters, inspect their traits, and keep your
					favourites ready for later.
				</p>
			</div>
			<Link
				href={"/create"}
				className={buttonVariants({
					size: "lg",
					className: "shrink-0 self-start sm:self-auto",
				})}
			>
				<Sparkles aria-hidden="true" className="size-4" />
				Create monster
			</Link>
		</header>
	);
}
