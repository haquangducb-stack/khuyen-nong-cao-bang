import { NextResponse } from 'next/server';

// Hàm chuyển đổi đơn vị kỹ thuật nông nghiệp trực tiếp, giữ nguyên 100% câu chữ bài viết
function normalizeVietnameseText(text) {
  return text
    .replace(/<[^>]*>/g, ' ') // Xóa thẻ HTML
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

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Thiếu nội dung văn bản' }, { status: 400 });
    }

    const cleanText = normalizeVietnameseText(text);

    // Chia văn bản thành các câu/đoạn nhỏ dưới 180 ký tự để không bao giờ bị cắt ngang
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
        // Nếu 1 câu đơn lẻ dài hơn 180 ký tự thì cắt theo dấu phẩy hoặc khoảng trắng
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

    // Tạo danh sách URL âm thanh Google TTS cho toàn bộ các đoạn của bài viết
    const audioUrls = chunks.map(
      (chunk) =>
        `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          chunk
        )}&tl=vi&client=tw-ob`
    );

    return NextResponse.json({ audioUrls, totalChunks: chunks.length });
  } catch (error) {
    console.error('Lỗi TTS:', error);
    return NextResponse.json({ error: 'Không thể tạo âm thanh' }, { status: 500 });
  }
}