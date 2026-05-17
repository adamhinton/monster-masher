"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange"> & {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
};

function Switch({
	checked,
	onCheckedChange,
	className,
	disabled,
	id,
	...props
}: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			id={id}
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				"peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-0.5 text-foreground shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
				className,
			)}
			data-state={checked ? "checked" : "unchecked"}
			{...props}
		>
			<span
				className={cn(
					"pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
					checked ? "translate-x-5" : "translate-x-0",
				)}
			/>
		</button>
	);
}

export { Switch };
