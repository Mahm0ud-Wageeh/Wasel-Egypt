"use client";

import WaselApp from "@/components/wasel-app";
import { AuthProvider } from "@/contexts/AuthContext";
import { AiProvider } from "@/contexts/AiContext";

export default function ClientRoot() {
  return (
    <AuthProvider>
      <AiProvider>
        <WaselApp />
      </AiProvider>
    </AuthProvider>
  );
}
