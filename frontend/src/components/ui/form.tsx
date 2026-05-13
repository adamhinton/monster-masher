import * as React from "react";

import { cn } from "@/lib/utils";

function Form({ ...props }: React.ComponentProps<"form">) {
	return <form data-slot="form" {...props} />;
}

function FormField({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="form-field"
			className={cn("grid gap-2", className)}
			{...props}
		/>
	);
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="form-item"
			className={cn("grid gap-1.5", className)}
			{...props}
		/>
	);
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
	return (
		<label
			data-slot="form-label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium text-foreground select-none",
				className,
			)}
			{...props}
		/>
	);
}

function FormControl({ ...props }: React.ComponentProps<"div">) {
	return <div data-slot="form-control" {...props} />;
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="form-message"
			className={cn("min-h-4 text-xs font-medium text-destructive", className)}
			{...props}
		/>
	);
}

export { Form, FormControl, FormField, FormItem, FormLabel, FormMessage };
