// Simple test to see if ontario.ca loads

import puppeteer from 'puppeteer';

async function test() {
  console.log('Testing ontario.ca/laws...');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.ontario.ca/laws/statute/00e41', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait extra for JS to render
  await new Promise(r => setTimeout(r, 5000));

  const result = await page.evaluate(() => {
    var text = document.body.textContent || '';
    return {
      hasContent: text.length > 1000,
      hasEmployment: text.toLowerCase().includes('employment'),
      textLength: text.length,
      sample: text.substring(0, 500)
    };
  });

  console.log('Result:', result);

  await browser.close();
}

test().catch(e => console.error('Error:', e.message));
