// _______________
// Reusable image frame for a monster — used by MonsterCard, detail view, and
// anywhere else a monster image needs to be displayed.
// _______________

"use client";

import { Ghost } from "lucide-react";
import { useState } from "react";

import type { MonsterImage } from "@/lib/api/schemas/monster/MonsterImageSchema";
import { cn } from "@/lib/utils";

/**
 * Side length in px for each variant. The frame is always perfectly square.
 * Adjust here to resize all MonsterImageFrame instances globally.
 */
const SIDE_PX = {
	compact: 80,
	card: 240,
	detail: 480,
} as const;

type Variant = "card" | "detail" | "compact";

export interface MonsterImageFrameProps {
	/** MonsterImage from the API. Pass null when no image has been generated yet. */
	image: MonsterImage | null;
	/** Controls size and decoration level of the frame. */
	variant: Variant;
	/** Accessible alt text for the image. Pass an empty string only for truly decorative images. */
	altText: string;
	/** Extra Tailwind classes applied to the outer figure element. */
	className?: string;
}

/**
 * Subtle L-shaped decorative marks in each corner to evoke a specimen display card.
 * Hidden from assistive technology; purely decorative.
 */
function CornerMarkers() {
	const base = "pointer-events-none absolute h-4 w-4 border-primary/25";
	return (
		<>
			<span
				aria-hidden="true"
				className={cn(base, "top-3 left-3 rounded-tl border-t-2 border-l-2")}
			/>
			<span
				aria-hidden="true"
				className={cn(base, "top-3 right-3 rounded-tr border-t-2 border-r-2")}
			/>
			<span
				aria-hidden="true"
				className={cn(base, "bottom-3 left-3 rounded-bl border-b-2 border-l-2")}
			/>
			<span
				aria-hidden="true"
				className={cn(
					base,
					"bottom-3 right-3 rounded-br border-b-2 border-r-2",
				)}
			/>
		</>
	);
}

interface PlaceholderProps {
	variant: Variant;
	/** Set to true once the real image is fully loaded to remove from the a11y tree. */
	"aria-hidden"?: boolean;
}

/**
 * Ghost icon placeholder shown when the image is missing, loading, or broken.
 */
function ImagePlaceholder({
	variant,
	"aria-hidden": ariaHidden,
}: PlaceholderProps) {
	const iconSize = variant === "compact" ? 20 : variant === "card" ? 36 : 56;

	return (
		<div
			role="img"
			aria-label="Monster image — not yet available"
			aria-hidden={ariaHidden}
			className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted"
		>
			<Ghost
				size={iconSize}
				strokeWidth={1.2}
				className="text-muted-foreground/40"
				aria-hidden="true"
			/>
			{variant !== "compact" && (
				<span className="select-none px-3 text-center text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/35">
					Image pending
				</span>
			)}
		</div>
	);
}

export function MonsterImageFrame({
	image,
	variant,
	altText: alt,
	className,
}: MonsterImageFrameProps) {
	const [hasError, setHasError] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);

	/** Pixel side length derived from the variant constant. */
	const side = SIDE_PX[variant];

	/** Null when no image has been generated yet, or when the URL is explicitly null. */
	const imageUrl = image?.public_image_url ?? null;

	/** True only once a real URL is present, the img has fired onLoad, and no error occurred. */
	const imageVisible = imageUrl !== null && !hasError && isLoaded;

	return (
		<figure
			className={cn(
				"relative shrink-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm",
				className,
			)}
			style={{
				width: side,
				height: side,
				boxShadow:
					"0 0 48px var(--brand-primary-glow), 0 2px 16px oklch(0 0 0 / 0.06)",
			}}
		>
			<ImagePlaceholder variant={variant} aria-hidden={imageVisible} />

			{/* TODO: switch to next/image once remotePatterns is configured in next.config.ts */}
			{imageUrl !== null && !hasError && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={imageUrl}
					alt={alt}
					decoding="async"
					className={cn(
						"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
						imageVisible ? "opacity-100" : "opacity-0",
					)}
					onLoad={() => setIsLoaded(true)}
					onError={() => setHasError(true)}
				/>
			)}

			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 rounded-3xl"
				style={{ boxShadow: "inset 0 0 40px var(--brand-accent-glow)" }}
			/>

			{variant !== "compact" && <CornerMarkers />}
		</figure>
	);
}
