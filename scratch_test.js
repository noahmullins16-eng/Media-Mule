import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://awaorpybjweyndtjnklg.supabase.co";
const SUPABASE_KEY = "sb_publishable_tzyCATjOmNt-BAOquQg1Rw_Gr3y5HQ5";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listRecentAudios() {
  console.log("Fetching recent audio files...");
  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, title, file_path, preview_path, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching videos:", error);
    return;
  }
  console.log("Recent Videos:");
  console.table(videos);
}

listRecentAudios();
