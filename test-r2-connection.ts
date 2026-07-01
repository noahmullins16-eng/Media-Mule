/**
 * Quick test to verify R2 connection is working
 * Run this in your browser console or as a test file
 */

import { r2Storage } from "./src/lib/r2-storage";

export async function testR2Connection() {
  console.log("🔍 Testing R2 Connection...");
  console.log("Account ID:", import.meta.env.VITE_R2_ACCOUNT_ID);
  console.log("Bucket Name:", import.meta.env.VITE_R2_BUCKET_NAME);
  console.log("Endpoint:", import.meta.env.VITE_R2_ENDPOINT);

  try {
    // Test 1: Get public URL (should work without uploading)
    console.log("\n📝 Test 1: Generating public URL...");
    const publicUrl = r2Storage.getPublicUrl("test-file.txt", "test");
    console.log("✅ Public URL:", publicUrl);

    // Test 2: Try to list files
    console.log("\n📝 Test 2: Listing files...");
    const files = await r2Storage.listFiles();
    console.log("✅ Files in bucket:", files.length);

    console.log("\n🎉 R2 Connection is working!");
    return true;
  } catch (error) {
    console.error("❌ R2 Connection failed:", error);
    return false;
  }
}

// To use this:
// 1. Import in your component: import { testR2Connection } from "@/path/to/this/file"
// 2. Call in useEffect or event handler: await testR2Connection()
// 3. Check browser console for results
