import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// TODO hook this up to Django user data
/**Logged in user */
export type AuthUser = {
	id: string;
	email: string;
};

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
	user: AuthUser;
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

		/**Logged in */
		authSignedIn(
			_state,
			action: PayloadAction<AuthUser>,
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
