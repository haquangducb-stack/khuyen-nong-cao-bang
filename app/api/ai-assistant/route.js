import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trong file .env.local!' },
        { status: 500 }
      );
    }

    const { task, payload } = await req.json();
    let prompt = '';
    let expectJson = false;

    if (task === 'edit_post') {
      expectJson = true;
      prompt = `Bạn là biên tập viên của Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng.
Hãy đọc thông tin bài viết sau và thực hiện:
1. Phân loại vào ĐÚNG 1 trong 8 chuyên mục sau: "Bản tin mùa vụ", "Bản tin thị trường", "Tin Khuyến nông Cao Bằng", "Tin từ Khuyến nông Quốc gia", "Kỹ thuật Chăn nuôi - Thú y", "Kỹ thuật Trồng trọt - Lâm nghiệp", "Kỹ thuật Thủy sản", "Giới thiệu sản phẩm".
2. Biên tập lại tiêu đề cho rõ ràng, chuẩn mực.
3. Viết đoạn tóm tắt ngắn gọn (2-3 câu).
4. Biên tập lại nội dung dưới dạng HTML sạch (<p>, <strong>, <ul>, <li>), văn phong dễ hiểu với nông dân miền núi Cao Bằng, giữ nguyên link nguồn nếu có.

Dữ liệu đầu vào:
- Tiêu đề gốc: ${payload.title || ''}
- Nội dung thô: ${payload.content || ''}

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không bọc markdown \`\`\`json) theo cấu trúc:
{"title": "...", "category": "...", "summary": "...", "content": "..."}`;
    } else if (task === 'generate_quiz') {
      expectJson = true;
      const count = payload.count || 5;
      prompt = `Bạn là chuyên gia kỹ thuật nông lâm ngư nghiệp tại tỉnh Cao Bằng.
Hãy soạn ${count} câu hỏi trắc nghiệm khách quan về chủ đề: "${payload.topic}".
Mỗi câu có đúng 4 phương án trả lời, chỉ số đáp án đúng (0, 1, 2 hoặc 3) và lời giải thích kỹ thuật ngắn gọn, dễ hiểu.

Trả về DUY NHẤT một mảng JSON hợp lệ (không bọc markdown \`\`\`json) theo cấu trúc:
[{"q": "Nội dung câu hỏi?", "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"], "answer": 0, "explain": "Giải thích kỹ thuật..."}]`;
    } else if (task === 'generate_survey') {
      expectJson = true;
      const count = payload.count || 5;
      prompt = `Bạn là cán bộ kế hoạch của Trung tâm Khuyến nông và Giống Nông lâm nghiệp Cao Bằng.
Hãy thiết kế ${count} câu hỏi khảo sát thực tế cho chủ đề: "${payload.topic}".
Phân bổ linh hoạt 3 loại câu hỏi:
- "choice": Trắc nghiệm chọn 1 đáp án (kèm mảng options)
- "multi": Chọn nhiều đáp án (kèm mảng options)
- "text": Nhập chữ hoặc số liệu (options để mảng rỗng [])

Trả về DUY NHẤT một mảng JSON hợp lệ (không bọc markdown \`\`\`json) theo cấu trúc:
[{"label": "Nội dung câu hỏi khảo sát?", "type": "choice", "options": ["Lựa chọn 1", "Lựa chọn 2"]}]`;
    } else if (task === 'answer_qa') {
      expectJson = false;
      prompt = `Bạn là kỹ sư khuyến nông của Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng.
Hãy trả lời câu hỏi sau của bà con nông dân tại ${payload.commune || 'tỉnh Cao Bằng'}:
"${payload.question}"

Yêu cầu: Trả lời trực tiếp, thân thiện, dễ áp dụng với điều kiện khí hậu và tập quán canh tác miền núi Cao Bằng; trình bày rõ ràng các bước xử lý, tên thuốc/vắc-xin hoặc giống cây/con phù hợp (nếu có). Không dùng định dạng markdown rườm rà.`;
    } else {
      return NextResponse.json({ error: 'Tác vụ AI không hợp lệ' }, { status: 400 });
    }

    // Danh sách model ưu tiên từ nhanh nhất đến dự phòng khi quá tải
    const candidateModels = [
      'gemini-3.8-flash'
    ];

    let rawText = '';
    let lastError = 'Không thể kết nối tới máy chủ AI';

    for (const modelName of candidateModels) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            ...(expectJson
              ? { generationConfig: { responseMimeType: 'application/json' } }
              : {})
          })
        }
      );

      const geminiData = await geminiRes.json();

      if (geminiRes.ok) {
        rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) break; // Thành công thì thoát vòng lặp ngay
      } else {
        lastError = geminiData.error?.message || `Lỗi từ model ${modelName}`;
        // Nếu lỗi không phải do quá tải/giới hạn (ví dụ sai API key) thì dừng luôn
        if (geminiRes.status !== 503 && geminiRes.status !== 429 && geminiRes.status !== 404) {
          break;
        }
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: lastError }, { status: 502 });
    }

    if (expectJson) {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ success: true, text: rawText.trim() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
