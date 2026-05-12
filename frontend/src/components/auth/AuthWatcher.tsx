// _____________
// Non-UI auth component
// It watches for Supabase auth changes (login, logout, refresh etc) and propagates them in redux
// This also handles the initial auth state on page load
// _____________

"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { userProfileSchema } from "@/lib/api/schemas/UserProfileSchema";
import { createClientCSROnly } from "@/lib/supabase/client";
import { useAppDispatch } from "@/lib/store/hooks";
import {
	authCheckStarted,
	authSignedIn,
	authSignedOut,
} from "../../../store/authSlice";
import { Route } from "next";

// From /api/auth/bootstrap-profile
// TODO write a helper that gets this and has a defined function signature
const bootstrapProfileResponseSchema = z.object({
	user: userProfileSchema,
});

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Non-UI auth component
 *
 * Does two things:
 *
 * 1. Runs on initial page load to see if user is logged in, and sets auth state to global redux state
 *
 * 2. Listens for any further auth changes (via supabase) and propagates them in global redux state
 */
export function AuthWatcher() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const activeRequestRef = useRef<AbortController | null>(null);

	/**Once a user is logged in via supabase auth, this gets their further profile info from Django API */
	const bootstrapProfile = useCallback(
		async ({
			refreshServerComponents,
		}: {
			refreshServerComponents: boolean;
		}) => {
			const bootStrapAuthRoute: Route = "/api/auth/bootstrap-auth"; // Won't compile if the route path drifts
			activeRequestRef.current?.abort();

			const abortController = new AbortController();
			activeRequestRef.current = abortController;

			// Auth loading
			dispatch(authCheckStarted());

			try {
				// Won't compile if the route path drifts
				const bootStrapAuthRoute: Route = "/api/auth/bootstrap-auth";
				// TODO write helper for this API call
				// This gets further profile info from Django
				const response = await fetch(bootStrapAuthRoute, {
					method: "POST",
					signal: abortController.signal,
				});

				if (!response.ok) {
					if (response.status >= 500) {
						Sentry.captureMessage("auth.bootstrap_request_failed", {
							level: "warning",
							tags: {
								feature_area: "auth",
								route: bootStrapAuthRoute,
								auth_state: "authenticated",
							},
							extra: {
								status: response.status,
							},
						});
					}

					dispatch(authSignedOut());
					return;
				}

				const raw: unknown = await response.json();
				const parsed = bootstrapProfileResponseSchema.safeParse(raw);

				if (!parsed.success) {
					Sentry.captureMessage("auth.bootstrap_response_schema_invalid", {
						level: "error",
						tags: {
							feature_area: "auth",
							route: bootStrapAuthRoute,
							auth_state: "authenticated",
						},
						extra: {
							issues: parsed.error.issues.map((issue) => ({
								path: issue.path.join("."),
								message: issue.message,
								code: issue.code,
							})),
						},
					});

					dispatch(authSignedOut());
					return;
				}

				// Logged in successfully, set profile in global redux state
				dispatch(authSignedIn(parsed.data.user));
			} catch (error) {
				if (!isAbortError(error)) {
					Sentry.captureException(error, {
						tags: {
							feature_area: "auth",
							route: bootStrapAuthRoute,
							auth_state: "authenticated",
						},
					});

					dispatch(authSignedOut());
				}
			} finally {
				if (refreshServerComponents && !abortController.signal.aborted) {
					router.refresh();
				}
			}
		},
		[dispatch, router],
	);

	/**Returns true if there's a logged in user, false if no logged in user */
	async function hasClientSession(): Promise<boolean> {
		const supabase = createClientCSROnly();

		const {
			data: { session },
		} = await supabase.auth.getSession();

		return session !== null;
	}

	// Listen for auth changes (login, logout etc) and propagate to global redux state
	useEffect(() => {
		const supabase = createClientCSROnly();

		// If there's a logged in user on page load, this gets their profile info from Django and sets in global redux state
		void (async () => {
			dispatch(authCheckStarted());

			const hasSession = await hasClientSession();

			if (!hasSession) {
				dispatch(authSignedOut());
				return;
			}

			await bootstrapProfile({ refreshServerComponents: false });
		})();

		// Auth event listeners after initial page load
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			// Signed in; get profile info from Django and set in global redux state
			if (event === "SIGNED_IN" || event === "USER_UPDATED") {
				void bootstrapProfile({ refreshServerComponents: true });
				return;
			}

			// Signed out; clear profile info from global redux state
			if (event === "SIGNED_OUT") {
				activeRequestRef.current?.abort();
				dispatch(authSignedOut());
				router.refresh();
			}
		});

		return () => {
			activeRequestRef.current?.abort();
			subscription.unsubscribe();
		};
	}, [bootstrapProfile, dispatch, router]);

	return null;
}
