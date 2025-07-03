// ✅ MaxClickEmpire Submit-to-Indexing API
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import fetch from 'node-fetch'; // Make sure to install: npm install node-fetch

// === CONFIG ===
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const credentialsPath = path.join(process.cwd(), 'credentials.json');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e'; // Your IndexNow key
const refreshWindowDays = 60;

// === HELPER: Should Refresh?
function shouldRefresh(file) {
  const stats = fs.statSync(file);
  const lastModified = new Date(stats.mtime);
  const ageInDays = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays >= refreshWindowDays;
}

// === AUTHENTICATE GOOGLE API ===
const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/indexing']
});
const indexing = google.indexing({ version: 'v3', auth });

// === GET ELIGIBLE POSTS ===
let files = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));
files = files.filter(f => shouldRefresh(path.join(postsDir, f)));
files = files.sort(() => Math.random() - 0.5); // randomize order

// === MAIN: Submit URLs ===
async function submitUrls() {
  console.log(`📦 Preparing to submit ${files.length} post(s)...`);

  for (const file of files) {
    const url = `${siteUrl}/posts/${file}`;
    try {
      // === Submit to Google
      const gResponse = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type: 'URL_UPDATED',
        },
      });
      console.log(`✅ Google indexed: ${url} | Time: ${new Date().toISOString()}`);

      // === Submit to IndexNow
      const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${indexNowKey}`;
      const inResponse = await fetch(indexNowUrl);
      if (inResponse.ok) {
        console.log(`✅ IndexNow pinged: ${url}`);
      } else {
        console.warn(`⚠️ IndexNow failed for: ${url}`);
      }

      // Optional wait between requests to mimic natural behavior
      await new Promise(res => setTimeout(res, Math.floor(Math.random() * 2000) + 1000)); // 1-3 sec delay

    } catch (error) {
      console.error(`❌ Error submitting ${url}`);
      console.error(error.response?.data || error.message);
    }
  }

  console.log("🎉 All eligible URLs processed.");
}

submitUrls();
