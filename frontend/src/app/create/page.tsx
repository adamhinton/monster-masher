import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import Link from "next/link";

export const metadata = { title: "Create a Monster" };

export default function CreatePage() {
	return (
		<PageContainer size="form">
			<div className="flex flex-col items-start gap-6 py-16">
				<Badge variant="secondary">Coming soon</Badge>
				<h1 className="text-3xl font-semibold tracking-tight">
					Create a Monster
				</h1>
				<p className="text-muted-foreground">
					The monster creation form is being built. Check back soon.
				</p>
				<Link href="/" className={buttonVariants({ variant: "outline" })}>
					← Back home
				</Link>
			</div>
		</PageContainer>
	);
}
