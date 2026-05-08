// _____________
// Non-UI auth component
// It watches for Supabase auth changes (login, logout, refresh etc) and propagates them in redux
// This also handles the initial auth state on page load
// _____________

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { userProfileSchema } from "@/lib/api/schemas/UserProfile";
import { createClientCSROnly } from "@/lib/supabase/client";
import { useAppDispatch } from "@/lib/store/hooks";
import {
	authCheckStarted,
	authSignedIn,
	authSignedOut,
} from "../../../store/authSlice";

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
			activeRequestRef.current?.abort();

			const abortController = new AbortController();
			activeRequestRef.current = abortController;

			// Auth loading
			dispatch(authCheckStarted());

			try {
				// TODO write helper for this API call
				// This gets further profile info from Django
				const response = await fetch("/api/auth/bootstrap-profile", {
					method: "POST",
					signal: abortController.signal,
				});

				if (!response.ok) {
					dispatch(authSignedOut());
					return;
				}

				const raw: unknown = await response.json();
				const parsed = bootstrapProfileResponseSchema.safeParse(raw);

				if (!parsed.success) {
					dispatch(authSignedOut());
					return;
				}

				// Logged in successfully, set profile in global redux state
				dispatch(authSignedIn(parsed.data.user));
			} catch (error) {
				if (!isAbortError(error)) {
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

	// Listen for auth changes (login, logout etc) and propagate to global redux state
	useEffect(() => {
		const supabase = createClientCSROnly();

		void bootstrapProfile({ refreshServerComponents: false });

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
