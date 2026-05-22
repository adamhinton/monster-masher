// _______________
// Individual monster card — used in the /gallery grid.
// Image-first layout: full-bleed image at top, name + badges + flavor text below,
// date and "Details" link in the footer. Secondary actions live in a DropdownMenu.
// _______________

"use client";

import { Eye, ImageOff, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { Route } from "next";
import { useId } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { formatDate } from "@/lib/date/formatDate";
import { cn } from "@/lib/utils";
import { MonsterBadges } from "./helperComponents/MonsterBadges";
import { MonsterImageFrame } from "./helperComponents/MonsterImageFrame";
import { PfpDownloadButton } from "./helperComponents/PfpDownloadButton";

export type GalleryMode = "detailed" | "image-only";

export interface MonsterCardProps {
	/** The monster to display. */
	monster: Monster;
	/**
	 * Controls how much detail the card shows.
	 * - `"detailed"` — full card: image, name, trait badges, flavor text, date, and action menu (default).
	 * - `"image-only"` — square image frame only; monster name revealed as a slide-up overlay on hover.
	 */
	mode?: GalleryMode;
	/** Called when the user selects "Edit" from the action menu. Omit to disable the item. */
	onEdit?: () => void;
	/** Called when the user selects "Delete" from the action menu. Omit to disable the item. */
	onDelete?: () => void;
}

/**
 * Collectible specimen card for a single monster.
 * Fixed 240 px width to match the MonsterImageFrame card variant.
 */
export function MonsterCard({
	monster,
	mode = "detailed",
	// onEdit,
	onDelete,
}: MonsterCardProps) {
	const headingId = useId();

	/** Descriptive alt text built from the monster's element and name. */
	const altText = `${monster.traits.element} monster named ${monster.display_name}`;

	if (mode === "image-only") {
		return (
			<article
				aria-labelledby={headingId}
				className={cn(
					"group/card relative w-60 overflow-hidden rounded-3xl border border-border/60 bg-card",
					"transition-all duration-200 hover:-translate-y-1",
				)}
				style={{
					boxShadow:
						"0 0 32px var(--brand-primary-glow), 0 1px 6px oklch(0 0 0 / 0.05)",
				}}
			>
				<MonsterImageFrame
					image={monster.image}
					variant="card"
					altText={altText}
					className="rounded-none border-0"
				/>
				{/* Always show a hover overlay to navigate to the detail page */}
				<Link
					href={`/gallery/${monster.id}`}
					className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 hover:opacity-100"
					aria-label={`Details for ${monster.display_name}`}
				>
					{monster.image === null ? (
						<ImageOff className="size-6 text-white" aria-hidden="true" />
					) : (
						<Eye className="size-6 text-white" aria-hidden="true" />
					)}
				</Link>
				{/* Name overlay — slides up from bottom on hover */}
				<div className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/80 to-transparent px-3 pb-3 pt-10 transition-transform duration-200 group-hover/card:translate-y-0">
					<h3
						id={headingId}
						className="truncate text-sm font-semibold text-white"
					>
						{monster.display_name}
					</h3>
				</div>
			</article>
		);
	}

	return (
		<article
			aria-labelledby={headingId}
			className={cn(
				"group/card flex w-60 flex-col overflow-hidden rounded-3xl border border-border/60 bg-card text-card-foreground",
				"transition-all duration-200 hover:-translate-y-1",
			)}
			style={{
				boxShadow:
					"0 0 32px var(--brand-primary-glow), 0 1px 6px oklch(0 0 0 / 0.05)",
			}}
		>
			{/* Monster image — full-bleed at the top; card provides outer shape */}
			<MonsterImageFrame
				image={monster.image}
				variant="card"
				altText={altText}
				className="rounded-none border-0"
			/>

			{/* Card body */}
			<div className="flex flex-1 flex-col gap-2.5 px-4 py-3">
				{/* Name heading + overflow action menu */}
				<header className="flex items-start justify-between gap-2">
					<h3
						id={headingId}
						title={monster.display_name}
						className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-card-foreground"
					>
						{monster.display_name}
					</h3>

					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon-sm" }),
								"-mr-1 shrink-0 text-muted-foreground",
							)}
							aria-label={`Actions for ${monster.display_name}`}
						>
							<MoreHorizontal size={15} />
						</DropdownMenuTrigger>

						<DropdownMenuContent align="end">
							<DropdownMenuItem
								variant="destructive"
								onClick={onDelete}
								disabled={!onDelete}
							>
								<Trash2 />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</header>

				{/* Element + habitat trait chips */}
				<MonsterBadges variant="card" traits={monster.traits} />

				{/* Regenerate image — shown when monster has no image (placeholder) */}
				{monster.image === null && (
					<Link
						href={`/gallery/${monster.id}`}
						className={cn(
							buttonVariants({ variant: "secondary", size: "sm" }),
							"w-full justify-center gap-1.5",
						)}
					>
						<RefreshCw size={13} aria-hidden="true" />
						Regenerate image
					</Link>
				)}

				{/* Flavor text — 2-line clamp; muted fallback when absent */}
				<p
					className={cn(
						"line-clamp-2 text-xs leading-relaxed",
						monster.flavor_text
							? "text-muted-foreground"
							: "italic text-muted-foreground/45",
					)}
				>
					{monster.flavor_text ?? "No lore recorded yet."}
				</p>

				{/* Footer: creation date + action icons + details link */}
				<footer className="mt-auto flex items-center justify-between gap-2 pt-0.5">
					<time
						dateTime={monster.created_at}
						className="text-[0.65rem] tabular-nums text-muted-foreground/50"
					>
						{formatDate(monster.created_at)}
					</time>

					<div className="flex items-center gap-1">
						<PfpDownloadButton monster={monster} variant="icon" />
						<Link
							href={`/gallery/${monster.id}` as unknown as Route}
							className={cn(
								buttonVariants({ variant: "secondary", size: "sm" }),
							)}
						>
							<Eye size={14} />
							Details
						</Link>
					</div>
				</footer>
			</div>
		</article>
	);
}
