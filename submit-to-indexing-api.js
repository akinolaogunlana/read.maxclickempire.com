import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import axios from 'axios';

// Config
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e';

// Load HTML posts
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// Load credentials from ENV
let credentials;
try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.');
  }
  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} catch (err) {
  console.error('❌ Failed to load credentials:', err.message);
  process.exit(1);
}

// Authenticate using credentials from env
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const indexing = google.indexing({ version: 'v3', auth });

// Submit to Google + IndexNow
async function submitUrls() {
  for (const url of urls) {
    try {
      // Google Indexing
      await auth.authorize();
      await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' },
      });
      console.log(`✅ Google Indexed: ${url}`);

      // IndexNow (Bing/Yandex)
      await axios.post(
        'https://api.indexnow.org/indexnow',
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
