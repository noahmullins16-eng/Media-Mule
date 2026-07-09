const SUPABASE_URL = "https://awaorpybjweyndtjnklg.supabase.co";
const SUPABASE_KEY = "sb_publishable_tzyCATjOmNt-BAOquQg1Rw_Gr3y5HQ5";

async function testFetch() {
  console.log("Fetching generate-r2-url with a public preview path...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-r2-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        fileName: "previews/test-preview.mp4",
        folder: "",
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

testFetch();
