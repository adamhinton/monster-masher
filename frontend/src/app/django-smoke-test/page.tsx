// ______________
// This page is a simple smoke test for the Django API. It allows you to click a button to call the /health endpoint on the Django backend and displays the response. This is useful for verifying that the frontend can communicate with the backend and that the backend is running correctly.
// ______________

"use client";

import { useState } from "react";

import { fetchDjangoHealth } from "@/lib/api/health";
import type { HealthResponse } from "@/lib/api/schemas/health";

type HealthCheckState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "success"; data: HealthResponse }
	| { status: "error"; message: string };

/**
 * Simple smoke test page to verify that Django API is working and connected
 */
export default function DjangoTestPage() {
	const [state, setState] = useState<HealthCheckState>({ status: "idle" });

	async function handleClick() {
		setState({ status: "loading" });

		try {
			const data = await fetchDjangoHealth();
			setState({ status: "success", data });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";

			setState({ status: "error", message });
		}
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
			<h1>Blah blah</h1>
			<div>
				<h1 className="text-3xl font-bold">Django API Smoke Test</h1>
				<p className="mt-2 text-sm text-gray-600">
					Click the button to call the Django /health endpoint.
				</p>
			</div>

			<button
				type="button"
				onClick={handleClick}
				disabled={state.status === "loading"}
				className="w-fit rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
			>
				{state.status === "loading" ? "Checking..." : "Check Django API"}
			</button>

			<section className="rounded-md border p-4">
				{state.status === "idle" && <p>No request made yet.</p>}

				{state.status === "loading" && <p>Checking Django...</p>}

				{state.status === "success" && (
					<pre className="overflow-x-auto text-sm">
						{JSON.stringify(state.data, null, 2)}
					</pre>
				)}

				{state.status === "error" && (
					<p className="text-red-600">{state.message}</p>
				)}
			</section>
		</main>
	);
}
