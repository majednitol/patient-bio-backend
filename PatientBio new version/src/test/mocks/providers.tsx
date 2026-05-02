import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TestRouter } from "./router";

interface TestProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

// Create a new QueryClient for each test to avoid state leaking
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const TestProviders = ({ children, initialEntries }: TestProvidersProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TestRouter initialEntries={initialEntries}>
        {children}
      </TestRouter>
    </QueryClientProvider>
  );
};
