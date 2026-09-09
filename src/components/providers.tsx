import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 4_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "bg-elevated text-fg shadow-card border-0 font-sans",
            title: "text-fg",
            description: "text-muted",
          },
        }}
      />
    </QueryClientProvider>
  );
}
