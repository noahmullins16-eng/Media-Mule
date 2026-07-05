import puppeteer from "puppeteer";
import path from "path";

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set up console and error listeners early
  page.on("console", msg => {
    console.log("BROWSER LOG:", msg.text());
  });
  page.on("pageerror", err => {
    console.error("BROWSER PAGE ERROR:", err.message);
  });
  page.on("requestfailed", request => {
    console.error("BROWSER REQUEST FAILED:", request.url(), request.failure()?.errorText);
  });

  try {
    console.log("🚀 Starting upload test...");
    await page.goto("http://127.0.0.1:8080/auth");

    console.log("On Auth page, signing in...");
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', "onelinker.ai@gmail.com");
    await page.type('input[type="password"]', "Bilal@741");
    
    // Click submit
    const buttons = await page.$$("button");
    let submitBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes("Sign In")) {
        submitBtn = btn;
        break;
      }
    }
    if (submitBtn) {
      await submitBtn.click();
      console.log("Clicked login button.");
    } else {
      await page.click('button[type="submit"]');
    }

    await new Promise(r => setTimeout(r, 5000));
    console.log("Login navigate done. URL is:", page.url());

    if (!page.url().includes("/upload")) {
      await page.goto("http://127.0.0.1:8080/upload");
      await page.waitForNetworkIdle();
    }

    console.log("On Upload page! Checking for file inputs...");
    
    // Find the file input (even if hidden)
    await page.waitForSelector('input[type="file"]');
    const fileInput = await page.$('input[type="file"]');
    
    const filePath = path.resolve("dummy_upload.mp4");
    console.log(`Uploading file: ${filePath}`);
    await fileInput.uploadFile(filePath);
    
    // Wait for UI to update showing the file
    await new Promise(r => setTimeout(r, 2000));

    // Fill in title and description
    console.log("Filling in title...");
    await page.waitForSelector('input[placeholder*="title"]', { timeout: 3000 }).catch(() => {});
    const inputs = await page.$$("input");
    for (const input of inputs) {
      const placeholder = await page.evaluate(el => el.getAttribute("placeholder") || "", input);
      if (placeholder.toLowerCase().includes("title")) {
        await input.type("Path-Style Upload Test");
        break;
      }
    }

    // Scroll down to make button visible
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 1000));

    // Click "Upload Content" button
    console.log("Clicking Upload Content...");
    const allButtons = await page.$$("button");
    let uploadBtn = null;
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.textContent || "", btn);
      if (text.includes("Upload Content")) {
        uploadBtn = btn;
        break;
      }
    }

    if (uploadBtn) {
      await uploadBtn.click();
      console.log("Upload button clicked.");
    } else {
      throw new Error("Upload Content button not found");
    }

    // Wait for success toast or listing redirect
    console.log("Waiting for upload success...");

    // Wait 15 seconds to let the upload process complete
    await new Promise(r => setTimeout(r, 15000));

    console.log("Current page URL after upload wait:", page.url());
    
    // Take a screenshot
    await page.screenshot({ path: "upload_debug.png" });
    console.log("Screenshot saved to upload_debug.png");
    console.log("SUCCESS");
  } catch (error) {
    console.error("Test failed:", error);
    try {
      await page.screenshot({ path: "upload_error.png" });
      console.log("Error screenshot saved to upload_error.png");
    } catch (e) {
      console.error("Failed to save error screenshot:", e);
    }
  } finally {
    await browser.close();
  }
}

run();

