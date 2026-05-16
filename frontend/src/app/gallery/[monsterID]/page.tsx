// ______________
// Detail page for a specific monster in the gallery, at route /gallery/[monsterID].
// Reads monster data from Redux auth state; falls back to a not-found state when
// the ID is missing or doesn't belong to the current user.
//
// Sub-components live in:
//   src/components/monsterGallery/SingleMonsterDetailPageComponents/
// ______________

"use client";

import { useParams } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { DetailSkeleton } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/DetailSkeleton";
import { NotFoundState } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/NotFoundState";
import { MonsterDetailView } from "@/components/monsterGallery/SingleMonsterDetailPageComponents/MonsterDetailView";

export default function MonsterDetailPage() {
	const params = useParams();
	const rawId = params.monsterID;
	const monsterId = typeof rawId === "string" ? rawId : null;

	const authState = useAppSelector((state) => state.auth);

	if (authState.status === "loading") {
		return <DetailSkeleton />;
	}

	if (authState.status === "anonymous" || monsterId === null) {
		return <NotFoundState />;
	}

	const monster = authState.user.monsters.find((m) => m.id === monsterId);

	if (!monster) {
		return <NotFoundState />;
	}

	return <MonsterDetailView monster={monster} />;
}
