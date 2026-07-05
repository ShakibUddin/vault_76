"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
    // Only run once on mount — subsequent login/logout calls update the store directly.
  }, [fetchUser]);

  return <>{children}</>;
}
