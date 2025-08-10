const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');

const siteUrl = 'https://read.maxclickempire.com';
const postsDir = path.join(process.cwd(), 'posts');
const indexNowKey = '9b1fb73319b04fb3abb5ed09be53d65e';

// Load post URLs
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
const urls = postFiles.map(file => `${siteUrl}/posts/${file}`);

// ✅ Load Google Credentials from credentials.json
let credentials;
try {
  const raw = fs.readFileSync('credentials.json', 'utf8');
  credentials = JSON.parse(raw);
} catch (err) {
  console.error('❌ Failed to read credentials.json:', err.message);
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