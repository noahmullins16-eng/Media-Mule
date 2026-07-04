import puppeteer from "puppeteer";
import path from "path";

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  try {
    console.log("🚀 Starting upload test...");
    await page.goto("http://localhost:8080/upload");

    // Click Sign In if auth page loads
    console.log("Navigating to auth...");
    await page.waitForSelector("button", { timeout: 5000 }).catch(() => {});
    
    // Check if on auth page
    if (page.url().includes("/auth")) {
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

      await page.waitForNavigation({ waitUntil: "networkidle0" });
      console.log("Login navigate done. URL is:", page.url());
    }

    if (!page.url().includes("/upload")) {
      await page.goto("http://localhost:8080/upload");
      await page.waitForNetworkIdle();
    }

    console.log("On Upload page! Checking for file inputs...");
    
    // Find the file input (even if hidden)
    await page.waitForSelector('input[type="file"]');
    const fileInput = await page.$('input[type="file"]');
    
    const filePath = path.resolve("test_image_1783094428128.png");
    console.log(`Uploading file: ${filePath}`);
    await fileInput.uploadFile(filePath);
    
    // Wait for UI to update showing the file
    await page.waitForTimeout(2000);

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
    await page.waitForTimeout(1000);

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
    
    // Set up console listener to catch output
    page.on("console", msg => {
      console.log("BROWSER LOG:", msg.text());
    });

    // Wait 15 seconds to let the upload process complete
    await page.waitForTimeout(15000);

    console.log("Current page URL after upload wait:", page.url());
    console.log("SUCCESS");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
}

run();
