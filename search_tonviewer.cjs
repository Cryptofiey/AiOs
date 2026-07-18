const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://tonviewer.com/search?q=Telegram+Gifts');
  await page.waitForTimeout(5000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 1000));
  await browser.close();
})();
