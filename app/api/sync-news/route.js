import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST() {
  try {
    const targetUrl = 'https://khuyennongvn.gov.vn/';
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Không kết nối được tới khuyennongvn.gov.vn' }, { status: 502 });
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles = [];
    const seenTitles = new Set();

    $('a').each((_, el) => {
      const linkEl = $(el);
      const rawTitle = linkEl.attr('title') || linkEl.text();
      const title = rawTitle ? rawTitle.replace(/\s+/g, ' ').trim() : '';
      let href = linkEl.attr('href');

      if (!title || title.length < 30 || !href || href.startsWith('#') || href.startsWith('javascript')) return;
      if (seenTitles.has(title)) return;

      const container = linkEl.closest('article, .news-item, .item, li, div');
      const img = container.find('img').first().attr('src') || container.find('img').first().attr('data-src');
      const summary = container.find('p, .sapo, .summary, .desc').first().text().replace(/\s+/g, ' ').trim();

      if (!href.startsWith('http')) {
        href = `https://khuyennongvn.gov.vn${href.startsWith('/') ? '' : '/'}${href}`;
      }
      if (!href.includes('khuyennongvn.gov.vn')) return;

      const thumbUrl = img
        ? (img.startsWith('http') ? img : `https://khuyennongvn.gov.vn${img.startsWith('/') ? '' : '/'}${img}`)
        : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';

      seenTitles.add(title);
      articles.push({
        title,
        category: 'Kỹ thuật Khuyến nông QG',
        summary: (summary && summary !== title) ? summary : 'Tin tức và tiến bộ kỹ thuật từ Trung tâm Khuyến nông Quốc gia.',
        content: `<p>${(summary && summary !== title) ? summary : title}</p><p><em>Nguồn tin: Cổng thông tin Điện tử Trung tâm Khuyến nông Quốc gia (khuyennongvn.gov.vn).</em></p>`,
        thumbnail: thumbUrl,
        source_name: 'Khuyến nông Quốc gia',
        source_url: href
      });
    });

    return NextResponse.json({
      success: true,
      articles: articles.slice(0, 15)
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}