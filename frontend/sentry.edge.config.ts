// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: "https://0de041fb25ced17adfd381c3c9bd7bae@o4511128491261952.ingest.us.sentry.io/4511293272948736",

	environment:
		process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
		process.env.VERCEL_ENV ??
		process.env.NODE_ENV,

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
	sendDefaultPii: true,
});
