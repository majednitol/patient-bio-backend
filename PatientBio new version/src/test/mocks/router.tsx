import { ReactNode } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

interface TestRouterProps {
  children: ReactNode;
  initialEntries?: string[];
}

export const TestRouter = ({ children, initialEntries = ["/"] }: TestRouterProps) => (
  <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="*" element={children} />
    </Routes>
  </MemoryRouter>
);
