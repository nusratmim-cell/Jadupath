"use client";

import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import ErrorBoundary from "./ErrorBoundary";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import { CastProvider } from "@/contexts/CastContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <CastProvider>
        <ServiceWorkerRegistration />
        {children}
        <BottomNav />
      </CastProvider>
    </ErrorBoundary>
  );
}
