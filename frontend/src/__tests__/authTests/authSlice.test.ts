// ________
// Tests for store/authSlice.ts
// ________
import { describe, it, expect } from "vitest";
import {
	authReducer,
	authCheckStarted,
	authInitialized,
	authSignedIn,
	authSignedOut,
} from "../../../store/authSlice";
import { validUserProfile } from "../__testUtils__/fixtures";

const loading = { status: "loading" as const };
const anonymous = { status: "anonymous" as const };
const authenticated = {
	status: "authenticated" as const,
	user: validUserProfile,
};

describe("authSlice reducers", () => {
	describe("initial state", () => {
		it("is loading", () => {
			const state = authReducer(undefined, { type: "" });
			expect(state.status).toBe("loading");
		});
	});

	describe("authCheckStarted", () => {
		it("sets state to loading from anonymous", () => {
			const state = authReducer(anonymous, authCheckStarted());
			expect(state.status).toBe("loading");
		});

		it("sets state to loading from authenticated", () => {
			const state = authReducer(authenticated, authCheckStarted());
			expect(state.status).toBe("loading");
		});
	});

	describe("authInitialized", () => {
		it("sets anonymous state", () => {
			const state = authReducer(loading, authInitialized(anonymous));
			expect(state.status).toBe("anonymous");
		});

		it("sets authenticated state with user", () => {
			const state = authReducer(loading, authInitialized(authenticated));
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.email).toBe("test@example.com");
			}
		});
	});

	describe("authSignedIn", () => {
		it("sets authenticated state with the given user profile", () => {
			const state = authReducer(loading, authSignedIn(validUserProfile));
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user).toEqual(validUserProfile);
			}
		});

		it("replaces existing user on re-sign-in", () => {
			const newUser = { ...validUserProfile, email: "new@example.com" };
			const state = authReducer(authenticated, authSignedIn(newUser));
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.email).toBe("new@example.com");
			}
		});
	});

	describe("authSignedOut", () => {
		it("sets state to anonymous from authenticated", () => {
			const state = authReducer(authenticated, authSignedOut());
			expect(state.status).toBe("anonymous");
		});

		it("sets state to anonymous from loading", () => {
			const state = authReducer(loading, authSignedOut());
			expect(state.status).toBe("anonymous");
		});

		it("is idempotent — anonymous from anonymous", () => {
			const state = authReducer(anonymous, authSignedOut());
			expect(state.status).toBe("anonymous");
		});
	});
});
