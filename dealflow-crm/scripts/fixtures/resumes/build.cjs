// Builds the test resume PDFs from the HTML fixtures next to this file (needs Playwright).
// node scripts/fixtures/resumes/build.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith(".html"))) {
    await page.setContent(fs.readFileSync(path.join(__dirname, f), "utf8"), { waitUntil: "load" });
    await page.pdf({ path: path.join(__dirname, f.replace(/\.html$/, ".pdf")), format: "Letter", printBackground: true, preferCSSPageSize: true });
    console.log("built", f);
  }
  await browser.close();
})();
