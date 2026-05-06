import { configureStore } from "@reduxjs/toolkit";

// An explicit empty root reducer avoids TypeScript complaints about an empty
// reducer object. Feature slices are added here as features are built.
// Do not add slices for theme state (next-themes) or auth state (Supabase).
type EmptyRootState = Record<string, never>;
function rootReducer(state: EmptyRootState = {}): EmptyRootState {
	return state;
}

export const store = configureStore({
	reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
