"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
		<html lang="en">
			<body
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					fontFamily: "system-ui, sans-serif",
					textAlign: "center",
					padding: "2rem",
					background: "#0d0b14",
					color: "#f0eeff",
				}}
			>
				<span style={{ fontSize: "3rem" }} aria-hidden="true">
					💥
				</span>
				<h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1rem" }}>
					Something went wrong
				</h1>
				<p style={{ color: "#9b93c4", marginTop: "0.5rem", maxWidth: "40ch" }}>
					A critical error occurred. The error has been reported.
				</p>
				<button
					onClick={reset}
					style={{
						marginTop: "1.5rem",
						padding: "0.5rem 1.5rem",
						background: "#7c4dff",
						color: "#fff",
						border: "none",
						borderRadius: "0.375rem",
						cursor: "pointer",
						fontSize: "0.875rem",
					}}
				>
					Try again
				</button>
			</body>
		</html>
	);
}
