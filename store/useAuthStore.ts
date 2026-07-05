import { create } from "zustand";

export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean; // true while we check session on first load
    setUser: (user: AuthUser | null) => void;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,

    setUser: (user) => set({ user }),

    // Calls /api/auth/me to check the httpOnly cookie server-side
    // and hydrate the client store accordingly.
    fetchUser: async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            if (!res.ok) {
                set({ user: null, isLoading: false });
                return;
            }
            const data = await res.json();
            set({ user: data.user, isLoading: false });
        } catch {
            set({ user: null, isLoading: false });
        }
    }
}));