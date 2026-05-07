import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
			<span className="text-6xl" aria-hidden="true">
				👻
			</span>
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					404 — Lost in the Monster Lab
				</h1>
				<p className="max-w-sm text-muted-foreground">
					This page escaped. Or it never existed. Either way, it&rsquo;s gone.
				</p>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row">
				<Link href="/" className={buttonVariants()}>
					Go home
				</Link>
				<Link href="/create" className={buttonVariants({ variant: "outline" })}>
					Create a monster
				</Link>
			</div>
		</div>
	);
}
