import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://awaorpybjweyndtjnklg.supabase.co";
const SUPABASE_KEY = "sb_publishable_tzyCATjOmNt-BAOquQg1Rw_Gr3y5HQ5";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testWithKey() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "onelinker.ai@gmail.com",
    password: "Bilal@741"
  });

  if (authError || !authData.session) {
    console.error("Sign in failed:", authError?.message);
    return;
  }

  const token = authData.session.access_token;
  console.log("Token obtained.");

  console.log("Invoking generate-r2-url with explicit key...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-r2-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        key: "3000c959-5d25-4cdd-94a6-61d800f3ab97/2ff58580-dfd8-4cc1-8c5e-73507472f4a1.mov",
        action: "download",
        expiresIn: 3600,
      })
    });

    console.log("Response Status:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Caught error:", err);
  }
}

testWithKey();
