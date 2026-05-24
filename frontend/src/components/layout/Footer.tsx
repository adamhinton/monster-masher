// TODO fill this out when project is more defined

import Link from "next/link";
import { GitHubIcon, LinkedInIcon } from "@/components/icons/BrandIcons";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const techStack = [
	"Next.js",
	"TypeScript",
	"Django REST",
	"Python",
	"PostgreSQL",
	"OpenAI",
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

					{/* External links */}
					<div className="flex items-center gap-3">
						<Link
							href="https://github.com/adamhinton/monster-masher"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Adam Hinton on GitHub (opens in new tab)"
						>
							<GitHubIcon className="size-4 shrink-0" aria-hidden="true" />
							GitHub
						</Link>
						<Link
							href="https://www.linkedin.com/in/adam-hinton/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Adam Hinton on LinkedIn (opens in new tab)"
						>
							<LinkedInIcon className="size-4 shrink-0" aria-hidden="true" />
							LinkedIn
						</Link>
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
