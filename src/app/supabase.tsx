// src/app/supabase.tsx
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 添加调试日志
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Anon Key configured:", !!supabaseAnonKey);

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabase = createClientComponentClient<Database>();
