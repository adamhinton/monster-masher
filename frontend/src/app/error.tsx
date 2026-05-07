"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<PageContainer size="prose">
			<div className="flex flex-col items-center gap-6 py-24 text-center">
				<span className="text-5xl" aria-hidden="true">
					💥
				</span>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Something went wrong
					</h1>
					<p className="text-muted-foreground">
						An unexpected error occurred. The error has been reported.
					</p>
				</div>
				<Button onClick={reset}>Try again</Button>
			</div>
		</PageContainer>
	);
}
