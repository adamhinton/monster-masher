// _______________
// Full trait description list for the monster detail/dossier view.
// Uses semantic <dl>/<dt>/<dd> — not div soup.
// All values are treated as free-form strings. No enum assumptions.
// _______________

import { Separator } from "@/components/ui/separator";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { cn } from "@/lib/utils";

export interface MonsterTraitListProps {
	/** The monster's traits object. */
	traits: Monster["traits"];
	/** Optional flavor text for the monster. */
	flavorText?: string;
	/** Extra Tailwind classes on the outer element. */
	className?: string;
}

/** A single label + value row inside the trait list. */
function TraitRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-0.5 py-2.5">
			<dt className="self-start text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</dt>
			<dd className="wrap-break-word text-sm text-foreground">{value}</dd>
		</div>
	);
}

export function MonsterTraitList({
	traits,
	flavorText,
	className,
}: MonsterTraitListProps) {
	return (
		<section className={cn("space-y-0", className)} aria-label="Monster traits">
			<dl className="divide-y divide-border/60">
				<TraitRow label="Element" value={traits.element} />
				<TraitRow label="Habitat" value={traits.habitat} />
				<TraitRow label="Personality" value={traits.personality} />
				<TraitRow label="Colour palette" value={traits.color_palette} />
			</dl>

			{flavorText && (
				<>
					<Separator className="my-4" />
					<p className="wrap-break-word text-sm italic text-muted-foreground">
						&ldquo;{flavorText}&rdquo;
					</p>
				</>
			)}
		</section>
	);
}
