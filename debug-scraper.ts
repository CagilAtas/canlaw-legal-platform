// Debug scraper to see what's actually on the page

import puppeteer from 'puppeteer';

async function debugPage() {
  const url = 'https://www.ontario.ca/laws/statute/00e41';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: false }); // Show browser
  const page = await browser.newPage();

  console.log('Loading page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Waiting 5 more seconds for JavaScript to render...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Getting page content...');

  // Get title
  const title = await page.title();
  console.log('\nPage title:', title);

  // Get all h1 tags
  const h1s = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(el => el.textContent);
  });
  console.log('\nFirst 10 headings:', h1s);

  // Check for statute content
  const hasStatute = await page.evaluate(() => {
    var text = document.body.textContent || '';
    return {
      hasESA: text.includes('Employment Standards'),
      hasSection54: text.includes('Section 54') || text.includes('54.'),
      textLength: text.length,
      firstPara: text.substring(0, 1000)
    };
  });

  console.log('\nContent check:', hasStatute);

  console.log('\nPress Ctrl+C to close browser...');
  // Keep open for manual inspection
  await new Promise(resolve => setTimeout(resolve, 60000));

  await browser.close();
}

debugPage().catch(console.error);
