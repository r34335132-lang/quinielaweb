"use client";

import { AuthProvider } from "@/context/AuthProvider";
import { AppProvider } from "@/context/AppProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}
