// ________________
// Responsive card grid for the /gallery page.
// Accepts a validated monsters array and renders one MonsterCard per item.
// ________________

import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { MonsterCard } from "./monsterCard/MonsterCard";

interface GalleryGridProps {
	monsters: Monster[];
}

/**
 * Renders the user's saved monsters in a responsive grid.
 *
 * Layout: 1 col → 2 col (sm) → 3 col (lg) → 4 col (xl).
 * The grid uses a `ul`/`li` structure for semantic correctness.
 */
export function GalleryGrid({ monsters }: GalleryGridProps) {
	return (
		<ul
			aria-label="Saved monsters"
			className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			{monsters.map((monster) => (
				<li key={monster.id} className="flex justify-center">
					<MonsterCard monster={monster} />
				</li>
			))}
		</ul>
	);
}

