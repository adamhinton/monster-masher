import { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
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

/**User logged in, with their full profile and monsters */
type AuthStateAuthenticated = {
	status: "authenticated";
	/**Gotten from django; includes the user's saved monsters */
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

		/**Logged in with Supabase Auth; user profile (with monsters) retrieved from django */
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

		/**
		 * Add a newly created monster to the authenticated user's monsters list.
		 * No-op if the user is not authenticated.
		 */
		monsterAdded(state, action: PayloadAction<Monster>) {
			if (state.status !== "authenticated") return;
			const existingMonsterIndex = state.user.monsters.findIndex(
				(monster) => monster.id === action.payload.id,
			);

			if (existingMonsterIndex >= 0) {
				state.user = {
					...state.user,
					monsters: state.user.monsters.map((monster) =>
						monster.id === action.payload.id ? action.payload : monster,
					),
				};
				return;
			}

			// Prepend so the newest appears first, matching the backend ordering (-created_at).
			state.user = {
				...state.user,
				monsters: [action.payload, ...state.user.monsters],
			};
		},

		/**
		 * Replace an existing monster in the authenticated user's monsters list.
		 * Matched by id. No-op if not authenticated or monster not found.
		 */
		monsterUpdated(state, action: PayloadAction<Monster>) {
			if (state.status !== "authenticated") return;
			state.user = {
				...state.user,
				monsters: state.user.monsters.map((m) =>
					m.id === action.payload.id ? action.payload : m,
				),
			};
		},

		/**
		 * Remove a monster from the authenticated user's monsters list by id.
		 * No-op if not authenticated or monster not found.
		 */
		monsterDeleted(state, action: PayloadAction<string>) {
			if (state.status !== "authenticated") return;
			state.user = {
				...state.user,
				monsters: state.user.monsters.filter((m) => m.id !== action.payload),
			};
		},

		/**
		 * Optimistically clear the image on a monster — used when the user starts
		 * an image generation retry so the UI shows the "imageless" state immediately.
		 * No-op if not authenticated or monster not found.
		 */
		monsterImageCleared(state, action: PayloadAction<Monster["id"]>) {
			if (state.status !== "authenticated") return;
			state.user = {
				...state.user,
				monsters: state.user.monsters.map((m) =>
					m.id === action.payload ? { ...m, image: null } : m,
				),
			};
		},
	},
});

export const {
	authCheckStarted,
	authInitialized,
	authSignedIn,
	authSignedOut,
	monsterAdded,
	monsterUpdated,
	monsterDeleted,
	monsterImageCleared,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
