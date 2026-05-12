import { UserProfile } from "@/lib/api/schemas/UserProfileSchema";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**Auth state is still loading */
type AuthStateLoading = {
	status: "loading";
};

/** Anonymous user */
type AuthStateAnonymous = {
	status: "anonymous";
};

/**User logged in */
type AuthStateAuthenticated = {
	status: "authenticated";
	/**Gotten from django */
	user: UserProfile;
};

/**All possible global auth state configurations */
export type ReduxAuthState =
	| AuthStateLoading
	| AuthStateAnonymous
	| AuthStateAuthenticated;

/**Anything except "loading" */
type ResolvedAuthState = AuthStateAnonymous | AuthStateAuthenticated;

const createInitialAuthState = (): ReduxAuthState => ({
	status: "loading",
});

const authSlice = createSlice({
	name: "auth",
	initialState: createInitialAuthState(),
	reducers: {
		/**Loading while checking if user is logged in and getting their profile info from django */
		authCheckStarted(): AuthStateLoading {
			return { status: "loading" };
		},

		/**Either anonymous or logged in user */
		authInitialized(
			_state,
			action: PayloadAction<ResolvedAuthState>,
		): ResolvedAuthState {
			return action.payload;
		},

		/**Logged in with Supabase Auth; user profile retrieved from django*/
		authSignedIn(
			_state,
			action: PayloadAction<UserProfile>,
		): AuthStateAuthenticated {
			return {
				status: "authenticated",
				user: action.payload,
			};
		},

		authSignedOut(): AuthStateAnonymous {
			return { status: "anonymous" };
		},
	},
});

export const {
	authCheckStarted,
	authInitialized,
	authSignedIn,
	authSignedOut,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
