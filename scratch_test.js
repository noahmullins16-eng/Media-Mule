const url = "https://awaorpybjweyndtjnklg.supabase.co/functions/v1/custom-password-reset";
const apiKey = "sb_publishable_tzyCATjOmNt-BAOquQg1Rw_Gr3y5HQ5";

async function testReset() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email: "contact.bilalnazam@gmail.com",
    }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testReset();
