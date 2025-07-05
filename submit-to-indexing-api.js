const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');
const { Buffer } = require('buffer');

const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e';

// Load post URLs
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// Load Google Credentials from Base64
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

// Authenticate Google Indexing API
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const indexing = google.indexing({ version: 'v3', auth });

// Submit each URL
async function submitUrls() {
  try {
    await auth.authorize();

    for (const url of urls) {
      try {
        // Google Indexing
        await indexing.urlNotifications.publish({
          requestBody: {
            url,
            type: 'URL_UPDATED',
          },
        });
        console.log(`✅ Google Indexed: ${url}`);

        // IndexNow
        await axios.post('https://api.indexnow.org/indexnow', {
          host: 'read.maxclickempire.com',
          key: indexNowKey,
          urlList: [url],
        }, {
          headers: { 'Content-Type': 'application/json' },
        });
        console.log(`📡 IndexNow submitted: ${url}`);
      } catch (error) {
        console.error(`❌ Failed for: ${url}`);
        console.error(error.response?.data || error.message);
      }
    }
  } catch (err) {
    console.error('❌ Authentication or submission error:', err.message);
    process.exit(1);
  }
}

submitUrls();
