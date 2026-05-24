// _______________
// Client component that renders a landing page example monster image.

// Heavily based on MonsterImageFrame.tsx. TODO stretch could probably just make this a MonsterImageFrame variant, but it's not a pressing issue.
//
// Responsibilities:
//   - Display the example monster's portrait in a square frame.
//   - Show an intentional fallback (monster name + initials) when the image fails.
//   - Capture a Sentry error event on image load failure (once per monster per
//     browser session — module-level Set prevents duplicate reports).
//   - Use next/image for automatic optimisation (remotePatterns must be configured).
//
// Keep the client boundary here. Do not promote parent layout components to
// "use client" just to use this component.
// _______________

"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { LandingExampleMonster } from "@/lib/landingPage/landingExampleData";
import {
	InsetGlowOverlay,
	MONSTER_FRAME_BASE_CLASS,
	MONSTER_FRAME_OUTER_SHADOW,
	MONSTER_FRAME_SIDE_PX,
} from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";

// ---------------------------------------------------------------------------
// Session-scoped dedup guard
// ---------------------------------------------------------------------------

/**
 * Tracks monster IDs for which a Sentry event has already been captured in
 * this browser page session. Prevents duplicate events when the same broken
 * image is re-rendered (e.g. hot-reload, React Strict Mode double-render).
 */
const reportedFailures = new Set<string>();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExampleMonsterImageProps {
	monster: LandingExampleMonster;
	/**
	 * Controls the rendered size of the square frame.
	 * - `"card"` — 240 px (gallery grid)
	 * - `"detail"` — 480 px (example detail page)
	 * @default "card"
	 */
	variant?: keyof typeof MONSTER_FRAME_SIDE_PX;
	/** Extra Tailwind classes applied to the outer figure element. */
	className?: string;
}

// ---------------------------------------------------------------------------
// Initials helper
// ---------------------------------------------------------------------------

/** Derives up to three initials from the monster's display name. */
function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.map((word) => word[0] ?? "")
		.join("")
		.toUpperCase()
		.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Square image frame for a landing page example monster.
 *
 * On network / load failure, shows an intentional fallback with the monster's
 * name and initials, and fires a single Sentry error event per monster per
 * browser session.
 */
export function ExampleMonsterImage({
	monster,
	variant = "card",
	className,
}: ExampleMonsterImageProps) {
	const [hasError, setHasError] = useState(false);
	const pathname = usePathname();
	const side = MONSTER_FRAME_SIDE_PX[variant];
	const initials = getInitials(monster.display_name);

	function handleError() {
		setHasError(true);

		// Fire once per monster per session — never spam Sentry.
		// I want to know immediately if any example images are broken, because it would really turn off users.
		if (!reportedFailures.has(monster.id)) {
			reportedFailures.add(monster.id);

			Sentry.captureMessage("Example monster image failed to load", {
				level: "error",
				tags: {
					feature: "landing-example-images",
					route: pathname,
					monsterId: monster.id,
				},
				contexts: {
					monster: {
						id: monster.id,
						name: monster.display_name,
						imageUrl: monster.image.public_image_url,
					},
				},
				fingerprint: ["example-monster-image-load-failure", monster.id],
			});
		}
	}

	return (
		<figure
			className={cn(MONSTER_FRAME_BASE_CLASS, className)}
			style={{
				width: side,
				height: side,
				boxShadow: MONSTER_FRAME_OUTER_SHADOW,
			}}
			aria-label={monster.alt_text}
		>
			{hasError ? (
				// Intentional fallback — preserve the square frame, show name + initials.
				<div
					role="img"
					aria-label={monster.alt_text}
					className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-4"
				>
					<span
						aria-hidden="true"
						className="text-3xl font-bold tracking-tight text-muted-foreground/50"
					>
						{initials}
					</span>
					<span className="select-none text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
						{monster.display_name}
					</span>
				</div>
			) : (
				<Image
					src={monster.image.public_image_url ?? ""}
					alt={monster.alt_text}
					fill
					sizes={`${side}px`}
					className="object-contain"
					onError={handleError}
				/>
			)}

			{/* Inset glow overlay — purely decorative */}
			<InsetGlowOverlay />
		</figure>
	);
}
