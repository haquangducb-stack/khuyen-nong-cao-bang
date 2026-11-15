import { NextResponse } from 'next/server';

function normalizeVietnameseText(text) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 đến $2')
    .replace(/đ\/kg/gi, 'đồng trên một ki-lô-gam')
    .replace(/đ\/con/gi, 'đồng trên một con')
    .replace(/đ\/tấn/gi, 'đồng trên một tấn')
    .replace(/VNĐ/gi, 'việt nam đồng')
    .replace(/(\d+)\s*°C/gi, '$1 độ xê')
    .replace(/(\d+)\s*ha\b/gi, '$1 héc-ta')
    .replace(/(\d+)\s*kg\b/gi, '$1 ki-lô-gam')
    .replace(/(\d+)\s*g\b/gi, '$1 gam')
    .replace(/(\d+)\s*ml\b/gi, '$1 mi-li-lít')
    .replace(/(\d+)\s*cm\b/gi, '$1 xen-ti-mét')
    .replace(/(\d+)\s*m2\b/gi, '$1 mét vuông')
    .replace(/(\d+)\s*%/g, '$1 phần trăm')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. POST: Chia toàn bộ bài viết thành các đoạn ngắn < 180 ký tự (giữ nguyên 100% nội dung)
export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Thiếu nội dung văn bản' }, { status: 400 });
    }

    const cleanText = normalizeVietnameseText(text);
    const rawSentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of rawSentences) {
      const s = sentence.trim();
      if (!s) continue;
      if ((currentChunk + ' ' + s).trim().length <= 180) {
        currentChunk = (currentChunk + ' ' + s).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (s.length > 180) {
          const words = s.split(' ');
          let temp = '';
          for (const w of words) {
            if ((temp + ' ' + w).trim().length <= 180) {
              temp = (temp + ' ' + w).trim();
            } else {
              chunks.push(temp);
              temp = w;
            }
          }
          if (temp) currentChunk = temp;
        } else {
          currentChunk = s;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Trỏ về chính API nội bộ (/api/tts?q=...) để trình duyệt không bị Google chặn Referer
    const audioUrls = chunks.map((chunk) => `/api/tts?q=${encodeURIComponent(chunk)}`);

    return NextResponse.json({ audioUrls });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi xử lý văn bản' }, { status: 500 });
  }
}

// 2. GET: Tải luồng MP3 sạch từ Google TTS và trả thẳng về cho trình duyệt phát
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) return new NextResponse('Missing text', { status: 400 });

  try {
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      q
    )}&tl=vi&client=tw-ob`;

    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse('TTS upstream error', { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Error fetching audio', { status: 500 });
  }
}