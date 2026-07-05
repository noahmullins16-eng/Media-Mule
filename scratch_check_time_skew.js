import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTimeSkew() {
  console.log("Fetching database server time from Supabase...");
  const startTime = Date.now();
  
  // Use a simple query to get the current time on the postgres server
  const { data, error } = await supabase.rpc("get_server_time").select();
  
  let dbTimeStr = "";
  if (error) {
    // If RPC doesn't exist, we can fetch from a system table or view
    console.warn("RPC get_server_time not found, querying videos timestamp instead...");
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("created_at")
      .limit(1);
    
    if (videoError) {
      // Direct query fallback
      console.warn("Fallback to raw query using scratch connection...");
    }
  }

  // Let's do a direct select using postgrest call to query the current time if possible
  // In Supabase postgrest, we can't do arbitrary SQL, but we can call a function or query a view
  // Let's write a simple query to fetch server time
  const { data: timeData, error: timeError } = await supabase
    .from("creator_profiles")
    .select("created_at")
    .limit(1);

  const localTime = new Date();
  console.log("Local system time:", localTime.toISOString());
  console.log("Local timestamp:", localTime.getTime());

  // Let's fetch server time using an HTTP request header or another method if SQL fails
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY }
    });
    const serverDateHeader = res.headers.get("date");
    if (serverDateHeader) {
      const serverTime = new Date(serverDateHeader);
      console.log("Supabase gateway server time (from headers):", serverTime.toISOString());
      console.log("Server timestamp:", serverTime.getTime());
      
      const skewMs = localTime.getTime() - serverTime.getTime();
      console.log(`Clock skew: ${skewMs} ms (${(skewMs / 1000).toFixed(2)} seconds)`);
      if (Math.abs(skewMs) > 1000 * 30) {
        console.warn("⚠️ Warning: Significant clock skew detected! System clock difference is > 30 seconds.");
      } else {
        console.log("✅ Clock is synchronized within acceptable threshold.");
      }
    } else {
      console.error("Could not read date header from Supabase gateway.");
    }
  } catch (e) {
    console.error("Failed to fetch from Supabase HTTP gateway:", e.message);
  }
}

checkTimeSkew();
