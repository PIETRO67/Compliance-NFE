"use client";
import type { ReactNode } from "react";
import { DemoProvider } from "../demo/DemoProvider";
import { AuthProvider } from "../operational/AuthProvider";
export function AppProviders({ children }: { children: ReactNode }) {
  return process.env.NEXT_PUBLIC_APP_MODE === "operational" ? (
    <AuthProvider>{children}</AuthProvider>
  ) : (
    <DemoProvider>{children}</DemoProvider>
  );
}
