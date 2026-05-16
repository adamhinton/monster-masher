// ________________
// Responsive card grid for the /gallery page.
// Accepts a validated monsters array and renders one MonsterCard per item.
// ________________

"use client";

import { useState } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GalleryMode, MonsterCard } from "./monsterCard/MonsterCard";

interface GalleryGridProps {
	monsters: Monster[];
}

/**
 * Renders the user's saved monsters in a responsive grid.
 *
 * Layout: 1 col → 2 col (sm) → 3 col (lg) → 4 col (xl).
 * The grid uses a `ul`/`li` structure for semantic correctness.
 *
 * Owns the view-mode toggle so that no mode prop needs to be threaded
 * through the gallery page.
 */
export function GalleryGrid({ monsters }: GalleryGridProps) {
	// Toggle between "detailed" and "image-only" card layouts. Defaults to "detailed".
	const [mode, setMode] = useState<GalleryMode>("detailed");

	return (
		<div>
			{/* ── View-mode toggle (detailed or image-only) ─────────────────────────────────────── */}
			<div className="mb-6 flex items-center justify-start">
				<ToggleGroup
					value={[mode]}
					onValueChange={(vals: string[]) => {
						if (vals.length > 0) setMode(vals[0] as GalleryMode);
					}}
					variant="outline"
					size="sm"
					spacing={0}
					aria-label="Gallery view mode"
				>
					<ToggleGroupItem value="detailed" aria-label="Detailed view">
						<Rows3 />
						Detailed
					</ToggleGroupItem>
					<ToggleGroupItem value="image-only" aria-label="Image-only view">
						<LayoutGrid />
						Images
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{/* ── Grid ──────────────────────────────────────────────────── */}
			<ul
				aria-label="Saved monsters"
				className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			>
				{monsters.map((monster) => (
					<li key={monster.id} className="flex justify-center">
						<MonsterCard monster={monster} mode={mode} />
					</li>
				))}
			</ul>
		</div>
	);
}
