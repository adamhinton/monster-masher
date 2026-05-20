// TODO flesh this out when project is more defined

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/darkTheming/ThemeToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import HeaderAuthButton from "@/components/layout/Header/HeaderAuthButton";

const navLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/gallery", label: "Gallery" },
] as const;

export function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
				{/* Logo / brand */}
				<Link
					href="/"
					className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:text-primary"
				>
					{/* Emoji placeholder — TODO replace with real logo asset later */}
					<span aria-hidden="true">🧌</span>
					<span>Monster Masher</span>
				</Link>

				{/* If in dev, link to /dev/gallery 
				TODO delete this after testing is done
				But this route is blocked in prod in proxy.ts so it's not a big deal if it stays in
				*/}
				{process.env.NODE_ENV === "development" && (
					<Link
						href="/dev/gallery"
						className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						Dev Gallery
					</Link>
				)}

				{/* Desktop nav */}
				<nav
					className="hidden items-center gap-1 md:flex"
					aria-label="Main navigation"
				>
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Right side: theme toggle + auth + mobile nav trigger */}
				<div className="flex items-center gap-2">
					<div className="hidden md:flex md:items-center md:gap-2">
						<ThemeToggle />
						<HeaderAuthButton />
					</div>
					{/* Mobile nav (hidden on md+) */}
					<div className="md:hidden">
						<MobileNav />
					</div>
				</div>
			</div>
			<Separator />
		</header>
	);
}
