import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.{test,spec}.{ts,tsx}", "src/__tests__/**/*.{ts,tsx}"],
		exclude: ["node_modules", ".next", "src/__tests__/__testUtils__/**"],
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			// server-only is a Next.js internal that throws in test environments.
			// This stub makes it a no-op so server-only modules can be imported in tests.
			"server-only": resolve(__dirname, "./src/test/server-only-stub.ts"),
		},
	},
});
