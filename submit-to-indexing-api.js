import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// ===================== CONFIG =====================
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const credentialsPath = path.join(process.cwd(), 'credentials.json');

// ===================== INIT AUTH =====================
const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/indexing']
});

const indexing = google.indexing({
  version: 'v3',
  auth: auth
});

// ===================== GET URLS =====================
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// ===================== SUBMIT =====================
async function submitUrls() {
  for (const url of urls) {
    try {
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type: 'URL_UPDATED',
        },
      });

      console.log(`✅ Indexed: ${url} | Status: ${response.status} | Time: ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`❌ Failed to index: ${url}`);
      console.error(error.response?.data?.error || error.message);
    }
  }
}

submitUrls();
