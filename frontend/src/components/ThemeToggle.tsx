"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// subscribe is a no-op — we only need the snapshot values.
function subscribe() {
	return () => {};
}

export function ThemeToggle() {
	// useSyncExternalStore returns the server snapshot during SSR and the client
	// snapshot after hydration. No setState-in-effect needed; no cascading render.
	const mounted = useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
	const { theme, setTheme } = useTheme();

	// Render a stable placeholder before mounting to avoid hydration mismatch.
	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
				<Sun className="h-4 w-4" />
			</Button>
		);
	}

	const icon =
		theme === "dark" ? (
			<Moon className="h-4 w-4" />
		) : theme === "light" ? (
			<Sun className="h-4 w-4" />
		) : (
			<Monitor className="h-4 w-4" />
		);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" aria-label="Toggle theme" />
				}
			>
				{icon}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					<Sun className="mr-2 h-4 w-4" />
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					<Moon className="mr-2 h-4 w-4" />
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					<Monitor className="mr-2 h-4 w-4" />
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
