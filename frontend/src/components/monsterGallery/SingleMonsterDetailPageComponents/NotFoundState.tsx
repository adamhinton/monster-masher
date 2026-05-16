// _______________
// "Not found" state for the monster detail page at /gallery/[monsterID].
// Shown when the monster ID does not match any monster in the authenticated
// user's Redux state, or when the user is not authenticated.
//
// Intentionally vague copy — does not reveal whether the monster belongs to
// another user (treats 403 and 404 the same way in the UI).
//
// Used by: src/app/gallery/[monsterID]/page.tsx
// _______________

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Full-page not-found state for the monster detail route.
 * Renders a centred message and a Back to gallery CTA.
 */
export function NotFoundState() {
	return (
		<PageContainer size="detail">
			<main className="flex flex-col items-center gap-6 py-24 text-center">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold text-foreground">
						Monster not found
					</h1>
					<p className="max-w-sm text-sm text-muted-foreground">
						Monster not found. It may have been deleted or may not belong to
						this account.
					</p>
				</div>
				<Link
					href="/gallery"
					className={buttonVariants({ variant: "secondary" })}
				>
					<ArrowLeft aria-hidden="true" />
					Back to gallery
				</Link>
			</main>
		</PageContainer>
	);
}
