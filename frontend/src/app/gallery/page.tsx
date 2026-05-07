// ______________
// Here the user can see their created monsters in a gallery format. This page is currently a placeholder and will be fleshed out as the project progresses.
// ______________

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import Link from "next/link";

export const metadata = { title: "Monster Gallery" };

/**
 * Displays the user's created Monsters.
 *
 * Just a placeholder for now; will be fleshed out as the project progresses.
 */
export default function GalleryPage() {
	return (
		<PageContainer size="marketing">
			<div className="flex flex-col items-start gap-6 py-16">
				<Badge variant="secondary">Coming soon</Badge>
				<h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
				<p className="text-muted-foreground">
					Your monster collection will appear here. Create one first!
				</p>
				<Link href="/" className={buttonVariants({ variant: "outline" })}>
					← Back home
				</Link>
			</div>
		</PageContainer>
	);
}
