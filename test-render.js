import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: "new"
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('UNCAUGHT PAGE ERROR:', err.message);
  });

  console.log("Navigating to http://localhost:3000/");
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log("Navigation successful!");
    
    // Check if the app rendered
    const content = await page.content();
    if (content.includes('T.A.E. Combine')) {
      console.log("App title found in HTML!");
    } else {
      console.log("App title not found!");
    }
  } catch (e) {
    console.error("Navigation failed:", e.message);
  } finally {
    await browser.close();
  }
})();
