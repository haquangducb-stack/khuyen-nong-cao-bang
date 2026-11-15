import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { rawText, commune } = await req.json();
    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập ý chính hoặc triệu chứng trước.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.' }, { status: 500 });
    }

    const prompt = `Bạn là trợ lý khuyến nông tỉnh Cao Bằng. Hãy giúp người nông dân viết lại ý ngắn gọn sau thành một câu hỏi kỹ thuật rõ ràng, lịch sự, đầy đủ thông tin để gửi tới kỹ sư Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng.
- Địa phương người hỏi: ${commune || 'Tỉnh Cao Bằng'}
- Ý ngắn gọn người dân nhập: "${rawText}"
Yêu cầu: Chỉ trả về đúng nội dung câu hỏi đã hoàn chỉnh (khoảng 2-4 câu, giọng văn chân chất, dễ hiểu, có gợi ý nêu rõ giống cây/vật nuôi, thời gian xuất hiện triệu chứng nếu cần), tuyệt đối không thêm lời chào hay giải thích thừa.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Lỗi kết nối Gemini 3.8 Flash' },
        { status: response.status }
      );
    }

    const draftedQuestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return NextResponse.json({ draftedQuestion });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi hệ thống khi soạn câu hỏi AI' }, { status: 500 });
  }
}