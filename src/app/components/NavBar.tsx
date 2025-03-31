"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../supabase";

interface UserState {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
}

export default function NavBar() {
  const [authState, setAuthState] = useState<{
    user: UserState | null;
    isLoading: boolean;
    isAuthenticated: boolean;
  }>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();
  const pathname = usePathname();
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, username, school, grade")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const handleLogin = () => {
    router.replace("/auth");
  };

  const clearSupabaseData = () => {
    // Clear all localStorage items that start with 'sb-'
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });

    // Clear all sessionStorage items that start with 'sb-'
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear cookies
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  };

  const handleLogout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Clear all Supabase related storage
      clearSupabaseData();

      // Force a complete page reload with cache busting
      const timestamp = new Date().getTime();
      window.location.replace(`/auth?t=${timestamp}`);
    } catch (error) {
      console.error("Error during logout:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      // Try to clear data even if logout fails
      clearSupabaseData();
    }
  };

  const handleNavigation = async (path: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 如果在等待室，禁止导航
      if (isInWaitingRoom && path !== "/session/join/waiting-room") {
        return;
      }

      // 未登录用户只能访问 auth 页面
      if (!session) {
        if (path !== "/auth") {
          router.replace("/auth");
        }
        return;
      }

      // 已登录用户不能访问 auth 页面
      if (session && path === "/auth") {
        router.replace("/");
        return;
      }

      // 其他情况正常导航
      router.replace(path);
    } catch (error) {
      console.error("Navigation error:", error);
      router.replace("/auth");
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
          return;
        }

        const profile = await fetchUserProfile(session.user.id);

        if (!mounted) return;

        const userInfo: UserState = {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.name || null,
          username: profile?.username || null,
          school: profile?.school || null,
          grade: profile?.grade || null,
        };

        setAuthState({
          user: userInfo,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Listen for profile updates
    const handleStorageChange = () => {
      if (mounted) {
        initializeAuth();
      }
    };

    window.addEventListener("profile-updated", handleStorageChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        clearSupabaseData();
        router.replace("/auth");
        return;
      }

      // For all other events, re-initialize auth state
      initializeAuth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleStorageChange);
    };
  }, [router]);

  // 使用 pathname 来检测等待室状态
  useEffect(() => {
    setIsInWaitingRoom(
      pathname?.includes("/session/join/waiting-room") || false
    );
  }, [pathname]);

  return (
    <nav className="bg-blue-500 p-4 text-white flex justify-between items-center min-h-[64px]">
      <div className="space-x-4">
        <button
          onClick={() => handleNavigation("/")}
          className={`hover:underline text-white ${
            isInWaitingRoom ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isInWaitingRoom}
        >
          Home
        </button>
        {authState.isAuthenticated && (
          <>
            <button
              onClick={() => handleNavigation("/session/create")}
              className={`hover:underline text-white ${
                isInWaitingRoom ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isInWaitingRoom}
            >
              Create Session
            </button>
            <button
              onClick={() => handleNavigation("/evaluate")}
              className={`hover:underline text-white ${
                isInWaitingRoom ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isInWaitingRoom}
            >
              Evaluate
            </button>
            <button
              onClick={() => handleNavigation("/results")}
              className={`hover:underline text-white ${
                isInWaitingRoom ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isInWaitingRoom}
            >
              Results
            </button>
            <button
              onClick={() => handleNavigation("/profile")}
              className={`hover:underline text-white ${
                isInWaitingRoom ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isInWaitingRoom}
            >
              Profile
            </button>
          </>
        )}
      </div>

      <div className="flex items-center space-x-4 min-w-[120px] justify-end">
        {authState.isLoading ? (
          <span className="opacity-0">Loading...</span>
        ) : authState.isAuthenticated ? (
          <>
            <div className="text-sm min-w-[150px]">
              <span className="font-medium">
                👤 {authState.user?.name || authState.user?.email.split("@")[0]}
              </span>
              {authState.user?.school && authState.user?.grade && (
                <span className="ml-2 text-blue-100">
                  {authState.user.school} • {authState.user.grade}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={authState.isLoading || isInWaitingRoom}
              className={`px-4 py-2 rounded bg-white text-blue-500 hover:bg-blue-100 transition-colors min-w-[100px] ${
                authState.isLoading || isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="px-4 py-2 rounded bg-white text-blue-500 hover:bg-blue-100 transition-colors"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
