const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');

// 🔐 Load credentials
let credentials;
try {
  const base64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!base64) throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON');
  credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
} catch (err) {
  console.error('❌ Failed to decode credentials:', err.message);
  process.exit(1);
}

// 📄 Get all post URLs
const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(__dirname, 'posts');
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// 🔐 Authenticate Google Indexing API
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const indexing = google.indexing({ version: 'v3', auth });

// 🚀 Index URLs
async function submitUrls() {
  await auth.authorize();
  const indexNowKey = process.env.INDEXNOW_KEY;

  for (const url of urls) {
    try {
      // Google Indexing
      await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' },
      });
      console.log(`✅ Google Indexed: ${url}`);
    } catch (err) {
      console.error(`❌ Google failed: ${url}`, err.response?.data || err.message);
    }

    if (indexNowKey) {
      try {
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
      } catch (err) {
        console.error(`❌ IndexNow failed: ${url}`, err.response?.data || err.message);
      }
    } else {
      console.warn('⚠️ INDEXNOW_KEY not found. Skipping IndexNow.');
    }
  }
}

submitUrls();
