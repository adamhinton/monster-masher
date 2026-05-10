// ________
// Redux store test utilities.
// makeTestStore() creates an isolated store with optional preloaded auth state.
// TestStoreProvider wraps components in a Provider with controlled auth state.
// ________
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { authReducer } from "../../../store/authSlice";
import type { ReduxAuthState } from "../../../store/authSlice";

/**Simple test Redux store wrapper for unit test components */
export function makeTestStore(preloadedAuth?: ReduxAuthState) {
	return configureStore({
		reducer: { auth: authReducer },
		preloadedState: preloadedAuth ? { auth: preloadedAuth } : undefined,
	});
}

type Props = {
	children: ReactNode;
	authState?: ReduxAuthState;
};

export function TestStoreProvider({ children, authState }: Props) {
	const store = makeTestStore(authState);
	return <Provider store={store}>{children}</Provider>;
}
