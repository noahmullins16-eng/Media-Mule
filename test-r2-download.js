async function runTest() {
  const url = "https://media-mule-storage.02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com/3000c959-5d25-4cdd-94a6-61d800f3ab97/d41786e9-a72f-4f15-971c-f58f33d3595f.mp4";
  console.log(`Fetching public R2 URL: ${url}`);
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log("Response status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch (error) {
    console.error("HTTP Fetch failed:", error);
  }
}

runTest();
