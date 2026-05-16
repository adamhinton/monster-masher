// _______________
// Specimen metadata card for the monster detail page at /gallery/[monsterID].
// Shows created date, updated date, and a short specimen ID derived from the UUID.
////
// Used by: src/components/monsterGallery/SingleMonsterDetailPageComponents/MonsterDetailView.tsx
// _______________

import { Card, CardContent } from "@/components/ui/card";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { formatDate } from "@/lib/date/formatDate";

interface MonsterSpecimenMetaCardProps {
	monster: Monster;
}

/** A single label/value row inside the metadata description list. */
function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[8rem_1fr] gap-x-3 py-2">
			<dt className="self-start text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</dt>
			<dd className="wrap-break-word text-sm text-foreground">{value}</dd>
		</div>
	);
}

/**
 * Card showing immutable specimen metadata: created date, updated date,
 * and a short display ID (last 8 chars of the UUID, uppercased).
 */
export function MonsterSpecimenMetaCard({
	monster,
}: MonsterSpecimenMetaCardProps) {
	const shortId = monster.id.slice(-8).toUpperCase();

	return (
		<Card>
			<CardContent className="pt-4">
				<dl className="divide-y divide-border/60">
					<MetaRow label="Created" value={formatDate(monster.created_at)} />
					<MetaRow label="Updated" value={formatDate(monster.updated_at)} />
					<MetaRow label="Specimen ID" value={`#${shortId}`} />
				</dl>
			</CardContent>
		</Card>
	);
}
