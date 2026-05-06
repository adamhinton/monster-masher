declare module "@supabase/ssr" {
	/** Minimal shim to satisfy TypeScript until the proper package is installed */
	export function createBrowserClient(url: string, key: string): any;
	export function createServerClient(url: string, key: string, opts?: any): any;
}
