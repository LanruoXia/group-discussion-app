"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import { motion } from "framer-motion";

// User profile interface defining the structure of user data
interface UserState {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
}

export default function Home() {
  // Authentication state management
  // Tracks user info, loading state, and authentication status
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

  // Fetches user profile data from Supabase database
  // Returns null if profile fetch fails
  const fetchUserProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", session.user.id)
        .single();

      setAuthState((prev) => ({
        ...prev,
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.name || session.user.email?.split("@")[0] || null,
          username: null,
          school: null,
          grade: null,
        },
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch (error) {
      console.error("Error fetching profile:", error);
      setAuthState((prev) => ({
        ...prev,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      }));
    }
  };

  // Cleans up all Supabase-related data from browser storage
  // Removes items from localStorage, sessionStorage, and cookies
  const clearSupabaseData = () => {
    // Clear localStorage items
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });
    // Clear sessionStorage items
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

  // Handles navigation with authentication and waiting room checks
  // Prevents unauthorized access and manages navigation restrictions
  const handleNavigation = async (path: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Block navigation if in waiting room (except to waiting room itself)
      if (path === "/session/join/waiting-room") {
        return;
      }

      // Redirect unauthenticated users to auth page
      if (!session) {
        if (path !== "/auth") {
          router.replace("/auth");
        }
        return;
      }

      // Prevent authenticated users from accessing auth page
      if (session && path === "/auth") {
        router.replace("/");
        return;
      }

      // Proceed with normal navigation
      router.replace(path);
    } catch (error) {
      console.error("Navigation error:", error);
      router.replace("/auth");
    }
  };

  // Main authentication initialization and state management
  // Handles initial auth check, profile updates, and auth state changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        // Handle unauthenticated state
        if (!session?.user) {
          setAuthState((prev) => ({
            ...prev,
            user: null,
            isLoading: false,
            isAuthenticated: false,
          }));
          return;
        }

        // Fetch and set user profile data
        await fetchUserProfile();

        if (!mounted) return;

        const userInfo: UserState = {
          id: session.user.id,
          email: session.user.email || "",
          name: authState.user?.name || null,
          username: null,
          school: null,
          grade: null,
        };

        setAuthState((prev) => ({
          ...prev,
          user: userInfo,
          isLoading: false,
          isAuthenticated: true,
        }));
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setAuthState((prev) => ({
            ...prev,
            user: null,
            isLoading: false,
            isAuthenticated: false,
          }));
        }
      }
    };

    // Initial auth check
    initializeAuth();

    // Listen for profile updates
    const handleStorageChange = () => {
      if (mounted) {
        initializeAuth();
      }
    };
    window.addEventListener("profile-updated", handleStorageChange);

    // Subscribe to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      // Handle sign out event
      if (event === "SIGNED_OUT") {
        setAuthState((prev) => ({
          ...prev,
          user: null,
          isLoading: false,
          isAuthenticated: false,
        }));
        clearSupabaseData();
        router.replace("/auth");
        return;
      }

      // Re-initialize auth state for other events
      initializeAuth();
    });

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleStorageChange);
    };
  }, [router, authState.user?.name]);

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-[#4a7dbd] border-solid rounded-full animate-spin"></div>
          <div className="mt-4 text-lg text-[#4a7dbd] font-medium">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-[#f5f7fa] px-6 md:px-24 py-8 gap-26 overflow-hidden -mt-6">
      {/* Illustration Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full md:w-[45%] flex justify-center items-center -mt-16"
      >
        {/* Background circle/blob for the image */}
        <div className="absolute w-[90%] h-[90%] bg-gradient-to-br from-blue-100 to-indigo-50 rounded-full opacity-70 filter blur-sm"></div>

        {/* Elliptical Shadow */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-400 opacity-30 blur-md rounded-full z-0" />

        {/* Illustration with shaped mask */}
        <motion.div
          className="relative z-10 w-[95%] overflow-hidden rounded-xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <motion.img
            src="/images/home-hkdse-speaking.png"
            alt="Students preparing for HKDSE speaking"
            className="relative z-10 w-full h-auto drop-shadow-xl rounded-xl"
          />
        </motion.div>
      </motion.div>

      {/* Text Section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full md:w-[50%] text-center md:text-left space-y-5 -mt-16 md:pl-16"
      >
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-2xl text-gray-500 max-w-md font-bold"
        >
          <span>Hi, {authState.user?.name} </span>
        </motion.h2>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight"
        >
          Master your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            HKDSE
          </span>{" "}
          <span className="whitespace-nowrap">Group Interaction Test</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg text-gray-600 max-w-md"
        >
          Practice in real-time discussion rooms with instant AI feedback —
          anytime, anywhere.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 mt-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNavigation("/session/join")}
            className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-medium shadow-md transition duration-200"
          >
            Join with a Session Code
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNavigation("/session/create")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md transition duration-200"
          >
            Create a Practice Session
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 text-sm text-gray-500 flex flex-wrap gap-4 justify-center md:justify-start"
        >
          <span className="flex items-center gap-2 px-3 py-1 ">
            <span className="text-red-500">🎯</span> Improve your performance
          </span>
          <span className="flex items-center gap-2 px-3 py-1 ">
            <span className="text-yellow-500">⚡</span> AI-powered instant
            feedback
          </span>
        </motion.div>
      </motion.div>
    </main>
  );
}
