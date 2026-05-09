// ____________
// Auth button in header. Shows "Sign in" if no logged in user, or user's email initial if logged in. Clicking opens dropdown with "My gallery" and "Sign out" options.
// ____________

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GalleryHorizontalEnd, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/store/hooks";
import { useAppDispatch } from "../../../../store/hooks";
import { authSignedOut } from "../../../../store/authSlice";
import { Route } from "next";

function getEmailInitial(email: string): string {
	return email[0]?.toUpperCase() ?? "?";
}

/**Header auth button
 *
 * Shows "Sign in" if no logged in user, or user's email initial if logged in. Clicking opens dropdown with "My gallery" and "Sign out" options.
 */
export default function HeaderAuthButton() {
	const dispatch = useAppDispatch();
	const authState = useAppSelector((state) => state.auth);
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	// Should only ever be brief
	if (authState.status === "loading") {
		return (
			<Skeleton
				className="h-7 w-18 rounded-md"
				aria-label="Loading account status"
			/>
		);
	}

	// not logged in
	if (authState.status === "anonymous") {
		return (
			<Link
				href="/auth"
				className={buttonVariants({ variant: "outline", size: "sm" })}
			>
				Sign in
			</Link>
		);
	}

	// Now we know user is logged in
	const { user } = authState;
	const initial = getEmailInitial(user.email);

	// TODO my intention had been that I wouldn't actually have to use dispatch here; AuthWatcher is supposed to handle that automatically when you call /api/auth/logout. But that wasn't happening here, I had to dispatch the event to redux. This also has the same functionality as the logout handler in MobileNav, which we also need to consolidate with this function.
	/**What happens when user hits log out button */
	async function handleLogout(dispatch: ReturnType<typeof useAppDispatch>) {
		dispatch(authSignedOut());
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		try {
			const logOutRoute: Route = "/api/auth/logout"; // Won't compile if the route drifts
			await fetch(logOutRoute, { method: "POST" });
			router.push("/");
			router.refresh();
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					buttonVariants({ variant: "ghost", size: "icon" }),
					"rounded-full transition-transform hover:scale-105 active:scale-95",
					isLoggingOut && "pointer-events-none opacity-50",
				)}
				aria-label={`Account menu for ${user.email}`}
			>
				<Avatar size="sm" className="pointer-events-none size-7">
					<AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
						{initial}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56" sideOffset={8}>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
						<span className="font-normal">Signed in as</span>
						<span className="max-w-48 truncate text-sm font-semibold text-foreground leading-tight">
							{user.email}
						</span>
					</DropdownMenuLabel>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem render={<Link href="/gallery" />}>
						<GalleryHorizontalEnd className="size-4" />
						My gallery
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => handleLogout(dispatch)}
						disabled={isLoggingOut}
					>
						<LogOut className="size-4" />
						{isLoggingOut ? "Signing out…" : "Sign out"}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
