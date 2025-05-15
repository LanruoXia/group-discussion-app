"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../supabase";
import { motion } from "framer-motion";

// User profile type definition
interface UserState {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
}

export default function NavBar() {
  // Auth state: user info, loading, and authentication status
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
  const [isInSession, setIsInSession] = useState(false);

  // Fetch user profile from Supabase
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

  // Redirect to login page
  const handleLogin = () => {
    router.replace("/auth");
  };

  // Clear all Supabase-related data from localStorage, sessionStorage, and cookies
  const clearSupabaseData = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state and storage
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      clearSupabaseData();

      // Force reload to login page
      const timestamp = new Date().getTime();
      window.location.replace(`/auth?t=${timestamp}`);
    } catch (error) {
      console.error("Error during logout:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      clearSupabaseData();
    }
  };

  // Handle navigation with authentication and waiting room checks
  const handleNavigation = async (path: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 如果在会话中，只允许访问当前会话页面
      if (isInSession) {
        const currentSessionPath = pathname?.split("/").slice(0, 5).join("/");
        if (path !== currentSessionPath) {
          // 可以添加一个提示
          console.log("Cannot leave the session while it's in progress");
          return;
        }
      }

      // Block navigation if in waiting room (except to waiting room itself)
      if (isInWaitingRoom && path !== "/session/join/waiting-room") {
        return;
      }

      // Unauthenticated users can only access auth page
      if (!session) {
        if (path !== "/auth") {
          router.replace("/auth");
        }
        return;
      }

      // Authenticated users cannot access auth page
      if (session && path === "/auth") {
        router.replace("/");
        return;
      }

      // Normal navigation
      router.replace(path);
    } catch (error) {
      console.error("Navigation error:", error);
      router.replace("/auth");
    }
  };

  // Initialize authentication state and listen for changes
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

        // Fetch user profile from database
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

    // Initial authentication check
    initializeAuth();

    // Listen for profile updates
    const handleStorageChange = () => {
      if (mounted) {
        initializeAuth();
      }
    };
    window.addEventListener("profile-updated", handleStorageChange);

    // Listen for Supabase auth state changes
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

  // Detect if user is in the waiting room based on pathname
  useEffect(() => {
    setIsInWaitingRoom(pathname?.includes("/session/waiting-room") || false);
  }, [pathname]);

  // Detect if user is in a session based on pathname
  useEffect(() => {
    // 检查是否在会话相关页面
    setIsInSession(
      pathname?.includes("/session/waiting-room") ||
        pathname?.includes("/session/join/preparation") ||
        pathname?.includes("/session/join/discussion-room") ||
        pathname?.includes("/session/join/analyzing-result") || // 添加 analyzing result 检测
        false
    );
  }, [pathname]);

  // Check if the current path is active for navigation highlighting
  const isActivePath = (path: string): boolean => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path) || false;
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-[#f5f7fa] p-4 text-gray-800 flex justify-between items-center min-h-[64px] sticky top-0 z-50"
    >
      {/* Navigation buttons */}
      <div className="space-x-1 sm:space-x-4 flex flex-wrap">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNavigation("/")}
          className={`px-2 sm:px-3 py-1.5 rounded-lg transition duration-200 ${
            isInWaitingRoom
              ? "opacity-50 cursor-not-allowed"
              : isActivePath("/")
              ? "bg-white text-blue-600 font-medium"
              : "hover:bg-indigo-100/80"
          }`}
          disabled={isInWaitingRoom}
        >
          Home
        </motion.button>
        {authState.isAuthenticated && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation("/session/create")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition duration-200 ${
                isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : isActivePath("/session/create")
                  ? "bg-white text-blue-600 font-medium"
                  : "hover:bg-indigo-100/80"
              }`}
              disabled={isInWaitingRoom}
            >
              Create Session
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation("/session/join")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition duration-200 ${
                isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : isActivePath("/session/join")
                  ? "bg-white text-blue-600 font-medium"
                  : "hover:bg-indigo-100/80"
              }`}
              disabled={isInWaitingRoom}
            >
              Join Session
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation("/dashboard")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition duration-200 ${
                isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : isActivePath("/dashboard")
                  ? "bg-white text-blue-600 font-medium"
                  : "hover:bg-indigo-100/80"
              }`}
              disabled={isInWaitingRoom}
            >
              Results
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation("/profile")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition duration-200 ${
                isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : isActivePath("/profile")
                  ? "bg-white text-blue-600 font-medium"
                  : "hover:bg-indigo-100/80"
              }`}
              disabled={isInWaitingRoom}
            >
              Profile
            </motion.button>
          </>
        )}
      </div>

      {/* User info and login/logout button */}
      <div className="flex items-center space-x-3 min-w-[120px] justify-end pr-10">
        {authState.isLoading ? (
          <div className="h-4 w-4 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
        ) : authState.isAuthenticated ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm flex items-center bg-indigo-100 px-3 py-1.5 rounded-full mr-2"
            >
              <span className="font-medium flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                {authState.user?.name || authState.user?.email.split("@")[0]}
              </span>
              {authState.user?.school && authState.user?.grade && (
                <span className="ml-2 text-indigo-500 hidden sm:inline-block">
                  {authState.user.school} • {authState.user.grade}
                </span>
              )}
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              disabled={authState.isLoading || isInWaitingRoom}
              className={`px-2 sm:px-3 py-1.5 rounded-lg hover:bg-indigo-100/80 transition-colors border-b border-transparent hover:border-blue-300 ${
                authState.isLoading || isInWaitingRoom
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Logout
            </motion.button>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogin}
            className="px-4 py-1.5 rounded-lg bg-white text-blue-600 hover:bg-indigo-50 transition-colors shadow-sm font-medium"
          >
            Login
          </motion.button>
        )}
      </div>
    </motion.nav>
  );
}
