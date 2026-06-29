import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const supabase = createClient(
  process.env.Supabase_Public_Url!,
  process.env.Supabase_Api_Key!
);