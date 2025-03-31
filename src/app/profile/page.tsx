"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

interface Profile {
  name: string | null;
  username: string | null;
  school: string | null;
  grade: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: null,
    username: null,
    school: null,
    grade: null,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          school: profile.school,
          grade: profile.grade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Only trigger the custom event
      window.dispatchEvent(new Event("profile-updated"));

      // Refetch profile to ensure we have the latest data
      const { data } = await supabase
        .from("profiles")
        .select("name, username, school, grade")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile({
          name: data.name || null,
          username: data.username || null,
          school: data.school || null,
          grade: data.grade || null,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      if (!mounted) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("name, username, school, grade")
          .eq("id", session.user.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // Profile doesn't exist, create one
            const defaultUsername = session.user.email?.split("@")[0] || null;
            const { error: insertError } = await supabase
              .from("profiles")
              .insert([
                {
                  id: session.user.id,
                  username: defaultUsername,
                  name: defaultUsername,
                  school: null,
                  grade: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ]);

            if (insertError) throw insertError;

            if (mounted) {
              setProfile({
                name: defaultUsername,
                username: defaultUsername,
                school: null,
                grade: null,
              });
            }
          } else {
            throw error;
          }
        } else if (mounted) {
          // If username is null, update it with email prefix
          if (!data.username) {
            const defaultUsername = session.user.email?.split("@")[0] || null;
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                username: defaultUsername,
                name: defaultUsername,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.user.id);

            if (updateError) throw updateError;

            setProfile({
              name: defaultUsername,
              username: defaultUsername,
              school: data.school || null,
              grade: data.grade || null,
            });
          } else {
            setProfile({
              name: data.name,
              username: data.username,
              school: data.school || null,
              grade: data.grade || null,
            });
          }
        }
      } catch (error) {
        console.error("Error in profile flow:", error);
        if (mounted) {
          setMessage({ type: "error", text: "Failed to load profile" });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-medium text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

        {message && (
          <div
            className={`p-4 rounded-md mb-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={profile.username || ""}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              School
            </label>
            <input
              type="text"
              value={profile.school || ""}
              onChange={(e) =>
                setProfile({ ...profile, school: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your school"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Grade
            </label>
            <select
              value={profile.grade || ""}
              onChange={(e) =>
                setProfile({ ...profile, grade: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select your grade</option>
              <option value="S.4">S.4</option>
              <option value="S.5">S.5</option>
              <option value="S.6">S.6</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
