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
	monsterAdded,
	monsterUpdated,
	monsterDeleted,
} from "../../../store/authSlice";
import {
	validUserProfile,
	validUserProfileWithMonsters,
	validMonster,
	validMonsterWithImage,
} from "../__testUtils__/fixtures";

const loading = { status: "loading" as const };
const anonymous = { status: "anonymous" as const };
const authenticated = {
	status: "authenticated" as const,
	user: validUserProfile,
};
const authenticatedWithMonsters = {
	status: "authenticated" as const,
	user: validUserProfileWithMonsters,
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

		it("preserves monsters when initialising to authenticated", () => {
			const state = authReducer(
				loading,
				authInitialized(authenticatedWithMonsters),
			);
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(2);
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

		it("sets monsters from the user profile", () => {
			const state = authReducer(
				loading,
				authSignedIn(validUserProfileWithMonsters),
			);
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(2);
			}
		});

		it("replaces existing user on re-sign-in", () => {
			const newUser = {
				...validUserProfile,
				email: "new@example.com",
				monsters: [],
			};
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

	// ─── Monster actions ──────────────────────────────────────────────────────

	describe("monsterAdded", () => {
		it("prepends the new monster to user.monsters", () => {
			const state = authReducer(
				authenticatedWithMonsters,
				monsterAdded(validMonster),
			);
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.monsters[0]).toEqual(validMonster);
				// Original monsters are still present
				expect(state.user.monsters).toHaveLength(3);
			}
		});

		it("adds a monster when the list was empty", () => {
			const state = authReducer(authenticated, monsterAdded(validMonster));
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(1);
				expect(state.user.monsters[0]).toEqual(validMonster);
			}
		});

		it("is a no-op when not authenticated — loading", () => {
			const state = authReducer(loading, monsterAdded(validMonster));
			expect(state.status).toBe("loading");
		});

		it("is a no-op when not authenticated — anonymous", () => {
			const state = authReducer(anonymous, monsterAdded(validMonster));
			expect(state.status).toBe("anonymous");
		});

		it("does not mutate the existing monsters array reference", () => {
			const before = authenticatedWithMonsters;
			const state = authReducer(before, monsterAdded(validMonster));
			if (state.status === "authenticated" && before.status === "authenticated") {
				expect(state.user.monsters).not.toBe(before.user.monsters);
			}
		});
	});

	describe("monsterUpdated", () => {
		it("replaces the matching monster in place", () => {
			const updated = {
				...validMonsterWithImage,
				display_name: "Renamed Beast",
			};
			const state = authReducer(
				authenticatedWithMonsters,
				monsterUpdated(updated),
			);
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				const found = state.user.monsters.find(
					(m) => m.id === validMonsterWithImage.id,
				);
				expect(found?.display_name).toBe("Renamed Beast");
				// List length unchanged
				expect(state.user.monsters).toHaveLength(2);
			}
		});

		it("leaves the list unchanged when id is not found", () => {
			const unknown = { ...validMonster, id: "00000000-0000-4000-8000-000000000000" };
			const state = authReducer(
				authenticatedWithMonsters,
				monsterUpdated(unknown),
			);
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(2);
				// Neither original monster was replaced
				expect(state.user.monsters.find((m) => m.id === unknown.id)).toBeUndefined();
			}
		});

		it("is a no-op when not authenticated — loading", () => {
			const state = authReducer(loading, monsterUpdated(validMonster));
			expect(state.status).toBe("loading");
		});

		it("is a no-op when not authenticated — anonymous", () => {
			const state = authReducer(anonymous, monsterUpdated(validMonster));
			expect(state.status).toBe("anonymous");
		});

		it("does not mutate the existing monsters array reference", () => {
			const before = authenticatedWithMonsters;
			const updated = { ...validMonsterWithImage, display_name: "X" };
			const state = authReducer(before, monsterUpdated(updated));
			if (state.status === "authenticated" && before.status === "authenticated") {
				expect(state.user.monsters).not.toBe(before.user.monsters);
			}
		});
	});

	describe("monsterDeleted", () => {
		it("removes the monster with the given id", () => {
			const state = authReducer(
				authenticatedWithMonsters,
				monsterDeleted(validMonster.id),
			);
			expect(state.status).toBe("authenticated");
			if (state.status === "authenticated") {
				expect(state.user.monsters.find((m) => m.id === validMonster.id)).toBeUndefined();
				expect(state.user.monsters).toHaveLength(1);
			}
		});

		it("leaves the list unchanged when id is not found", () => {
			const state = authReducer(
				authenticatedWithMonsters,
				monsterDeleted("00000000-0000-4000-8000-000000000000"),
			);
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(2);
			}
		});

		it("produces an empty list when the only monster is deleted", () => {
			const state = authReducer(
				authenticated, // monsters: []
				monsterDeleted(validMonster.id),
			);
			if (state.status === "authenticated") {
				expect(state.user.monsters).toHaveLength(0);
			}
		});

		it("is a no-op when not authenticated — loading", () => {
			const state = authReducer(loading, monsterDeleted(validMonster.id));
			expect(state.status).toBe("loading");
		});

		it("is a no-op when not authenticated — anonymous", () => {
			const state = authReducer(anonymous, monsterDeleted(validMonster.id));
			expect(state.status).toBe("anonymous");
		});

		it("does not mutate the existing monsters array reference", () => {
			const before = authenticatedWithMonsters;
			const state = authReducer(before, monsterDeleted(validMonster.id));
			if (state.status === "authenticated" && before.status === "authenticated") {
				expect(state.user.monsters).not.toBe(before.user.monsters);
			}
		});
	});
});
