'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('news');
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  // Trạng thái đọc văn bản (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingArticleId, setSpeakingArticleId] = useState(null);

  // Trạng thái Hỏi đáp kỹ thuật
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    full_name: '',
    address: '',
    category: 'Trồng trọt',
    content: '',
  });
  const [submittingQA, setSubmittingQA] = useState(false);

  // Trạng thái Khảo sát
  const [surveys, setSurveys] = useState([]);
  const [votedSurveys, setVotedSurveys] = useState({});

  // Trạng thái Đấu trường nông dân (Quiz)
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const quizData = [
    {
      question: 'Thời điểm tiêm phòng vắc-xin Lở mồm long móng định kỳ tốt nhất cho đàn trâu, bò tại Cao Bằng là khi nào?',
      options: [
        'Vụ Xuân Hè (tháng 3–4) và vụ Thu Đông (tháng 9–10)',
        'Chỉ tiêm vào giữa mùa đông giá rét',
        'Khi vật nuôi đang sốt cao và bỏ ăn',
        'Chỉ tiêm một lần duy nhất trong đời vật nuôi',
      ],
      answer: 0,
    },
    {
      question: 'Giống lợn bản địa đặc trưng nào của tỉnh Cao Bằng nổi tiếng với khả năng chịu rét, thịt thơm ngon và đang được bảo tồn nguồn gen?',
      options: ['Lợn Móng Cái', 'Lợn Hạ Lang', 'Lợn rừng Thái Lan', 'Lợn Landrace'],
      answer: 1,
    },
    {
      question: 'Biện pháp hiệu quả nhất để phòng chống rét đậm, rét hại cho đàn đại gia súc ở vùng cao Cao Bằng là gì?',
      options: [
        'Thả rông gia súc vào rừng sâu tự kiếm ăn',
        'Che chắn chuồng trại kín gió, dự trữ rơm khô/cỏ ủ chua và bổ sung tinh bột, muối khoáng',
        'Tắm nước lạnh hàng ngày để tăng sức đề kháng',
        'Không cần lót nền chuồng vì trâu bò chịu rét tốt',
      ],
      answer: 1,
    },
  ];

  // Dữ liệu mẫu hiển thị ngay nếu Supabase chưa có bài viết
  const fallbackArticles = [
    {
      id: 'sample-1',
      title: 'Khung lịch thời vụ gieo trồng vụ Đông – Xuân năm 2026 - 2027 tại Cao Bằng',
      category: 'Trồng trọt',
      summary: 'Hướng dẫn bà con nông dân lựa chọn bộ giống lúa, ngô chủ lực ngắn ngày, chịu rét tốt và bố trí thời vụ gieo trồng hợp lý nhằm né tránh rét đậm, rét hại đầu vụ.',
      content: 'Để đảm bảo sản xuất vụ Đông – Xuân đạt năng suất cao, Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng khuyến cáo bà con tập trung làm đất sớm, vệ sinh đồng ruộng. Đối với trà lúa Xuân muộn, tiến hành gieo mạ từ cuối tháng 1 đến đầu tháng 2, cấy tập trung trong tháng 2 khi nhiệt độ trung bình ngày đêm đạt trên 15 độ C. Sử dụng các giống lúa chất lượng cao như Hương Thơm số 1, J02, Đài Thơm 8, kết hợp bón phân cân đối NPK và che phủ nilon 100% diện tích mạ để chống rét.',
      image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      title: 'Triển khai mô hình chuyển đổi đất trồng keo kém hiệu quả sang trồng quế bền vững',
      category: 'Lâm nghiệp',
      summary: 'Hỗ trợ người dân các xã vùng cao phát triển vùng nguyên liệu quế gắn với liên kết tiêu thụ sản phẩm theo Nghị định 58/2024/NĐ-CP.',
      content: 'Cây quế là loài cây đa tác dụng, mang lại giá trị kinh tế cao gấp 2 đến 3 lần so với trồng keo truyền thống nhờ khai thác được cả vỏ, cành, lá để chưng cất tinh dầu. Bà con cần chọn cây giống quế đạt tiêu chuẩn từ 12 đến 18 tháng tuổi, chiều cao trên 40 cm, mật độ trồng khoảng 3.300 cây trên 1 héc-ta, thực hiện phát dọn thực bì và bón lót phân chuồng hoai mục trước khi trồng vào vụ Xuân hoặc vụ Thu.',
      image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      title: 'Kỹ thuật ủ chua thức ăn xanh dự trữ cho trâu, bò trong mùa đông',
      category: 'Chăn nuôi',
      summary: 'Tận dụng thân cây ngô sau thu hoạch, cỏ voi và phụ phẩm nông nghiệp để chế biến thức ăn giàu dinh dưỡng cho đàn gia súc.',
      content: 'Nguyên liệu cỏ voi hoặc thân cây ngô sau khi thu hái cần phơi héo nhẹ còn độ ẩm khoảng 65 đến 70 phần trăm, băm ngắn từ 3 đến 5 cm. Phối trộn theo tỷ lệ 100 kg nguyên liệu xanh với 0,5 kg muối ăn và 5 kg cám ngô hoặc cám gạo. Nén thật chặt vào túi nilon chuyên dụng hoặc hố ủ, buộc kín miệng để lên men yếm khí. Sau 21 ngày thức ăn có mùi thơm chua nhẹ, màu vàng rơm là có thể cho trâu, bò ăn dần.',
      image_url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    fetchData();
    return () => {
      stopAllAudio();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    if (!supabase) {
      setArticles(fallbackArticles);
      setLoading(false);
      return;
    }

    try {
      const [newsRes, qaRes, surveyRes] = await Promise.all([
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
        supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      ]);

      if (newsRes.data && newsRes.data.length > 0) {
        setArticles(newsRes.data);
      } else {
        setArticles(fallbackArticles);
      }

      if (qaRes.data) setQuestions(qaRes.data);
      if (surveyRes.data) setSurveys(surveyRes.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      setArticles(fallbackArticles);
    } finally {
      setLoading(false);
    }
  };

  // Dừng toàn bộ âm thanh đang phát
  const stopAllAudio = () => {
    if (typeof window !== 'undefined') {
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.src = '';
        window.currentAudio = null;
      }
      window.speechSynthesis?.cancel();
    }
    setIsSpeaking(false);
    setSpeakingArticleId(null);
  };

  // Hàm đọc nguyên văn toàn bộ bài viết nối tiếp từng đoạn
  const handleReadArticle = async (article, e) => {
    if (e) e.stopPropagation();

    // Nếu đang đọc chính bài này thì bấm lần nữa để dừng
    if (isSpeaking && speakingArticleId === article.id) {
      stopAllAudio();
      return;
    }

    // Dừng bài trước (nếu có) trước khi đọc bài mới
    stopAllAudio();

    const fullContent = `${article.title}. ${article.summary || ''}. ${article.content || ''}`;

    try {
      setIsSpeaking(true);
      setSpeakingArticleId(article.id);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullContent }),
      });

      const data = await res.json();
      if (!data.audioUrls || data.audioUrls.length === 0) {
        throw new Error('Không có danh sách audioUrls');
      }

      let index = 0;
      let stopped = false;

      const playNextChunk = () => {
        if (stopped || index >= data.audioUrls.length) {
          setIsSpeaking(false);
          setSpeakingArticleId(null);
          window.currentAudio = null;
          return;
        }

        const audio = new Audio(data.audioUrls[index]);
        window.currentAudio = audio;

        audio.onended = () => {
          index++;
          playNextChunk();
        };

        audio.onerror = () => {
          index++;
          playNextChunk();
        };

        audio.play().catch((err) => {
          console.error('Lỗi phát audio:', err);
          stopped = true;
          fallbackBrowserSpeak(fullContent);
        });
      };

      playNextChunk();
    } catch (err) {
      console.error('Chuyển sang giọng đọc dự phòng:', err);
      fallbackBrowserSpeak(fullContent);
    }
  };

  const fallbackBrowserSpeak = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const plainText = text.replace(/<[^>]*>/g, ' ');
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingArticleId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingArticleId(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
      setSpeakingArticleId(null);
    }
  };

  // Gửi câu hỏi kỹ thuật mới
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.full_name.trim() || !newQuestion.content.trim()) return;

    setSubmittingQA(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('questions')
          .insert([{ ...newQuestion, status: 'pending' }])
          .select();

        if (!error && data) {
          setQuestions([data[0], ...questions]);
        }
      } else {
        setQuestions([
          {
            id: Date.now(),
            ...newQuestion,
            answer: null,
            created_at: new Date().toISOString(),
          },
          ...questions,
        ]);
      }
      setNewQuestion({ full_name: '', address: '', category: 'Trồng trọt', content: '' });
      alert('Đã gửi câu hỏi thành công! Cán bộ kỹ thuật Trung tâm Khuyến nông sẽ phản hồi sớm nhất.');
    } catch (err) {
      alert('Có lỗi xảy ra khi gửi câu hỏi, vui lòng thử lại.');
    } finally {
      setSubmittingQA(false);
    }
  };

  // Bình chọn khảo sát
  const handleVote = async (survey, optionIndex) => {
    if (votedSurveys[survey.id]) return;

    const updatedOptions = [...(survey.options || [])];
    if (updatedOptions[optionIndex]) {
      updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
    }

    setVotedSurveys({ ...votedSurveys, [survey.id]: true });
    setSurveys(surveys.map((s) => (s.id === survey.id ? { ...s, options: updatedOptions } : s)));

    if (supabase) {
      await supabase.from('surveys').update({ options: updatedOptions }).eq('id', survey.id);
    }
  };

  // Lọc bài viết
  const categories = ['Tất cả', 'Trồng trọt', 'Chăn nuôi', 'Lâm nghiệp', 'Thủy sản', 'Thị trường'];
  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'Tất cả' || art.category === selectedCategory;
    const matchesSearch =
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-gray-800">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-emerald-200 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                Sở Nông nghiệp và Môi trường tỉnh Cao Bằng
              </p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1 tracking-tight">
                CỔNG THÔNG TIN & TƯƠNG TÁC KHUYẾN NÔNG CAO BẰNG
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/admin"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-4 py-2 rounded-lg text-sm font-medium transition backdrop-blur-sm"
              >
                Quản trị viên
              </a>
            </div>
          </div>

          {/* Thanh điều hướng chính */}
          <nav className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-emerald-600/50">
            {[
              { id: 'news', label: 'Tin tức & Kỹ thuật' },
              { id: 'qa', label: 'Hỏi đáp Nhà nông' },
              { id: 'survey', label: 'Khảo sát thực tế' },
              { id: 'quiz', label: 'Đấu trường Nông dân' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedArticle(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-emerald-950 shadow'
                    : 'bg-emerald-900/40 text-emerald-50 hover:bg-emerald-900/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* TAB 1: TIN TỨC & KỸ THUẬT */}
        {activeTab === 'news' && (
          <div>
            {selectedArticle ? (
              /* Chi tiết bài viết */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <button
                      onClick={() => {
                        stopAllAudio();
                        setSelectedArticle(null);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold text-sm flex items-center gap-1"
                    >
                      ← Quay lại danh sách bản tin
                    </button>

                    <button
                      onClick={() => handleReadArticle(selectedArticle)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition shadow-sm ${
                        isSpeaking && speakingArticleId === selectedArticle.id
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {isSpeaking && speakingArticleId === selectedArticle.id ? (
                        <>⏹ Dừng đọc bài</>
                      ) : (
                        <>🔊 Nghe đọc toàn bộ bài viết</>
                      )}
                    </button>
                  </div>

                  <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
                    {selectedArticle.category || 'Khuyến nông'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
                    {selectedArticle.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-2">
                    Ngày đăng:{' '}
                    {selectedArticle.created_at
                      ? new Date(selectedArticle.created_at).toLocaleDateString('vi-VN')
                      : 'Hôm nay'}
                  </p>

                  {selectedArticle.image_url && (
                    <img
                      src={selectedArticle.image_url}
                      alt={selectedArticle.title}
                      className="w-full max-h-96 object-cover rounded-xl my-6 border border-gray-100"
                    />
                  )}

                  {selectedArticle.summary && (
                    <div className="bg-emerald-50/70 border-l-4 border-emerald-600 p-4 rounded-r-lg my-5 text-gray-700 font-medium italic">
                      {selectedArticle.summary}
                    </div>
                  )}

                  <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-line text-base sm:text-lg mt-4">
                    {selectedArticle.content}
                  </div>
                </div>
              </div>
            ) : (
              /* Danh sách bài viết */
              <div>
                {/* Thanh tìm kiếm & bộ lọc chuyên mục */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                          selectedCategory === cat
                            ? 'bg-emerald-700 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm kỹ thuật, giống cây, vật nuôi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-12 text-gray-500">Đang tải bản tin khuyến nông...</div>
                ) : filteredArticles.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
                    Không tìm thấy bài viết phù hợp.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-200 overflow-hidden flex flex-col cursor-pointer group"
                      >
                        <div className="h-48 bg-emerald-100 overflow-hidden relative">
                          <img
                            src={
                              article.image_url ||
                              'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-3 left-3 bg-emerald-800/90 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                            {article.category || 'Khuyến nông'}
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-700 transition line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-3 flex-1">
                            {article.summary}
                          </p>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {article.created_at
                                ? new Date(article.created_at).toLocaleDateString('vi-VN')
                                : ''}
                            </span>

                            <button
                              onClick={(e) => handleReadArticle(article, e)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                isSpeaking && speakingArticleId === article.id
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isSpeaking && speakingArticleId === article.id
                                ? '⏹ Dừng đọc'
                                : '🔊 Nghe đọc bài'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HỎI ĐÁP NHÀ NÔNG */}
        {activeTab === 'qa' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
              <h2 className="text-xl font-bold text-emerald-900 mb-2">Gửi câu hỏi kỹ thuật</h2>
              <p className="text-sm text-gray-600 mb-4">
                Bà con gặp khó khăn về sâu bệnh cây trồng, dịch bệnh vật nuôi hãy gửi câu hỏi để kỹ sư giải đáp.
              </p>
              <form onSubmit={handleQuestionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.full_name}
                    onChange={(e) => setNewQuestion({ ...newQuestion, full_name: e.target.value })}
                    placeholder="Ví dụ: Nông Văn A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xã / Phường</label>
                  <input
                    type="text"
                    value={newQuestion.address}
                    onChange={(e) => setNewQuestion({ ...newQuestion, address: e.target.value })}
                    placeholder="Ví dụ: Xã Bạch Đằng, Cao Bằng"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực</label>
                  <select
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Trồng trọt">Trồng trọt & Bảo vệ thực vật</option>
                    <option value="Chăn nuôi">Chăn nuôi & Thú y</option>
                    <option value="Lâm nghiệp">Lâm nghiệp</option>
                    <option value="Thủy sản">Thủy sản</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi *</label>
                  <textarea
                    rows="4"
                    required
                    value={newQuestion.content}
                    onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                    placeholder="Mô tả triệu chứng cây trồng, vật nuôi hoặc vấn đề cần tư vấn..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingQA}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {submittingQA ? 'Đang gửi...' : 'Gửi câu hỏi tới Kỹ sư'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Câu hỏi & Tư vấn gần đây</h2>
              {questions.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                  Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi cho cán bộ khuyến nông!
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-gray-900">{q.full_name}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                        {q.category}
                      </span>
                    </div>
                    {q.address && <p className="text-xs text-gray-500 mb-2">Địa chỉ: {q.address}</p>}
                    <p className="text-gray-800 text-sm bg-gray-50 p-3 rounded-lg">{q.content}</p>
                    {q.answer ? (
                      <div className="mt-3 bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-lg">
                        <p className="text-xs font-bold text-emerald-800 mb-1">
                          Phản hồi từ Trung tâm Khuyến nông:
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">{q.answer}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 mt-2 italic">Đang chờ cán bộ kỹ thuật phản hồi...</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: KHẢO SÁT THỰC TẾ */}
        {activeTab === 'survey' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900">Khảo sát nhu cầu sản xuất nông nghiệp</h2>
            {surveys.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                Hiện chưa có phiếu khảo sát nào đang mở.
              </div>
            ) : (
              surveys.map((survey) => {
                const totalVotes = (survey.options || []).reduce((acc, o) => acc + (o.votes || 0), 0);
                return (
                  <div key={survey.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{survey.question}</h3>
                    <div className="space-y-3">
                      {(survey.options || []).map((opt, idx) => {
                        const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleVote(survey, idx)}
                            disabled={votedSurveys[survey.id]}
                            className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-emerald-500 transition relative overflow-hidden"
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-emerald-100/70 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex justify-between items-center text-sm font-medium">
                              <span>{opt.label}</span>
                              <span className="text-emerald-800 font-bold">
                                {pct}% ({opt.votes || 0} phiếu)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: ĐẤU TRƯỜNG NÔNG DÂN */}
        {activeTab === 'quiz' && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">Đấu trường Kiến thức Nhà nông</h2>
            <p className="text-sm text-gray-600 mb-6">
              Thử tài hiểu biết về kỹ thuật trồng trọt, chăn nuôi và chính sách nông nghiệp Cao Bằng.
            </p>

            {quizFinished ? (
              <div className="text-center py-6">
                <p className="text-lg font-semibold text-gray-700">Bạn đã hoàn thành bộ câu hỏi!</p>
                <p className="text-4xl font-extrabold text-emerald-700 my-4">
                  {quizScore} / {quizData.length} điểm
                </p>
                <button
                  onClick={() => {
                    setQuizIndex(0);
                    setQuizScore(0);
                    setQuizAnswered(null);
                    setQuizFinished(false);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 rounded-lg font-semibold"
                >
                  Chơi lại từ đầu
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-3">
                  <span>
                    Câu hỏi {quizIndex + 1} / {quizData.length}
                  </span>
                  <span>Điểm hiện tại: {quizScore}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{quizData[quizIndex].question}</h3>
                <div className="space-y-3">
                  {quizData[quizIndex].options.map((opt, idx) => {
                    let btnStyle = 'border-gray-200 hover:border-emerald-500 bg-white';
                    if (quizAnswered !== null) {
                      if (idx === quizData[quizIndex].answer) {
                        btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (idx === quizAnswered) {
                        btnStyle = 'border-rose-500 bg-rose-50 text-rose-900';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={quizAnswered !== null}
                        onClick={() => {
                          setQuizAnswered(idx);
                          if (idx === quizData[quizIndex].answer) {
                            setQuizScore(quizScore + 1);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-xl border text-sm transition ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {quizAnswered !== null && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        if (quizIndex + 1 < quizData.length) {
                          setQuizIndex(quizIndex + 1);
                          setQuizAnswered(null);
                        } else {
                          setQuizFinished(true);
                        }
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                    >
                      {quizIndex + 1 < quizData.length ? 'Câu tiếp theo →' : 'Xem kết quả'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-200 text-sm py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-bold text-white">
              TRUNG TÂM KHUYẾN NÔNG VÀ GIỐNG NÔNG LÂM NGHIỆP TỈNH CAO BẰNG
            </p>
            <p className="text-xs text-emerald-300 mt-1">
              Trụ sở: Tổ dân phố Phan Thanh, Phường Thục Phán, Tỉnh Cao Bằng
            </p>
          </div>
          <p className="text-xs text-emerald-400">
            © {new Date().getFullYear()} Cổng Thông tin & Tương tác Khuyến nông Cao Bằng
          </p>
        </div>
      </footer>
    </div>
  );
}