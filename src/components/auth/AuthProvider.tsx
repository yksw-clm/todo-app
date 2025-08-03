"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { client } from "@/lib/hono";

interface AuthProviderProps {
	children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { setUser, logout, isAuthenticated } = useAuthStore();
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await client.api.auth.me.$get();
				if (res.ok) {
					const userData = await res.json();
					setUser(userData.user);
				} else {
					logout();
				}
			} catch {
				logout();
			}
		};

		checkAuth();
	}, [setUser, logout]);

	return <>{children}</>;
}
