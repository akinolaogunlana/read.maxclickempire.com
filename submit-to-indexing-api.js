import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import axios from 'axios';

// Config
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const credentialsPath = path.join(process.cwd(), 'credentials.json');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e';

// Load HTML posts
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// Google Indexing
const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const indexing = google.indexing({
  version: 'v3',
  auth: auth,
});

// Submit to Google + IndexNow
async function submitUrls() {
  for (const url of urls) {
    try {
      // Google Indexing
      const res = await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' },
      });
      console.log(`✅ Google Indexed: ${url}`);

      // IndexNow (Bing/Yandex)
      const indexNowRes = await axios.post(
        `https://api.indexnow.org/indexnow`,
        {
          host: 'read.maxclickempire.com',
          key: indexNowKey,
          urlList: [url],
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log(`📡 IndexNow submitted: ${url}`);
    } catch (error) {
      console.error(`❌ Failed for: ${url}`);
      console.error(error.response?.data || error.message);
    }
  }
}

submitUrls();
