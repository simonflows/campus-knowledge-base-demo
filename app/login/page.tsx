"use client";

import { LoginScreen } from "@/components/auth/login-screen";
import { useDemoStore } from "@/lib/demo-client-store";

export default function LoginPage() {
  const { state, user } = useDemoStore();

  return (
    <LoginScreen
      key={`${user?.id ?? "anon"}-${state.resetEpoch ?? 0}`}
      currentUser={user}
    />
  );
}
