import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import axios from 'axios';
import { Buffer } from 'buffer'; // For decoding Base64

// Config
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e';

// 📄 Load posts
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// 🔐 Load & parse Base64-encoded credentials
let credentials;
try {
  const base64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!base64) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is missing');
  const json = Buffer.from(base64, 'base64').toString('utf8');
  credentials = JSON.parse(json);
} catch (err) {
  console.error('❌ Failed to load credentials:', err.message);
  process.exit(1);
}

// 🔐 Authenticate with Google Indexing API
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const indexing = google.indexing({ version: 'v3', auth });

// 🚀 Submit each post
async function submitUrls() {
  await auth.authorize();

  for (const url of urls) {
    try {
      // 📤 Google Indexing
      await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' },
      });
      console.log(`✅ Google Indexed: ${url}`);

      // 📤 IndexNow
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
