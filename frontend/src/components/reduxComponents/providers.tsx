"use client";

import { ThemeProvider } from "next-themes";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster } from "@/components/ui/sonner";
import { store } from "@/lib/store";

interface ProvidersProps {
	children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<ReduxProvider store={store}>
				{children}
				<Toaster richColors position="bottom-right" />
			</ReduxProvider>
		</ThemeProvider>
	);
}
