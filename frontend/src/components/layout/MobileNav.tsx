"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/darkTheming/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/lib/store/hooks";
import { useAppDispatch } from "../../../store/hooks";
import { authSignedOut } from "../../../store/authSlice";
import { Route } from "next";

const navLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/gallery", label: "Gallery" },
] as const;

export function MobileNav() {
	const dispatch = useAppDispatch();
	const [isOpen, setIsOpen] = useState(false);
	const authState = useAppSelector((state) => state.auth);
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	// TODO this has duplicate functionality with HeaderAuthButton because copilot is stupid; fix later
	async function handleLogout(dispatch: ReturnType<typeof useAppDispatch>) {
		dispatch(authSignedOut());
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		try {
			const logOutRoute: Route = "/api/auth/logout";
			await fetch(logOutRoute, { method: "POST" });
			router.push("/");
			router.refresh();
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
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
							onClick={() => setIsOpen(false)}
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
				<div className="px-1">
					{authState.status === "loading" && (
						<Skeleton className="h-9 w-full rounded-md" />
					)}
					{authState.status === "anonymous" && (
						<Link
							href="/auth"
							className={
								buttonVariants({ variant: "outline" }) +
								" w-full justify-center"
							}
							onClick={() => setIsOpen(false)}
						>
							Sign in
						</Link>
					)}
					{authState.status === "authenticated" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
								<div
									aria-hidden="true"
									className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground select-none"
								>
									{authState.user.email[0]?.toUpperCase() ?? "?"}
								</div>
								<span className="max-w-40 truncate text-sm font-medium">
									{authState.user.email}
								</span>
							</div>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => handleLogout(dispatch)}
								disabled={isLoggingOut}
							>
								<LogOut className="size-4" />
								{isLoggingOut ? "Signing out…" : "Sign out"}
							</Button>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
