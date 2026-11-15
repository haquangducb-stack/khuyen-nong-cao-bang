'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Lock, LogOut, FileText, BookOpen, Trophy, ClipboardList,
  MessageSquare, Plus, Trash2, Edit3, RefreshCw, Image as ImageIcon,
  Video, Download, Printer, CheckCircle, ArrowLeft, Sparkles, Award
} from 'lucide-react';
import Link from 'next/link';

const parsePrizes = (prizeStr) => {
  if (!prizeStr) return [];
  try {
    const parsed = JSON.parse(prizeStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ rank: 'Giải thưởng', quantity: '01', value: prizeStr }];
};

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [aiLoading, setAiLoading] = useState('');

  const [posts, setPosts] = useState([]);
  const [studyTopics, setStudyTopics] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [qaList, setQaList] = useState([]);

  // Tab 1: Bài viết
  const [editingPostId, setEditingPostId] = useState(null);
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Tin Khuyến nông Cao Bằng');
  const [postSummary, setPostSummary] = useState('');
  const [postThumbnail, setPostThumbnail] = useState('');
  const editorRef = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [syncingNews, setSyncingNews] = useState(false);
  const [scannedArticles, setScannedArticles] = useState([]);
  const [selectedScanned, setSelectedScanned] = useState({});

  // Tab 2: Chuyên đề học tập
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicQuestions, setTopicQuestions] = useState([
    { q: '', options: ['', '', '', ''], answer: 0, explain: '' }
  ]);
  const [aiStudyPrompt, setAiStudyPrompt] = useState('');
  const [aiStudyCount, setAiStudyCount] = useState(5);

  // Tab 3: Cuộc thi tháng
  const [editingCompId, setEditingCompId] = useState(null);
  const [compTitle, setCompTitle] = useState('');
  const [compTheme, setCompTheme] = useState('');
  const [compPrizes, setCompPrizes] = useState([
    { rank: 'Giải Nhất', quantity: '01', value: 'Voucher 50 cá chép giống + Thẻ cào 100.000đ' },
    { rank: 'Giải Nhì', quantity: '02', value: '05 gói hạt giống rau + Bộ tài liệu kỹ thuật' }
  ]);
  const [compEndTime, setCompEndTime] = useState('');
  const [compQuestions, setCompQuestions] = useState([
    { q: '', options: ['', '', '', ''], answer: 0 }
  ]);
  const [selectedCompResults, setSelectedCompResults] = useState(null);
  const [aiCompCount, setAiCompCount] = useState(5);

  // Tab 4: Khảo sát
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [surveyStartTime, setSurveyStartTime] = useState('');
  const [surveyEndTime, setSurveyEndTime] = useState('');
  const [surveyQuestions, setSurveyQuestions] = useState([
    { id: 'q1', label: '', type: 'choice', options: ['Có', 'Không'] }
  ]);
  const [selectedSurveyReport, setSelectedSurveyReport] = useState(null);
  const [aiSurveyPrompt, setAiSurveyPrompt] = useState('');
  const [aiSurveyCount, setAiSurveyCount] = useState(5);

  // Tab 5: Hỏi đáp
  const [newQaAsker, setNewQaAsker] = useState('Nông dân Cao Bằng');
  const [newQaCommune, setNewQaCommune] = useState('Xã Bạch Đằng');
  const [newQaQuestion, setNewQaQuestion] = useState('');
  const [newQaAnswer, setNewQaAnswer] = useState('');
  const [qaFilter, setQaFilter] = useState('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      if (session) fetchAllData();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    const [p, st, c, sv, qa] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('study_topics').select('*').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      supabase.from('qa_questions').select('*').order('created_at', { ascending: false }),
    ]);
    if (p.data) setPosts(p.data);
    if (st.data) setStudyTopics(st.data);
    if (c.data) setCompetitions(c.data);
    if (sv.data) setSurveys(sv.data);
    if (qa.data) setQaList(qa.data);
  };

  // Hàm gọi API AI nội bộ
  const callAiAssistant = async (task, payload, loadingKey) => {
    setAiLoading(loadingKey);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, payload })
      });
      const json = await res.json();
      setAiLoading('');
      if (!res.ok || json.error) {
        alert('Lỗi AI: ' + (json.error || 'Không thể xử lý yêu cầu'));
        return null;
      }
      return json;
    } catch (err) {
      setAiLoading('');
      alert('Lỗi kết nối tới dịch vụ AI: ' + err.message);
      return null;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(`Lỗi: ${error.message}`);
  };

  const formatForDatetimeLocal = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      alert('Chưa cấu hình Cloudinary trong .env.local!');
      return null;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    setUploadingImg(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadingImg(false);
      return data.secure_url;
    } catch {
      setUploadingImg(false);
      alert('Lỗi tải ảnh lên Cloudinary!');
      return null;
    }
  };

  const handleInsertImageInEditor = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToCloudinary(file);
    if (url && editorRef.current) {
      const caption = prompt('Nhập dòng chú thích dưới ảnh (có thể bỏ trống):') || '';
      const imgHtml = `<figure style="margin: 16px 0; text-align: center;"><img src="${url}" style="max-width: 100%; border-radius: 8px; margin: 0 auto;" /><figcaption style="font-size: 13px; color: #555; font-style: italic; margin-top: 6px;">${caption}</figcaption></figure><p><br/></p>`;
      editorRef.current.focus();
      document.execCommand('insertHTML', false, imgHtml);
    }
  };

  const handleInsertYoutubeInEditor = () => {
    const url = prompt('Dán đường link video YouTube vào đây:');
    if (!url) return;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/);
    if (!match) return alert('Link YouTube chưa đúng định dạng!');
    const embedHtml = `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 16px 0; border-radius: 8px; overflow: hidden;"><iframe src="https://www.youtube.com/embed/${match[1]}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div><p><br/></p>`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, embedHtml);
  };

  // --- AI TỰ PHÂN LOẠI & BIÊN TẬP BÀI VIẾT ---
  const handleAiEditPost = async () => {
    const rawContent = editorRef.current?.innerHTML || '';
    if (!postTitle.trim() && !rawContent.trim()) {
      return alert('Vui lòng nhập tiêu đề hoặc nội dung thô vào khung trước khi bấm AI biên tập!');
    }
    const res = await callAiAssistant('edit_post', { title: postTitle, content: rawContent }, 'edit_post');
    if (res?.data) {
      if (res.data.title) setPostTitle(res.data.title);
      if (res.data.category) setPostCategory(res.data.category);
      if (res.data.summary) setPostSummary(res.data.summary);
      if (res.data.content && editorRef.current) editorRef.current.innerHTML = res.data.content;
      alert(`AI đã biên tập xong và tự động xếp vào mục: "${res.data.category}"!`);
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    const contentHtml = editorRef.current?.innerHTML || '';
    if (!postTitle.trim() || !contentHtml.trim()) return alert('Nhập đủ tiêu đề và nội dung!');
    const payload = {
      title: postTitle,
      category: postCategory,
      summary: postSummary,
      content: contentHtml,
      thumbnail: postThumbnail || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
    };
    if (editingPostId) {
      await supabase.from('posts').update(payload).eq('id', editingPostId);
    } else {
      await supabase.from('posts').insert([payload]);
    }
    setEditingPostId(null);
    setPostTitle('');
    setPostSummary('');
    setPostThumbnail('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    fetchAllData();
    alert('Đã lưu bài viết lên Trang chủ!');
  };

  const handleSyncNationalNews = async () => {
    setSyncingNews(true);
    try {
      const res = await fetch('/api/sync-news', { method: 'POST' });
      const data = await res.json();
      if (data.articles) {
        const mapped = data.articles.map(a => ({ ...a, category: 'Tin từ Khuyến nông Quốc gia' }));
        setScannedArticles(mapped);
        setSelectedScanned({});
      } else {
        alert(data.error || 'Không lấy được danh sách tin.');
      }
    } catch {
      alert('Lỗi kết nối khi quét tin.');
    }
    setSyncingNews(false);
  };

  const handlePublishSelectedNews = async () => {
    const chosen = scannedArticles.filter((_, idx) => selectedScanned[idx]);
    if (chosen.length === 0) return alert('Bạn chưa tích chọn bài viết nào!');

    let added = 0;
    for (const item of chosen) {
      const exists = posts.some(p => p.title === item.title);
      if (!exists) {
        const { error } = await supabase.from('posts').insert([item]);
        if (!error) added++;
      }
    }
    alert(`Đã đăng thành công ${added}/${chosen.length} bài viết đã chọn lên Trang chủ!`);
    setScannedArticles([]);
    setSelectedScanned({});
    fetchAllData();
  };

  // --- AI TẠO BỘ CÂU HỎI HỌC TẬP ---
  const handleAiGenerateStudy = async () => {
    const topic = aiStudyPrompt.trim() || topicTitle.trim();
    if (!topic) return alert('Nhập tên chuyên đề hoặc yêu cầu để AI soạn câu hỏi!');
    const res = await callAiAssistant('generate_quiz', { topic, count: aiStudyCount }, 'gen_study');
    if (Array.isArray(res?.data) && res.data.length > 0) {
      if (!topicTitle.trim()) setTopicTitle(topic);
      setTopicQuestions(res.data);
    }
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    const payload = { title: topicTitle, description: topicDesc, questions: topicQuestions };
    if (editingTopicId) {
      await supabase.from('study_topics').update(payload).eq('id', editingTopicId);
    } else {
      await supabase.from('study_topics').insert([payload]);
    }
    setEditingTopicId(null);
    setTopicTitle('');
    setTopicDesc('');
    setTopicQuestions([{ q: '', options: ['', '', '', ''], answer: 0, explain: '' }]);
    fetchAllData();
    alert('Đã lưu chuyên đề!');
  };

  // --- AI TẠO ĐỀ THI THÁNG ---
  const handleAiGenerateComp = async () => {
    const topic = compTheme.trim() || compTitle.trim();
    if (!topic) return alert('Vui lòng nhập Tên cuộc thi hoặc Chủ đề trọng tâm trước khi gọi AI!');
    const res = await callAiAssistant('generate_quiz', { topic, count: aiCompCount }, 'gen_comp');
    if (Array.isArray(res?.data) && res.data.length > 0) {
      setCompQuestions(res.data.map(item => ({ q: item.q, options: item.options, answer: item.answer })));
    }
  };

  const handleSaveCompetition = async (e) => {
    e.preventDefault();
    const validPrizes = compPrizes.filter(p => p.rank.trim() || p.value.trim());
    const payload = {
      title: compTitle,
      theme: compTheme,
      prize_desc: JSON.stringify(validPrizes),
      end_time: new Date(compEndTime).toISOString(),
      questions: compQuestions
    };
    if (editingCompId) {
      await supabase.from('competitions').update(payload).eq('id', editingCompId);
    } else {
      await supabase.from('competitions').insert([payload]);
    }
    setEditingCompId(null);
    setCompTitle('');
    setCompTheme('');
    setCompPrizes([{ rank: 'Giải Nhất', quantity: '01', value: '' }]);
    setCompEndTime('');
    setCompQuestions([{ q: '', options: ['', '', '', ''], answer: 0 }]);
    fetchAllData();
    alert('Đã lưu cuộc thi và cơ cấu giải thưởng!');
  };

  const handleViewCompRanking = async (comp) => {
    const { data } = await supabase.from('competition_entries').select('*').eq('competition_id', comp.id);
    const entries = data || [];
    const totalPerfect = entries.filter(e => e.score === e.total_questions).length;
    const ranked = entries
      .map(e => ({ ...e, isPerfect: e.score === e.total_questions, diff: Math.abs(e.predicted_winners - totalPerfect) }))
      .sort((a, b) => (b.score - a.score) || (a.diff - b.diff) || (new Date(a.submitted_at) - new Date(b.submitted_at)));
    setSelectedCompResults({ comp, totalPerfect, ranked });
  };

  // --- AI TẠO PHIẾU KHẢO SÁT ---
  const handleAiGenerateSurvey = async () => {
    const topic = aiSurveyPrompt.trim() || surveyTitle.trim();
    if (!topic) return alert('Nhập mục tiêu hoặc tên đợt khảo sát để AI thiết kế câu hỏi!');
    const res = await callAiAssistant('generate_survey', { topic, count: aiSurveyCount }, 'gen_survey');
    if (Array.isArray(res?.data) && res.data.length > 0) {
      if (!surveyTitle.trim()) setSurveyTitle(topic);
      setSurveyQuestions(
        res.data.map((q, i) => ({
          id: `q_${Date.now()}_${i}`,
          label: q.label,
          type: q.type || 'choice',
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Có', 'Không']
        }))
      );
    }
  };

  const handleSaveSurvey = async (e) => {
    e.preventDefault();
    const payload = {
      title: surveyTitle,
      description: surveyDesc,
      start_time: surveyStartTime ? new Date(surveyStartTime).toISOString() : new Date().toISOString(),
      end_time: new Date(surveyEndTime).toISOString(),
      questions: surveyQuestions
    };
    if (editingSurveyId) {
      await supabase.from('surveys').update(payload).eq('id', editingSurveyId);
    } else {
      await supabase.from('surveys').insert([payload]);
    }
    setEditingSurveyId(null);
    setSurveyTitle('');
    setSurveyDesc('');
    setSurveyStartTime('');
    setSurveyEndTime('');
    setSurveyQuestions([{ id: 'q1', label: '', type: 'choice', options: ['Có', 'Không'] }]);
    fetchAllData();
    alert('Đã lưu đợt khảo sát!');
  };

  const handleOpenSurveyReport = async (survey) => {
    const { data } = await supabase.from('survey_responses').select('*').eq('survey_id', survey.id);
    setSelectedSurveyReport({ survey, responses: data || [] });
  };

  const exportSurveyExcel = (survey, responses) => {
    const rows = responses.map((r, idx) => {
      const row = {
        'STT': idx + 1,
        'Thời gian': new Date(r.submitted_at).toLocaleString('vi-VN'),
        'Họ tên': r.respondent_name || 'Ẩn danh',
        'Xã/Phường': r.commune
      };
      survey.questions.forEach((q, qIdx) => {
        const ans = r.answers?.[q.id];
        row[`Câu ${qIdx + 1}: ${q.label}`] = Array.isArray(ans) ? ans.join('; ') : (ans || '');
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KetQua');
    XLSX.writeFile(wb, `KhaoSat_${survey.title.slice(0, 20)}.xlsx`);
  };

  // --- AI TRẢ LỜI HỎI ĐÁP ---
  const handleAiAnswerCustomQa = async () => {
    if (!newQaQuestion.trim()) return alert('Vui lòng nhập câu hỏi trước!');
    const res = await callAiAssistant('answer_qa', { question: newQaQuestion, commune: newQaCommune }, 'qa_custom');
    if (res?.text) setNewQaAnswer(res.text);
  };

  const handleAiAnswerUserQa = async (item) => {
    const res = await callAiAssistant('answer_qa', { question: item.question, commune: item.commune }, `qa_${item.id}`);
    if (res?.text) {
      const el = document.getElementById(`ans_${item.id}`);
      if (el) el.value = res.text;
    }
  };

  const handleCreateCustomQa = async (e) => {
    e.preventDefault();
    if (!newQaQuestion.trim() || !newQaAnswer.trim()) return alert('Vui lòng nhập đủ câu hỏi và câu trả lời!');
    await supabase.from('qa_questions').insert([{
      asker_name: newQaAsker.trim() || 'Nông dân Cao Bằng',
      commune: newQaCommune.trim() || 'Tỉnh Cao Bằng',
      question: newQaQuestion.trim(),
      answer: newQaAnswer.trim(),
      is_published: true
    }]);
    setNewQaQuestion('');
    setNewQaAnswer('');
    fetchAllData();
    alert('Đã thêm và công khai mục Hỏi đáp mẫu!');
  };

  if (loadingAuth) return <div className="p-10 text-center">Đang tải...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-center">Cổng Quản Trị Cán Bộ</h1>
          <p className="text-xs text-center text-gray-500 mb-6">Trung tâm Khuyến nông & Giống NLN Cao Bằng</p>
          {authError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{authError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email cán bộ" className="w-full border rounded-lg px-3 py-2" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full border rounded-lg px-3 py-2" />
            <button type="submit" className="w-full bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">Đăng nhập</button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalQa = qaList.length;
  const publishedQa = qaList.filter(q => q.is_published).length;
  const pendingQa = totalQa - publishedQa;
  const displayedQa = qaList.filter(q => {
    if (qaFilter === 'pending') return !q.is_published;
    if (qaFilter === 'published') return q.is_published;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-emerald-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
        <div>
          <h1 className="font-bold">QUẢN TRỊ KHUYẾN NÔNG CAO BẰNG (TÍCH HỢP TRỢ LÝ AI)</h1>
          <p className="text-xs text-emerald-200">{session.user.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="bg-emerald-800 px-3 py-1.5 rounded text-sm">Trang chủ</Link>
          <button onClick={() => supabase.auth.signOut()} className="bg-red-600 px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <LogOut size={15} /> Thoát
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'posts', label: '1. Bài viết & AI Biên tập', icon: FileText },
          { id: 'study', label: '2. Nông dân học tập', icon: BookOpen },
          { id: 'comp', label: '3. Nông dân thi (Tháng)', icon: Trophy },
          { id: 'surveys', label: '4. Khảo sát & Báo cáo', icon: ClipboardList },
          { id: 'qa', label: `5. Hỏi đáp (${pendingQa} chờ)`, icon: MessageSquare }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === t.id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-500'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {/* TAB 1: BÀI VIẾT & AI BIÊN TẬP */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-amber-900">Lấy tin từ trang chủ https://khuyennongvn.gov.vn/</h3>
                  <p className="text-xs text-amber-700">Quét danh sách tin mới về để tích chọn đăng hoặc nạp vào khung cho AI biên tập lại</p>
                </div>
                <button onClick={handleSyncNationalNews} disabled={syncingNews} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <RefreshCw size={16} className={syncingNews ? 'animate-spin' : ''} />
                  {syncingNews ? 'Đang quét danh sách...' : 'Quét danh sách tin mới'}
                </button>
              </div>

              {scannedArticles.length > 0 && (
                <div className="bg-white border rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                    <span className="font-bold text-sm text-emerald-900">
                      Tìm thấy {scannedArticles.length} tin mới — Tích chọn các bài muốn đăng:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handlePublishSelectedNews}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Đăng {Object.values(selectedScanned).filter(Boolean).length} bài đã chọn lên Trang chủ
                      </button>
                      <button type="button" onClick={() => setScannedArticles([])} className="bg-gray-200 px-3 py-1.5 rounded-lg text-xs">
                        Đóng
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y">
                    {scannedArticles.map((art, idx) => {
                      const alreadyPosted = posts.some(p => p.title === art.title);
                      return (
                        <div key={idx} className="py-3 flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={alreadyPosted}
                            checked={!!selectedScanned[idx]}
                            onChange={(e) => setSelectedScanned({ ...selectedScanned, [idx]: e.target.checked })}
                            className="mt-1 w-4 h-4 accent-emerald-700"
                          />
                          <img src={art.thumbnail} alt="" className="w-16 h-12 object-cover rounded border shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a href={art.source_url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-gray-900 hover:text-emerald-700 line-clamp-1">
                              {art.title}
                            </a>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{art.summary}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPostId(null);
                              setPostTitle(art.title);
                              setPostCategory('Tin từ Khuyến nông Quốc gia');
                              setPostSummary(art.summary);
                              setPostThumbnail(art.thumbnail);
                              if (editorRef.current) editorRef.current.innerHTML = `${art.content}<p><a href="${art.source_url}" target="_blank">Xem nguồn gốc</a></p>`;
                            }}
                            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded shrink-0 font-medium"
                          >
                            Nạp vào khung sửa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePost} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-bold text-lg text-emerald-900">{editingPostId ? 'Sửa bài viết' : 'Soạn bài viết mới'}</h2>
                <button
                  type="button"
                  onClick={handleAiEditPost}
                  disabled={aiLoading === 'edit_post'}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles size={15} className={aiLoading === 'edit_post' ? 'animate-spin' : ''} />
                  {aiLoading === 'edit_post' ? 'AI đang phân loại & biên tập...' : 'AI Tự phân loại & Biên tập bài viết'}
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <input required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Tiêu đề bài viết..." className="border rounded-lg px-3 py-2" />
                <select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} className="border rounded-lg px-3 py-2 bg-white">
                  <optgroup label="1. Bản tin Khuyến nông">
                    <option value="Bản tin mùa vụ">Bản tin mùa vụ</option>
                    <option value="Bản tin thị trường">Bản tin thị trường</option>
                    <option value="Tin Khuyến nông Cao Bằng">Tin Khuyến nông Cao Bằng</option>
                    <option value="Tin từ Khuyến nông Quốc gia">Tin từ Khuyến nông Quốc gia</option>
                  </optgroup>
                  <optgroup label="2. Kỹ thuật">
                    <option value="Kỹ thuật Chăn nuôi - Thú y">Kỹ thuật Chăn nuôi - Thú y</option>
                    <option value="Kỹ thuật Trồng trọt - Lâm nghiệp">Kỹ thuật Trồng trọt - Lâm nghiệp</option>
                    <option value="Kỹ thuật Thủy sản">Kỹ thuật Thủy sản</option>
                  </optgroup>
                  <optgroup label="3. Giới thiệu sản phẩm">
                    <option value="Giới thiệu sản phẩm">Giới thiệu sản phẩm</option>
                  </optgroup>
                </select>
              </div>
              <input value={postSummary} onChange={(e) => setPostSummary(e.target.value)} placeholder="Tóm tắt ngắn hiển thị ngoài trang chủ (AI có thể tự viết)..." className="w-full border rounded-lg px-3 py-2" />
              <div className="flex items-center gap-3">
                <input value={postThumbnail} onChange={(e) => setPostThumbnail(e.target.value)} placeholder="Link ảnh đại diện (hoặc chọn tải lên bên cạnh)" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <label className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm cursor-pointer">
                  {uploadingImg ? 'Đang tải...' : 'Tải ảnh đại diện'}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const url = await uploadToCloudinary(e.target.files?.[0]);
                    if (url) setPostThumbnail(url);
                  }} />
                </label>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-2 border-b flex flex-wrap gap-2">
                  <button type="button" onClick={() => document.execCommand('bold')} className="px-2.5 py-1 bg-white border rounded font-bold text-sm">B</button>
                  <button type="button" onClick={() => document.execCommand('italic')} className="px-2.5 py-1 bg-white border rounded italic text-sm">I</button>
                  <label className="px-3 py-1 bg-emerald-700 text-white rounded text-sm cursor-pointer inline-flex items-center gap-1">
                    <ImageIcon size={15} /> Chèn Ảnh
                    <input type="file" accept="image/*" className="hidden" onChange={handleInsertImageInEditor} />
                  </label>
                  <button type="button" onClick={handleInsertYoutubeInEditor} className="px-3 py-1 bg-red-600 text-white rounded text-sm inline-flex items-center gap-1">
                    <Video size={15} /> Chèn Video YouTube
                  </button>
                </div>
                <div ref={editorRef} contentEditable className="min-h-[240px] p-4 outline-none prose max-w-none" />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold">
                  {editingPostId ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
                </button>
                {editingPostId && (
                  <button type="button" onClick={() => { setEditingPostId(null); setPostTitle(''); if (editorRef.current) editorRef.current.innerHTML = ''; }} className="bg-gray-200 px-4 py-2 rounded-lg">
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {posts.map(p => (
                <div key={p.id} className="p-4 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{p.category}</span>
                    <h4 className="font-semibold mt-1">{p.title}</h4>
                    <p className="text-xs text-gray-500">Lượt xem: {p.views} • Nguồn: {p.source_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingPostId(p.id); setPostTitle(p.title); setPostCategory(p.category);
                      setPostSummary(p.summary || ''); setPostThumbnail(p.thumbnail || '');
                      if (editorRef.current) editorRef.current.innerHTML = p.content;
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit3 size={18} /></button>
                    <button onClick={async () => { if (confirm('Xóa bài này?')) { await supabase.from('posts').delete().eq('id', p.id); fetchAllData(); } }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: NÔNG DÂN HỌC TẬP + AI TẠO BỘ CÂU HỎI */}
        {activeTab === 'study' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-wrap items-center gap-3">
              <Sparkles className="text-indigo-700 shrink-0" size={20} />
              <input
                value={aiStudyPrompt}
                onChange={(e) => setAiStudyPrompt(e.target.value)}
                placeholder="Nhập chủ đề để AI tự soạn bộ câu hỏi (VD: Kỹ thuật ươm cá chép qua đông ở Cao Bằng)..."
                className="flex-1 border rounded-lg px-3 py-2 bg-white text-sm"
              />
              <select value={aiStudyCount} onChange={(e) => setAiStudyCount(Number(e.target.value))} className="border rounded-lg px-3 py-2 bg-white text-sm">
                <option value={5}>5 câu</option>
                <option value={10}>10 câu</option>
              </select>
              <button
                type="button"
                onClick={handleAiGenerateStudy}
                disabled={aiLoading === 'gen_study'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {aiLoading === 'gen_study' ? 'AI đang soạn đề...' : 'AI Tạo bộ câu hỏi'}
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <h2 className="font-bold text-lg text-emerald-900">{editingTopicId ? 'Sửa chuyên đề' : 'Thêm Chuyên đề Nông dân học tập'}</h2>
              <input required value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="Tên chuyên đề..." className="w-full border rounded-lg px-3 py-2" />
              <input value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} placeholder="Mô tả ngắn chuyên đề" className="w-full border rounded-lg px-3 py-2" />

              {topicQuestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-sm">Câu {idx + 1}</span>
                    {topicQuestions.length > 1 && (
                      <button type="button" onClick={() => setTopicQuestions(topicQuestions.filter((_, i) => i !== idx))} className="text-red-600 text-xs">Xóa câu</button>
                    )}
                  </div>
                  <input required value={item.q} onChange={(e) => { const copy = [...topicQuestions]; copy[idx].q = e.target.value; setTopicQuestions(copy); }} placeholder="Nội dung câu hỏi..." className="w-full border rounded px-3 py-1.5 bg-white" />
                  <div className="grid md:grid-cols-2 gap-2">
                    {item.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="radio" checked={item.answer === oIdx} onChange={() => { const copy = [...topicQuestions]; copy[idx].answer = oIdx; setTopicQuestions(copy); }} />
                        <input required value={opt} onChange={(e) => { const copy = [...topicQuestions]; copy[idx].options[oIdx] = e.target.value; setTopicQuestions(copy); }} placeholder={`Đáp án ${oIdx + 1}`} className="flex-1 border rounded px-2 py-1 bg-white text-sm" />
                      </div>
                    ))}
                  </div>
                  <input value={item.explain} onChange={(e) => { const copy = [...topicQuestions]; copy[idx].explain = e.target.value; setTopicQuestions(copy); }} placeholder="Giải thích kỹ thuật sau khi chọn đáp án..." className="w-full border rounded px-3 py-1.5 bg-white text-sm" />
                </div>
              ))}

              <div className="flex gap-3">
                <button type="button" onClick={() => setTopicQuestions([...topicQuestions, { q: '', options: ['', '', '', ''], answer: 0, explain: '' }])} className="bg-gray-200 px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                  <Plus size={16} /> Thêm câu hỏi
                </button>
                <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">Lưu Chuyên đề</button>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {studyTopics.map(t => (
                <div key={t.id} className="p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{t.title}</h4>
                    <p className="text-xs text-gray-500">{t.questions?.length || 0} câu hỏi • {t.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingTopicId(t.id); setTopicTitle(t.title); setTopicDesc(t.description || ''); setTopicQuestions(t.questions || []); }} className="p-2 text-blue-600"><Edit3 size={18} /></button>
                    <button onClick={async () => { if (confirm('Xóa chuyên đề này?')) { await supabase.from('study_topics').delete().eq('id', t.id); fetchAllData(); } }} className="p-2 text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: NÔNG DÂN THI THÁNG + AI SOẠN ĐỀ THI */}
        {activeTab === 'comp' && (
          <div className="space-y-6">
            <form onSubmit={handleSaveCompetition} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-bold text-lg text-emerald-900">{editingCompId ? 'Sửa Cuộc thi' : 'Tạo Cuộc thi Tháng mới'}</h2>
                <div className="flex items-center gap-2">
                  <select value={aiCompCount} onChange={(e) => setAiCompCount(Number(e.target.value))} className="border rounded-lg px-2.5 py-1.5 text-xs">
                    <option value={5}>5 câu thi</option>
                    <option value={10}>10 câu thi</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAiGenerateComp}
                    disabled={aiLoading === 'gen_comp'}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Sparkles size={14} />
                    {aiLoading === 'gen_comp' ? 'AI đang soạn đề...' : 'AI Tự soạn bộ câu hỏi theo chủ đề'}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <input required value={compTitle} onChange={(e) => setCompTitle(e.target.value)} placeholder="Tên cuộc thi (VD: Thi Khuyến nông Tháng 11)" className="border rounded-lg px-3 py-2" />
                <input required value={compTheme} onChange={(e) => setCompTheme(e.target.value)} placeholder="Chủ đề trọng tâm (nhập để AI soạn đề)..." className="border rounded-lg px-3 py-2" />
                <div>
                  <label className="text-xs text-gray-500 block">Hạn giờ tự động đóng cuộc thi:</label>
                  <input type="datetime-local" required value={compEndTime} onChange={(e) => setCompEndTime(e.target.value)} className="w-full border rounded-lg px-3 py-1.5" />
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <Award size={17} /> Cơ cấu Mức & Giá trị Giải thưởng
                  </span>
                  <button
                    type="button"
                    onClick={() => setCompPrizes([...compPrizes, { rank: 'Giải Khuyến khích', quantity: '05', value: '' }])}
                    className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-semibold"
                  >
                    + Thêm mức giải
                  </button>
                </div>
                {compPrizes.map((pz, pIdx) => (
                  <div key={pIdx} className="grid grid-cols-12 gap-2 items-center">
                    <input required value={pz.rank} onChange={(e) => { const copy = [...compPrizes]; copy[pIdx].rank = e.target.value; setCompPrizes(copy); }} placeholder="Tên giải" className="col-span-3 border rounded px-2.5 py-1.5 bg-white text-sm" />
                    <input required value={pz.quantity} onChange={(e) => { const copy = [...compPrizes]; copy[pIdx].quantity = e.target.value; setCompPrizes(copy); }} placeholder="SL" className="col-span-2 border rounded px-2.5 py-1.5 bg-white text-sm text-center" />
                    <input required value={pz.value} onChange={(e) => { const copy = [...compPrizes]; copy[pIdx].value = e.target.value; setCompPrizes(copy); }} placeholder="Giá trị giải thưởng..." className="col-span-6 border rounded px-2.5 py-1.5 bg-white text-sm" />
                    <div className="col-span-1 text-center">
                      {compPrizes.length > 1 && (
                        <button type="button" onClick={() => setCompPrizes(compPrizes.filter((_, i) => i !== pIdx))} className="text-red-600 p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {compQuestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-sm">Câu thi {idx + 1}</span>
                    {compQuestions.length > 1 && (
                      <button type="button" onClick={() => setCompQuestions(compQuestions.filter((_, i) => i !== idx))} className="text-red-600 text-xs">Xóa câu</button>
                    )}
                  </div>
                  <input required value={item.q} onChange={(e) => { const copy = [...compQuestions]; copy[idx].q = e.target.value; setCompQuestions(copy); }} placeholder="Câu hỏi..." className="w-full border rounded px-3 py-1.5 bg-white" />
                  <div className="grid md:grid-cols-2 gap-2">
                    {item.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="radio" checked={item.answer === oIdx} onChange={() => { const copy = [...compQuestions]; copy[idx].answer = oIdx; setCompQuestions(copy); }} />
                        <input required value={opt} onChange={(e) => { const copy = [...compQuestions]; copy[idx].options[oIdx] = e.target.value; setCompQuestions(copy); }} placeholder={`Phương án ${oIdx + 1}`} className="flex-1 border rounded px-2 py-1 bg-white text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button type="button" onClick={() => setCompQuestions([...compQuestions, { q: '', options: ['', '', '', ''], answer: 0 }])} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">+ Thêm câu thi</button>
                <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">
                  {editingCompId ? 'Cập nhật Cuộc thi' : 'Phát hành Cuộc thi'}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {competitions.map(c => {
                const prizeList = parsePrizes(c.prize_desc);
                return (
                  <div key={c.id} className="p-4 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h4 className="font-bold">{c.title}</h4>
                      <p className="text-xs text-gray-500">Hết hạn: {new Date(c.end_time).toLocaleString('vi-VN')}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {prizeList.map((pz, i) => (
                          <span key={i} className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                            <strong>{pz.rank} ({pz.quantity}):</strong> {pz.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleViewCompRanking(c)} className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-semibold">Chốt sổ & Xếp hạng</button>
                      <button onClick={() => {
                        setEditingCompId(c.id); setCompTitle(c.title); setCompTheme(c.theme);
                        setCompPrizes(parsePrizes(c.prize_desc));
                        setCompEndTime(formatForDatetimeLocal(c.end_time));
                        setCompQuestions(c.questions || []);
                      }} className="p-2 text-blue-600"><Edit3 size={18} /></button>
                      <button onClick={async () => { if (confirm('Xóa cuộc thi này?')) { await supabase.from('competitions').delete().eq('id', c.id); fetchAllData(); } }} className="p-2 text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCompResults && (
              <div className="bg-white p-6 rounded-xl border-2 border-amber-400">
                <h3 className="font-bold text-lg mb-2">Kết quả: {selectedCompResults.comp.title}</h3>
                <p className="text-sm text-emerald-700 font-semibold mb-4">Tổng số người trả lời đúng 100% thực tế: {selectedCompResults.totalPerfect} người</p>
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Hạng</th>
                      <th className="p-2 border">Họ tên</th>
                      <th className="p-2 border">SĐT</th>
                      <th className="p-2 border">Xã/Phường</th>
                      <th className="p-2 border">Điểm</th>
                      <th className="p-2 border">Dự đoán (Sai số)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCompResults.ranked.map((r, i) => (
                      <tr key={r.id} className={i < 3 && r.isPerfect ? 'bg-amber-50 font-bold' : ''}>
                        <td className="p-2 border text-center">{i + 1}</td>
                        <td className="p-2 border">{r.full_name}</td>
                        <td className="p-2 border">{r.phone}</td>
                        <td className="p-2 border">{r.commune}</td>
                        <td className="p-2 border text-center">{r.score}/{r.total_questions}</td>
                        <td className="p-2 border text-center">{r.predicted_winners} (Lệch {r.diff})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: KHẢO SÁT + AI THIẾT KẾ PHIẾU */}
        {activeTab === 'surveys' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-wrap items-center gap-3 print:hidden">
              <Sparkles className="text-indigo-700 shrink-0" size={20} />
              <input
                value={aiSurveyPrompt}
                onChange={(e) => setAiSurveyPrompt(e.target.value)}
                placeholder="Nhập mục tiêu khảo sát để AI tự thiết kế câu hỏi (VD: Khảo sát nhu cầu giống cây quế & cá giống vụ Xuân 2027)..."
                className="flex-1 border rounded-lg px-3 py-2 bg-white text-sm"
              />
              <select value={aiSurveyCount} onChange={(e) => setAiSurveyCount(Number(e.target.value))} className="border rounded-lg px-3 py-2 bg-white text-sm">
                <option value={4}>4 câu</option>
                <option value={6}>6 câu</option>
                <option value={8}>8 câu</option>
              </select>
              <button
                type="button"
                onClick={handleAiGenerateSurvey}
                disabled={aiLoading === 'gen_survey'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {aiLoading === 'gen_survey' ? 'AI đang thiết kế...' : 'AI Tạo phiếu khảo sát'}
              </button>
            </div>

            <form onSubmit={handleSaveSurvey} className="bg-white p-6 rounded-xl shadow-sm border space-y-4 print:hidden">
              <h2 className="font-bold text-lg text-emerald-900">{editingSurveyId ? 'Sửa Đợt Khảo sát' : 'Tạo Đợt Khảo sát mới'}</h2>
              <input required value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} placeholder="Tên đợt khảo sát..." className="w-full border rounded-lg px-3 py-2" />
              <input value={surveyDesc} onChange={(e) => setSurveyDesc(e.target.value)} placeholder="Mục đích khảo sát..." className="w-full border rounded-lg px-3 py-2" />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Thời gian mở:</label>
                  <input type="datetime-local" value={surveyStartTime} onChange={(e) => setSurveyStartTime(e.target.value)} className="w-full border rounded-lg px-3 py-1.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hạn giờ tự động đóng:</label>
                  <input type="datetime-local" required value={surveyEndTime} onChange={(e) => setSurveyEndTime(e.target.value)} className="w-full border rounded-lg px-3 py-1.5" />
                </div>
              </div>

              {surveyQuestions.map((q, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input required value={q.label} onChange={(e) => { const copy = [...surveyQuestions]; copy[idx].label = e.target.value; setSurveyQuestions(copy); }} placeholder={`Nội dung câu hỏi ${idx + 1}`} className="flex-1 border rounded px-3 py-1.5 bg-white" />
                    <select value={q.type} onChange={(e) => { const copy = [...surveyQuestions]; copy[idx].type = e.target.value; setSurveyQuestions(copy); }} className="border rounded px-2 py-1.5 bg-white text-sm">
                      <option value="choice">Trắc nghiệm chọn 1 đáp án</option>
                      <option value="multi">Chọn NHIỀU đáp án (Checkbox)</option>
                      <option value="text">Nhập chữ / Số liệu</option>
                    </select>
                    {surveyQuestions.length > 1 && (
                      <button type="button" onClick={() => setSurveyQuestions(surveyQuestions.filter((_, i) => i !== idx))} className="text-red-600 px-2">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {(q.type === 'choice' || q.type === 'multi') && (
                    <input value={q.options.join(', ')} onChange={(e) => { const copy = [...surveyQuestions]; copy[idx].options = e.target.value.split(',').map(s => s.trim()); setSurveyQuestions(copy); }} placeholder="Các lựa chọn cách nhau bởi dấu phẩy..." className="w-full border rounded px-3 py-1 bg-white text-sm" />
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button type="button" onClick={() => setSurveyQuestions([...surveyQuestions, { id: `q${Date.now()}`, label: '', type: 'choice', options: ['Có', 'Không'] }])} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">+ Thêm câu khảo sát</button>
                <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">
                  {editingSurveyId ? 'Cập nhật Khảo sát' : 'Phát hành Khảo sát'}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border divide-y print:hidden">
              {surveys.map(s => (
                <div key={s.id} className="p-4 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h4 className="font-bold">{s.title}</h4>
                    <p className="text-xs text-gray-500">Hạn đóng: {new Date(s.end_time).toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenSurveyReport(s)} className="bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold">Xem Báo cáo & Xuất Excel</button>
                    <button onClick={() => {
                      setEditingSurveyId(s.id); setSurveyTitle(s.title); setSurveyDesc(s.description || '');
                      setSurveyStartTime(formatForDatetimeLocal(s.start_time)); setSurveyEndTime(formatForDatetimeLocal(s.end_time));
                      setSurveyQuestions(s.questions || []);
                    }} className="p-2 text-blue-600"><Edit3 size={18} /></button>
                    <button onClick={async () => { if (confirm('Xóa khảo sát này?')) { await supabase.from('surveys').delete().eq('id', s.id); fetchAllData(); } }} className="p-2 text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>

            {selectedSurveyReport && (
              <div className="bg-white p-8 rounded-xl border shadow-sm space-y-6">
                <div className="flex justify-between items-start print:hidden">
                  <h3 className="font-bold text-lg">Báo cáo Tổng hợp Số liệu</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportSurveyExcel(selectedSurveyReport.survey, selectedSurveyReport.responses)} className="bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
                      <Download size={16} /> Xuất Excel (.xlsx)
                    </button>
                    <button onClick={() => window.print()} className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
                      <Printer size={16} /> In Báo cáo A4 / PDF
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-center mb-6">
                    <p className="text-xs uppercase font-semibold">SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG CAO BẰNG</p>
                    <p className="text-sm uppercase font-bold">TRUNG TÂM KHUYẾN NÔNG VÀ GIỐNG NÔNG LÂM NGHIỆP</p>
                    <h2 className="text-lg font-bold mt-4 uppercase">BÁO CÁO TỔNG HỢP KẾT QUẢ KHẢO SÁT</h2>
                    <p className="font-medium">{selectedSurveyReport.survey.title}</p>
                    <p className="text-sm text-gray-600 mt-1">Tổng số phiếu thu về: <strong>{selectedSurveyReport.responses.length} phiếu</strong></p>
                  </div>

                  <div className="space-y-4">
                    {selectedSurveyReport.survey.questions.map((q, idx) => {
                      const total = selectedSurveyReport.responses.length || 1;
                      return (
                        <div key={q.id} className="border rounded-lg p-4">
                          <p className="font-bold text-sm mb-2">
                            Câu {idx + 1}: {q.label} {q.type === 'multi' && <span className="text-xs font-normal text-gray-500">(Chọn nhiều đáp án)</span>}
                          </p>
                          {(q.type === 'choice' || q.type === 'multi') ? (
                            <div className="space-y-2">
                              {q.options.map(opt => {
                                const count = selectedSurveyReport.responses.filter(r => {
                                  const val = r.answers?.[q.id];
                                  return Array.isArray(val) ? val.includes(opt) : val === opt;
                                }).length;
                                const pct = Math.round((count / total) * 100);
                                return (
                                  <div key={opt}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>{opt}</span>
                                      <span>{count} phiếu ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                      <div className="bg-emerald-600 h-full" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <ul className="list-disc pl-5 text-xs space-y-1 max-h-40 overflow-y-auto">
                              {selectedSurveyReport.responses.map(r => (
                                <li key={r.id}><strong>{r.commune}:</strong> {r.answers?.[q.id]}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 text-center mt-10 text-sm">
                    <div>
                      <p className="font-bold">NGƯỜI LẬP BIỂU</p>
                      <p className="text-xs italic text-gray-500 mt-1">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div>
                      <p className="font-bold">LÃNH ĐẠO TRUNG TÂM</p>
                      <p className="text-xs italic text-gray-500 mt-1">(Ký tên, đóng dấu)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HỎI ĐÁP + AI TỰ TRẢ LỜI */}
        {activeTab === 'qa' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div onClick={() => setQaFilter('all')} className={`p-4 rounded-xl border cursor-pointer ${qaFilter === 'all' ? 'bg-emerald-900 text-white' : 'bg-white'}`}>
                <p className="text-xs opacity-80">Tổng số câu hỏi</p>
                <p className="text-2xl font-bold mt-1">{totalQa}</p>
              </div>
              <div onClick={() => setQaFilter('pending')} className={`p-4 rounded-xl border cursor-pointer ${qaFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-white'}`}>
                <p className="text-xs opacity-80">Đang chờ trả lời</p>
                <p className="text-2xl font-bold mt-1">{pendingQa}</p>
              </div>
              <div onClick={() => setQaFilter('published')} className={`p-4 rounded-xl border cursor-pointer ${qaFilter === 'published' ? 'bg-emerald-700 text-white' : 'bg-white'}`}>
                <p className="text-xs opacity-80">Đã trả lời & Công khai</p>
                <p className="text-2xl font-bold mt-1">{publishedQa}</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomQa} className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-bold text-emerald-900">Tự soạn Câu hỏi & Giải đáp mẫu (Làm phong phú chuyên mục)</h3>
                <button
                  type="button"
                  onClick={handleAiAnswerCustomQa}
                  disabled={aiLoading === 'qa_custom'}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  {aiLoading === 'qa_custom' ? 'AI đang viết câu trả lời...' : 'AI Tự soạn câu trả lời'}
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input value={newQaAsker} onChange={(e) => setNewQaAsker(e.target.value)} placeholder="Tên người hỏi" className="border rounded-lg px-3 py-2 text-sm" />
                <input value={newQaCommune} onChange={(e) => setNewQaCommune(e.target.value)} placeholder="Địa bàn (Xã/Phường)" className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <input required value={newQaQuestion} onChange={(e) => setNewQaQuestion(e.target.value)} placeholder="Nhập câu hỏi kỹ thuật thường gặp..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea required rows={3} value={newQaAnswer} onChange={(e) => setNewQaAnswer(e.target.value)} placeholder="Nội dung trả lời (bấm nút AI ở trên để tự điền)..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                Đăng công khai mục Hỏi đáp
              </button>
            </form>

            <div className="space-y-4">
              {displayedQa.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="font-bold text-sm">{item.asker_name} ({item.commune})</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAiAnswerUserQa(item)}
                        disabled={aiLoading === `qa_${item.id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Sparkles size={13} />
                        {aiLoading === `qa_${item.id}` ? 'AI đang soạn...' : 'AI Tự soạn câu trả lời'}
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded ${item.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.is_published ? 'Đã công khai' : 'Chờ trả lời'}
                      </span>
                      <button
                        type="button"
                        onClick={async () => { if (confirm('Xóa câu hỏi này?')) { await supabase.from('qa_questions').delete().eq('id', item.id); fetchAllData(); } }}
                        className="text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded text-sm">{item.question}</p>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      defaultValue={item.answer || ''}
                      id={`ans_${item.id}`}
                      placeholder="Nhập nội dung kỹ sư tư vấn trả lời hoặc bấm nút AI Tự soạn câu trả lời..."
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={async () => {
                        const val = document.getElementById(`ans_${item.id}`).value;
                        await supabase.from('qa_questions').update({ answer: val, is_published: true }).eq('id', item.id);
                        fetchAllData();
                        alert('Đã lưu câu trả lời và công khai!');
                      }}
                      className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 h-fit"
                    >
                      <CheckCircle size={16} /> Trả lời & Đăng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}