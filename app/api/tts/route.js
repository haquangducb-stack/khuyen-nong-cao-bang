import { NextResponse } from 'next/server';

// Bộ chuẩn hóa nhanh các đơn vị đo lường và từ viết tắt nông nghiệp
function normalizeVietnameseFast(text) {
  return text
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 đến $2')
    .replace(/đ\/kg/gi, 'đồng một ki lô gam')
    .replace(/đ\/con/gi, 'đồng một con')
    .replace(/đ\/cây/gi, 'đồng một cây')
    .replace(/đ\/lít/gi, 'đồng một lít')
    .replace(/(\d+)\s*°C/gi, '$1 độ xê')
    .replace(/(\d+)\s*m²/gi, '$1 mét vuông')
    .replace(/(\d+)\s*m³/gi, '$1 mét khối')
    .replace(/\b(\d+)\s*kg\b/gi, '$1 ki lô gam')
    .replace(/\b(\d+)\s*ha\b/gi, '$1 héc ta')
    .replace(/\b(\d+)\s*cm\b/gi, '$1 xen ti mét')
    .replace(/\b(\d+)\s*g\b/gi, '$1 gam')
    .replace(/(\d+)\s*%/g, '$1 phần trăm')
    .replace(/\bHTX\b/g, 'hợp tác xã')
    .replace(/\bKNQG\b/g, 'khuyến nông quốc gia')
    .replace(/\bNLN\b/g, 'nông lâm nghiệp')
    .replace(/\bNN&MT\b/g, 'nông nghiệp và môi trường')
    .replace(/\bNPK\b/g, 'Nờ Pê Ka')
    .replace(/\bSĐT\b/g, 'số điện thoại')
    .replace(/\bVD:/gi, 'ví dụ:')
    .replace(/\//g, ' trên ');
}

// Dùng Gemini AI chuyển đổi đoạn văn thành lời đọc tự nhiên như phát thanh viên
async function smartRewriteForSpeech(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return normalizeVietnameseFast(text);

  try {
    const prompt = `Bạn là phát thanh viên đài truyền hình. Hãy chuyển đổi đoạn văn bản tiếng Việt dưới đây thành văn bản thuần túy để đọc thành tiếng (Text-to-Speech) sao cho tự nhiên nhất:
- Chuyển toàn bộ ký hiệu, đơn vị đo lường, tiền tệ, từ viết tắt thành chữ đọc tiếng Việt chuẩn (ví dụ: "đ/kg" -> "đồng một ki lô gam", "15°C" -> "mười lăm độ xê", "100m²" -> "một trăm mét vuông", "1,5 - 1,8m" -> "một phẩy năm đến một phẩy tám mét", "HTX" -> "hợp tác xã", "NPK" -> "nờ pê ka").
- Giữ nguyên ý nghĩa, không thêm bớt nội dung, không dùng ký hiệu đặc biệt.

Đoạn văn gốc:
"${text}"`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (res.ok) {
      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (aiText) return aiText;
    }
  } catch {
    // Nếu AI bận thì tự lùi về bộ quy tắc chuẩn hóa nhanh
  }

  return normalizeVietnameseFast(text);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawText = searchParams.get('q') || '';
  if (!rawText) return new NextResponse('Missing text', { status: 400 });

  // Nhờ AI dịch ngữ cảnh sang lời đọc tự nhiên trước khi tạo file âm thanh
  const spokenText = await smartRewriteForSpeech(rawText);

  const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=${encodeURIComponent(spokenText)}`;
  const res = await fetch(ttsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!res.ok) return new NextResponse('TTS Error', { status: 502 });

  const audioBuffer = await res.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}