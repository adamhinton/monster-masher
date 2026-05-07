// TODO flesh this out when project is more defined

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/darkTheming/ThemeToggle";
import { Separator } from "@/components/ui/separator";

const navLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/gallery", label: "Gallery" },
] as const;

export function MobileNav() {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Open navigation menu"
					/>
				}
			>
				<Menu className="h-5 w-5" />
			</SheetTrigger>
			<SheetContent side="right" className="w-72">
				<SheetHeader>
					<SheetTitle className="text-left">Monster Masher</SheetTitle>
				</SheetHeader>
				<nav className="mt-6 flex flex-col gap-1">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
						>
							{link.label}
						</Link>
					))}
				</nav>
				<Separator className="my-4" />
				<div className="flex items-center justify-between px-1">
					<span className="text-sm text-muted-foreground">Theme</span>
					<ThemeToggle />
				</div>
				<Separator className="my-4" />
				{/* Auth slot — populated in Phase 4 */}
				<div className="px-1">
					<Button className="w-full" variant="outline" disabled>
						Sign in
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
