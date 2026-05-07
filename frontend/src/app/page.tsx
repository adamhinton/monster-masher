import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Home() {
	return (
		<PageContainer size="marketing">
			<section className="flex flex-col items-start gap-6 py-16 sm:py-24">
				<Badge variant="secondary" className="text-xs">
					🚧 Under construction
				</Badge>

				<div className="flex flex-col gap-4">
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
						Monster Masher
					</h1>
					<p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
						Create cute, original AI-generated monsters and save them to your
						personal gallery. Coming soon.
					</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Link href="/create" className={buttonVariants({ size: "lg" })}>
						Create a monster
					</Link>
					<Link
						href="/gallery"
						className={buttonVariants({ variant: "outline", size: "lg" })}
					>
						View gallery
					</Link>
				</div>
			</section>
		</PageContainer>
	);
}
