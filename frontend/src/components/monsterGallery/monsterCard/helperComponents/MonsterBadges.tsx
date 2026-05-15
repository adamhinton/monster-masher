// _______________
// Badge strip for a monster's traits — used on MonsterCard.
// Shows element (primary) and habitat (secondary). Personality is omitted from
// card view to keep the card clean; it appears in MonsterTraitList on the detail page.
// _______________

import { Badge } from "@/components/ui/badge";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { cn } from "@/lib/utils";

export interface MonsterBadgesProps {
	/** The monster's traits object. */
	traits: Monster["traits"];
	/**
	 * "card" — compact, one line, truncates long values.
	 * "detail" — shows all four traits, full wrapping values.
	 */
	variant: "card" | "detail";
	/** Extra Tailwind classes on the wrapping element. */
	className?: string;
}

/**
 * Monster traits display
 *
 * In "card" variant, shows element and habitat as badges. Truncates with ellipsis if they overflow.
 * In "detail" variant, shows all four traits as badges, wrapping as needed with no truncation.
 *
 * No assumptions are made about the content of the traits; they are treated as free-form strings.
 *
 * The title attribute on each badge provides a tooltip with the full text for accessibility and to mitigate truncation.
 */
export function MonsterBadges({
	traits,
	variant,
	className,
}: MonsterBadgesProps) {
	if (variant === "card") {
		return (
			<div className={cn("flex min-w-0 flex-wrap gap-1.5", className)}>
				{/* Element is the lead badge — always shown */}
				<Badge
					variant="secondary"
					className="max-w-40 truncate justify-start text-left"
					title={traits.element}
				>
					{traits.element}
				</Badge>

				{/* Habitat shown when it fits; truncated rather than dropped */}
				<Badge
					variant="outline"
					className="max-w-40 truncate justify-start text-left"
					title={traits.habitat}
				>
					{traits.habitat}
				</Badge>
			</div>
		);
	}

	// Detail variant — all four traits, no truncation
	return (
		<div className={cn("flex flex-wrap gap-2", className)}>
			<Badge variant="secondary" title={traits.element}>
				{traits.element}
			</Badge>
			<Badge variant="outline" title={traits.habitat}>
				{traits.habitat}
			</Badge>
			<Badge variant="outline" title={traits.personality}>
				{traits.personality}
			</Badge>
			<Badge variant="outline" title={traits.color_palette}>
				{traits.color_palette}
			</Badge>
		</div>
	);
}
