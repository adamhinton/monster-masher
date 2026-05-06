import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const techStack = [
	"Next.js",
	"Django",
	"Supabase",
	"TypeScript",
	"ShadCN UI",
] as const;

export function Footer() {
	return (
		<footer className="w-full border-t border-border/60 bg-background">
			<Separator />
			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
				<div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
					{/* Brand */}
					<div className="flex flex-col gap-1">
						<span className="font-semibold text-foreground">
							🧌 Monster Masher
						</span>
						<p className="max-w-xs text-sm text-muted-foreground">
							Create cute, original AI-generated monsters. Save them. Cherish
							them.
						</p>
					</div>

					{/* Links — uncomment and fill in once repo is public */}
					<div className="flex flex-col gap-2 text-sm text-muted-foreground">
						{/* <Link
							href="https://github.com/YOUR_USERNAME/monster-masher"
							target="_blank"
							rel="noopener noreferrer"
							className="transition-colors hover:text-foreground"
						>
							GitHub →
						</Link> */}
					</div>
				</div>

				{/* Tech stack */}
				<div className="mt-6 flex flex-wrap gap-2">
					{techStack.map((tech) => (
						<Badge
							key={tech}
							variant="secondary"
							className="text-xs font-normal"
						>
							{tech}
						</Badge>
					))}
				</div>

				<p className="mt-6 text-xs text-muted-foreground">
					A portfolio project. Not affiliated with any game franchise.
				</p>
			</div>
		</footer>
	);
}
