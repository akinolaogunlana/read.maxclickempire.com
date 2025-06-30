// ✅ Supreme SEO Ecosystem Generator by MaxClickEmpire import fs from 'fs'; import path from 'path'; import { create } from 'xmlbuilder2';

// ===================== CONFIG ===================== const siteUrl = 'https://read.maxclickempire.com'; const postsDir = path.join(process.cwd(), 'posts'); const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html')); const today = new Date().toISOString();

const enhancerScriptTag = <script src="https://cdn.jsdelivr.net/gh/akinolaogunlana/read.maxclickempire.com@main/seo-enhancer.js" defer></script>;

// ===================== UTILS ===================== function extractMeta(filePath) { const content = fs.readFileSync(filePath, 'utf-8'); const title = content.match(/<title>(.?)</title>/i)?.[1] || 'Untitled'; const desc = content.match(/<meta name="description" content="(.?)"/i)?.[1] || 'No description.'; return { title, desc, content }; }

function calculateKeywordDensity(content) { const text = content.replace(/<[^>]+>/g, '').toLowerCase(); const words = text.match(/\b\w+\b/g) || []; const freq = {}; words.forEach(word => { freq[word] = (freq[word] || 0) + 1; }); const total = words.length; const density = Object.entries(freq) .sort((a, b) => b[1] - a[1]) .slice(0, 10) .map(([word, count]) => ${word}: ${(count / total * 100).toFixed(2)}%); return density; }

function suggestInternalLinks(content, keywords) { const keywordMap = { "Google Docs": "/posts/google-docs-template-guide.html", "SEO tools": "/posts/best-seo-tools.html", "affiliate marketing": "/posts/affiliate-marketing-for-beginners.html", "AI tools": "/posts/ai-tools-for-creators.html" }; let updatedContent = content; keywords.forEach(keyword => { const cleanKeyword = keyword.split(':')[0]; if (keywordMap[cleanKeyword]) { const link = <a href="${keywordMap[cleanKeyword]}" title="Learn more about ${cleanKeyword}">${cleanKeyword}</a>; const regex = new RegExp((?<!href=")\b(${cleanKeyword})\b, 'i'); updatedContent = updatedContent.replace(regex, link); } }); return updatedContent; }

// ===================== SITEMAP ===================== const sitemap = create({ version: '1.0', encoding: 'UTF-8' }) .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

postFiles.forEach(file => { const fullUrl = ${siteUrl}/posts/${file}; sitemap.ele('url') .ele('loc').txt(fullUrl).up() .ele('lastmod').txt(today).up() .ele('changefreq').txt('weekly').up() .ele('priority').txt('0.8').up() .up(); }); fs.writeFileSync('sitemap.xml', sitemap.end({ prettyPrint: true })); console.log('✅ sitemap.xml created');

// ===================== RSS ===================== const rss = create({ version: '1.0', encoding: 'UTF-8' }) .ele('rss', { version: '2.0' }) .ele('channel') .ele('title').txt('MaxClickEmpire RSS Feed').up() .ele('link').txt(siteUrl).up() .ele('description').txt('News, templates, and tools to dominate online.').up();

postFiles.forEach(file => { const filePath = path.join(postsDir, file); const { title, desc } = extractMeta(filePath); const url = ${siteUrl}/posts/${file}; rss.ele('item') .ele('title').txt(title).up() .ele('link').txt(url).up() .ele('guid').txt(url).up() .ele('description').txt(desc).up() .ele('pubDate').txt(new Date().toUTCString()).up() .up(); }); fs.writeFileSync('rss.xml', rss.end({ prettyPrint: true })); console.log('✅ rss.xml created');

// ===================== ROBOTS.TXT ===================== const robots = User-agent: * Allow: / Sitemap: ${siteUrl}/sitemap.xml Crawl-delay: 5.trim(); fs.writeFileSync('robots.txt', robots); console.log('✅ robots.txt created');

// ===================== SEO SCRIPT INJECTION + KEYWORD ANALYSIS ===================== postFiles.forEach(file => { const filePath = path.join(postsDir, file); let content = fs.readFileSync(filePath, 'utf-8'); const { content: cleanContent } = extractMeta(filePath);

// Keyword density const topKeywords = calculateKeywordDensity(cleanContent); console.log(📈 Keyword Density (${file}):, topKeywords);

// Internal link suggestion content = suggestInternalLinks(content, topKeywords);

// SEO script injection if (!content.includes('seo-enhancer.js')) { content = content.includes('</body>') ? content.replace('</body>', ${enhancerScriptTag}\n</body>) : ${content}\n${enhancerScriptTag}; }

fs.writeFileSync(filePath, content); console.log(🔁 SEO processed: ${file}); });

  
