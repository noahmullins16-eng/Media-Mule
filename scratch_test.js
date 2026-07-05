import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://awaorpybjweyndtjnklg.supabase.co";
const SUPABASE_KEY = "sb_publishable_tzyCATjOmNt-BAOquQg1Rw_Gr3y5HQ5";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRecentVideos() {
  console.log("Fetching 5 latest entries from videos table...");
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, status, r2_url, file_path, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Query failed:", error.message);
  } else {
    console.log("✅ Recent Video records:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkRecentVideos();
