'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Newspaper, BookOpen, Trophy, ClipboardList, MessageSquare,
  Volume2, VolumeX, Eye, Clock, CheckCircle,
  QrCode, Send, Lock, ArrowRight, RotateCcw, Award
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('news');
  const [fontSize, setFontSize] = useState(16);
  const [totalVisits, setTotalVisits] = useState(12480);

  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = React.useRef(null);

  const [studyTopics, setStudyTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [studyAnswers, setStudyAnswers] = useState({});
  const [studySubmitted, setStudySubmitted] = useState(false);

  const [competitions, setCompetitions] = useState([]);
  const [activeComp, setActiveComp] = useState(null);
  const [compAnswers, setCompAnswers] = useState({});
  const [compForm, setCompForm] = useState({ full_name: '', phone: '', commune: '', predicted: '' });
  const [compResult, setCompResult] = useState(null);

  const [surveys, setSurveys] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [surveyMeta, setSurveyMeta] = useState({ respondent_name: '', commune: '' });
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [qrModalTitle, setQrModalTitle] = useState('');

  const [qaList, setQaList] = useState([]);
  const [qaForm, setQaForm] = useState({ asker_name: '', commune: '', question: '' });
  const [qaSent, setQaSent] = useState(false);

  const [now, setNow] = useState(null);

  const categoryTree = {
    'Bản tin Khuyến nông': [
      'Bản tin mùa vụ',
      'Bản tin thị trường',
      'Tin Khuyến nông Cao Bằng',
      'Tin từ Khuyến nông Quốc gia'
    ],
    'Kỹ thuật': [
      'Kỹ thuật Chăn nuôi - Thú y',
      'Kỹ thuật Trồng trọt - Lâm nghiệp',
      'Kỹ thuật Thủy sản'
    ],
    'Giới thiệu sản phẩm': ['Giới thiệu sản phẩm']
  };

  useEffect(() => {
    fetchPublicData();
    const timer = setInterval(() => setNow(new Date()), 1000);
    const savedVisits = Number(localStorage.getItem('kncb_visits') || 12480) + 1;
    localStorage.setItem('kncb_visits', savedVisits);
    setTotalVisits(savedVisits);
    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchPublicData = async () => {
    const [p, st, c, sv, qa] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('study_topics').select('*').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      supabase.from('qa_questions').select('*').eq('is_published', true).order('created_at', { ascending: false }),
    ]);
    if (p.data) setPosts(p.data);
    if (st.data) setStudyTopics(st.data);
    if (c.data) setCompetitions(c.data);
    if (sv.data) setSurveys(sv.data);
    if (qa.data) setQaList(qa.data);
  };

  const handleOpenPost = async (post) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSelectedPost(post);
    const nextViews = (post.views || 0) + 1;
    setPosts(posts.map(item => item.id === post.id ? { ...item, views: nextViews } : item));
    await supabase.from('posts').update({ views: nextViews }).eq('id', post.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stopAllSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleToggleSpeech = (post) => {
    if (isSpeaking) {
      stopAllSpeech();
      return;
    }

    const plainText = `${post.title}. ${post.summary || ''}. ${post.content.replace(/<[^>]+>/g, ' ')}`
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Kiểm tra xem thiết bị có sẵn giọng tiếng Việt (vi-VN) không
    const voices = typeof window !== 'undefined' && window.speechSynthesis
      ? window.speechSynthesis.getVoices()
      : [];
    const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));

    if (viVoice) {
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      return;
    }

    // 2. Nếu máy Windows chưa cài gói tiếng Việt -> Dùng bộ phát âm tiếng Việt tự động
    const chunks = plainText.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [plainText];
    const mergedChunks = [];
    let current = '';
    for (const sentence of chunks) {
      if ((current + sentence).length < 180) {
        current += ' ' + sentence;
      } else {
        if (current.trim()) mergedChunks.push(current.trim());
        current = sentence;
      }
    }
    if (current.trim()) mergedChunks.push(current.trim());

    let idx = 0;
    setIsSpeaking(true);

    const playNextChunk = () => {
      if (idx >= mergedChunks.length) {
        setIsSpeaking(false);
        audioRef.current = null;
        return;
      }
      const audio = new Audio(`/api/tts?q=${encodeURIComponent(mergedChunks[idx])}`);
      audioRef.current = audio;
      audio.onended = () => {
        idx++;
        playNextChunk();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.play().catch(() => {
        setIsSpeaking(false);
        audioRef.current = null;
      });
    };

    playNextChunk();
  };

  const formatCountdown = (endTimeStr) => {
    if (!now) return 'Đang tính...';
    const diff = new Date(endTimeStr).getTime() - now.getTime();
    if (diff <= 0) return 'Đã hết hạn';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    return `Còn ${days} ngày ${hours}g ${mins}p ${secs}s`;
  };

  const handleSubmitCompetition = async (e) => {
    e.preventDefault();
    if (!activeComp) return;
    if (new Date(activeComp.end_time) <= new Date()) {
      alert('Cuộc thi đã hết hạn nộp bài!');
      return;
    }
    const questions = activeComp.questions || [];
    if (Object.keys(compAnswers).length < questions.length) {
      alert('Bà con vui lòng trả lời đầy đủ tất cả câu hỏi trước khi nộp!');
      return;
    }

    let score = 0;
    questions.forEach((q, idx) => {
      if (compAnswers[idx] === q.answer) score++;
    });

    const { error } = await supabase.from('competition_entries').insert([{
      competition_id: activeComp.id,
      full_name: compForm.full_name.trim(),
      phone: compForm.phone.trim(),
      commune: compForm.commune.trim(),
      score,
      total_questions: questions.length,
      predicted_winners: Number(compForm.predicted) || 0
    }]);

    if (error) {
      if (error.code === '23505') {
        alert('Số điện thoại này đã tham gia dự thi kỳ này rồi!');
      } else {
        alert('Có lỗi khi gửi bài thi: ' + error.message);
      }
      return;
    }

    setCompResult({ score, total: questions.length });
  };

  const handleOpenSurvey = (survey) => {
    setActiveSurvey(survey);
    setSurveySubmitted(false);
    const draft = localStorage.getItem(`survey_draft_${survey.id}`);
    setSurveyAnswers(draft ? JSON.parse(draft) : {});
  };

  const handleSurveyAnswerChange = (qId, val) => {
    const updated = { ...surveyAnswers, [qId]: val };
    setSurveyAnswers(updated);
    if (activeSurvey) {
      localStorage.setItem(`survey_draft_${activeSurvey.id}`, JSON.stringify(updated));
    }
  };

  const handleSurveyMultiToggle = (qId, opt) => {
    const current = Array.isArray(surveyAnswers[qId]) ? surveyAnswers[qId] : [];
    const next = current.includes(opt) ? current.filter(item => item !== opt) : [...current, opt];
    handleSurveyAnswerChange(qId, next);
  };

  const handleSubmitSurvey = async (e) => {
    e.preventDefault();
    if (!activeSurvey) return;
    if (new Date(activeSurvey.end_time) <= new Date()) {
      alert('Đợt khảo sát này đã đóng!');
      return;
    }
    const { error } = await supabase.from('survey_responses').insert([{
      survey_id: activeSurvey.id,
      respondent_name: surveyMeta.respondent_name.trim() || 'Ẩn danh',
      commune: surveyMeta.commune.trim(),
      answers: surveyAnswers
    }]);
    if (error) {
      alert('Lỗi gửi phiếu khảo sát: ' + error.message);
      return;
    }
    localStorage.removeItem(`survey_draft_${activeSurvey.id}`);
    setSurveySubmitted(true);
  };

  const handleSendQa = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('qa_questions').insert([{
      asker_name: qaForm.asker_name.trim(),
      commune: qaForm.commune.trim(),
      question: qaForm.question.trim()
    }]);
    if (!error) {
      setQaSent(true);
      setQaForm({ asker_name: '', commune: '', question: '' });
    }
  };

  const filteredPosts = posts.filter(p => {
    if (selectedGroup === 'Tất cả') return true;
    if (selectedCategory !== 'Tất cả') return p.category === selectedCategory;
    return (categoryTree[selectedGroup] || []).includes(p.category);
  });

  return (
    <div className="min-h-screen bg-stone-50 text-gray-800 flex flex-col" style={{ fontSize: `${fontSize}px` }}>
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
              Sở Nông nghiệp và Môi trường tỉnh Cao Bằng
            </p>
            <h1 className="text-lg md:text-2xl font-bold mt-0.5">
              CỔNG THÔNG TIN & TƯƠNG TÁC KHUYẾN NÔNG CAO BẰNG
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-700">
            <span className="text-xs text-emerald-200">Cỡ chữ:</span>
            <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-xs font-bold">A-</button>
            <button onClick={() => setFontSize(Math.min(22, fontSize + 2))} className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-xs font-bold">A+</button>
          </div>
        </div>

        <nav className="bg-emerald-950/60 border-t border-emerald-700/60">
          <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto gap-1">
            {[
              { id: 'news', label: 'Tin tức & Kỹ thuật', icon: Newspaper },
              { id: 'study', label: 'Nông dân học tập', icon: BookOpen },
              { id: 'comp', label: 'Nông dân thi', icon: Trophy },
              { id: 'surveys', label: 'Khảo sát trực tuyến', icon: ClipboardList },
              { id: 'qa', label: 'Hỏi đáp Khuyến nông', icon: MessageSquare },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPost(null);
                  setActiveTopic(null);
                  setActiveComp(null);
                  setActiveSurvey(null);
                }}
                className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-900 border-amber-400 rounded-t-lg mt-1'
                    : 'text-emerald-100 hover:text-white border-transparent'
                }`}
              >
                <tab.icon size={17} /> {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        {activeTab === 'news' && (
          <div>
            {selectedPost ? (
              <article className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 max-w-4xl mx-auto">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                    setSelectedPost(null);
                  }}
                  className="text-sm text-emerald-700 font-semibold mb-4 hover:underline"
                >
                  ← Quay lại danh sách bài viết
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {selectedPost.category}
                  </span>
                  <button
                    onClick={() => handleToggleSpeech(selectedPost)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      isSpeaking ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    {isSpeaking ? <><VolumeX size={15} /> Dừng đọc</> : <><Volume2 size={15} /> Nghe đọc bài</>}
                  </button>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-3">
                  {selectedPost.title}
                </h2>
                <div className="text-xs text-gray-500 flex flex-wrap gap-4 pb-4 mb-6 border-b">
                  <span>Nguồn: <strong>{selectedPost.source_name}</strong></span>
                  <span className="flex items-center gap-1"><Eye size={14} /> {selectedPost.views || 0} lượt xem</span>
                  <span>{new Date(selectedPost.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <div
                  className="prose max-w-none leading-relaxed text-gray-800"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
                {selectedPost.source_url && (
                  <div className="mt-6 pt-4 border-t text-sm">
                    <a href={selectedPost.source_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                      Xem bài gốc tại Cổng thông tin Khuyến nông Quốc gia →
                    </a>
                  </div>
                )}
              </article>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {['Tất cả', 'Bản tin Khuyến nông', 'Kỹ thuật', 'Giới thiệu sản phẩm'].map(grp => (
                      <button
                        key={grp}
                        onClick={() => {
                          setSelectedGroup(grp);
                          setSelectedCategory(grp === 'Giới thiệu sản phẩm' ? 'Giới thiệu sản phẩm' : 'Tất cả');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap border transition ${
                          selectedGroup === grp
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-emerald-50'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>

                  {(selectedGroup === 'Bản tin Khuyến nông' || selectedGroup === 'Kỹ thuật') && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pl-1">
                      <button
                        onClick={() => setSelectedCategory('Tất cả')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${
                          selectedCategory === 'Tất cả'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Tất cả {selectedGroup}
                      </button>
                      {categoryTree[selectedGroup].map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSelectedCategory(sub)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${
                            selectedCategory === sub
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredPosts.length === 0 ? (
                  <div className="bg-white p-10 rounded-xl border text-center text-gray-500">
                    Chưa có bài viết nào trong chuyên mục này.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {filteredPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => handleOpenPost(post)}
                        className="bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer flex flex-col"
                      >
                        <img
                          src={post.thumbnail || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'}
                          alt={post.title}
                          className="h-44 w-full object-cover"
                        />
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {post.category}
                            </span>
                            <h3 className="font-bold text-gray-900 mt-2 line-clamp-2">{post.title}</h3>
                            <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{post.summary}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t flex justify-between items-center text-[11px] text-gray-500">
                            <span>{post.source_name}</span>
                            <span className="flex items-center gap-1"><Eye size={13} /> {post.views || 0}</span>
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

        {activeTab === 'study' && (
          <div>
            {activeTopic ? (
              <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-3xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">{activeTopic.title}</h2>
                    <p className="text-xs text-gray-500">{activeTopic.description}</p>
                  </div>
                  <button onClick={() => setActiveTopic(null)} className="text-xs text-emerald-700 font-semibold">
                    ← Chọn chuyên đề khác
                  </button>
                </div>

                {(activeTopic.questions || []).map((q, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 rounded-xl border space-y-2.5">
                    <p className="font-bold text-gray-900">Câu {idx + 1}: {q.q}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const chosen = studyAnswers[idx] === oIdx;
                        let style = 'bg-white border-gray-200';
                        if (studySubmitted) {
                          if (oIdx === q.answer) style = 'bg-emerald-100 border-emerald-600 font-semibold text-emerald-900';
                          else if (chosen) style = 'bg-red-100 border-red-500 text-red-900';
                        } else if (chosen) {
                          style = 'bg-emerald-50 border-emerald-600';
                        }
                        return (
                          <button
                            key={oIdx}
                            disabled={studySubmitted}
                            onClick={() => setStudyAnswers({ ...studyAnswers, [idx]: oIdx })}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition ${style}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {studySubmitted && q.explain && (
                      <div className="text-xs bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200">
                        <strong>Giải thích kỹ thuật:</strong> {q.explain}
                      </div>
                    )}
                  </div>
                ))}

                {!studySubmitted ? (
                  <button
                    onClick={() => setStudySubmitted(true)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl"
                  >
                    Chấm điểm & Xem giải thích kỹ thuật
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-xl text-center space-y-3">
                    <p className="text-lg font-bold text-emerald-900">
                      Kết quả: Đúng{' '}
                      {(activeTopic.questions || []).filter((q, idx) => studyAnswers[idx] === q.answer).length}/
                      {(activeTopic.questions || []).length} câu
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => { setStudyAnswers({}); setStudySubmitted(false); }}
                        className="bg-white border px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1"
                      >
                        <RotateCcw size={15} /> Làm lại chuyên đề này
                      </button>
                      <button
                        onClick={() => { setActiveTopic(null); setStudyAnswers({}); setStudySubmitted(false); }}
                        className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1"
                      >
                        Thi tiếp bộ câu hỏi khác <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-900 text-white p-6 rounded-2xl">
                  <h2 className="text-xl font-bold">Chuyên mục Nông dân Học tập</h2>
                  <p className="text-sm text-emerald-100 mt-1">
                    Chọn một chuyên đề kỹ thuật dưới đây để tự ôn luyện kiến thức trồng trọt, chăn nuôi, thủy sản.
                  </p>
                </div>
                {studyTopics.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border text-center text-gray-500">Chưa có bộ chuyên đề học tập nào.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {studyTopics.map(topic => (
                      <div key={topic.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                            {topic.questions?.length || 0} câu hỏi trắc nghiệm
                          </span>
                          <h3 className="font-bold text-lg mt-2">{topic.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">{topic.description}</p>
                        </div>
                        <button
                          onClick={() => { setActiveTopic(topic); setStudyAnswers({}); setStudySubmitted(false); }}
                          className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-2.5 rounded-lg"
                        >
                          Bắt đầu ôn tập chuyên đề →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comp' && (
          <div>
            {activeComp ? (
              <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-3xl mx-auto">
                <button onClick={() => { setActiveComp(null); setCompResult(null); }} className="text-xs text-emerald-700 font-semibold mb-4">
                  ← Danh sách các cuộc thi
                </button>
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl mb-6">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 uppercase">Chủ đề: {activeComp.theme}</span>
                    <span className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      <Clock size={13} /> {formatCountdown(activeComp.end_time)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">{activeComp.title}</h2>
                  <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
                    <p className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1">
                      <Award size={15} /> Cơ cấu giải thưởng:
                    </p>
                    {parsePrizes(activeComp.prize_desc).map((pz, idx) => (
                      <p key={idx} className="text-sm text-emerald-900">
                        • <strong>{pz.rank}</strong> ({pz.quantity} giải): {pz.value}
                      </p>
                    ))}
                  </div>
                </div>

                {compResult ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-xl text-center space-y-3">
                    <CheckCircle size={40} className="text-emerald-700 mx-auto" />
                    <h3 className="text-xl font-bold text-emerald-900">Đã ghi nhận bài dự thi thành công!</h3>
                    <p className="text-base">
                      Bạn trả lời đúng <strong>{compResult.score}/{compResult.total}</strong> câu hỏi.
                    </p>
                  </div>
                ) : new Date(activeComp.end_time) <= now ? (
                  <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center text-red-700 font-semibold">
                    Cuộc thi này đã hết thời gian nhận bài dự thi.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitCompetition} className="space-y-5">
                    {(activeComp.questions || []).map((q, idx) => (
                      <div key={idx} className="p-4 bg-stone-50 rounded-xl border space-y-2">
                        <p className="font-bold">Câu {idx + 1}: {q.q}</p>
                        {q.options.map((opt, oIdx) => (
                          <label key={oIdx} className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border cursor-pointer hover:bg-emerald-50">
                            <input
                              type="radio"
                              name={`comp_q_${idx}`}
                              checked={compAnswers[idx] === oIdx}
                              onChange={() => setCompAnswers({ ...compAnswers, [idx]: oIdx })}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ))}

                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-300 space-y-3">
                      <h4 className="font-bold text-amber-950 text-sm">Câu hỏi phụ & Thông tin nhận giải (Bắt buộc)</h4>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Dự đoán có bao nhiêu người trả lời đúng 100% bộ câu hỏi kỳ này?
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={compForm.predicted}
                          onChange={(e) => setCompForm({ ...compForm, predicted: e.target.value })}
                          placeholder="Ví dụ: 35"
                          className="w-full border rounded-lg px-3 py-2 bg-white"
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <input required value={compForm.full_name} onChange={(e) => setCompForm({ ...compForm, full_name: e.target.value })} placeholder="Họ và tên người thi" className="border rounded-lg px-3 py-2 bg-white text-sm" />
                        <input required value={compForm.phone} onChange={(e) => setCompForm({ ...compForm, phone: e.target.value })} placeholder="Số điện thoại (Zalo)" className="border rounded-lg px-3 py-2 bg-white text-sm" />
                        <input required value={compForm.commune} onChange={(e) => setCompForm({ ...compForm, commune: e.target.value })} placeholder="Xã / Phường" className="border rounded-lg px-3 py-2 bg-white text-sm" />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl">
                      Gửi Bài Dự Thi & Dự Đoán
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-2xl">
                  <h2 className="text-xl font-bold">Đấu trường Kiến thức Nông dân Thi (Định kỳ Tháng)</h2>
                  <p className="text-sm text-amber-100 mt-1">
                    Trả lời đúng bộ câu hỏi chủ đề tháng và dự đoán sát số người trả lời đúng để nhận Voucher cá giống, cây giống, tài liệu kỹ thuật và thẻ cào.
                  </p>
                </div>
                {competitions.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border text-center text-gray-500">Hiện chưa có cuộc thi nào được mở.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {competitions.map(c => {
                      const expired = new Date(c.end_time) <= now;
                      const prizeList = parsePrizes(c.prize_desc);
                      return (
                        <div key={c.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center gap-2">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${expired ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                                {formatCountdown(c.end_time)}
                              </span>
                              <button
                                onClick={() => setQrModalTitle(c.title)}
                                className="text-xs text-gray-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <QrCode size={15} /> Mã QR
                              </button>
                            </div>
                            <h3 className="font-bold text-lg mt-2">{c.title}</h3>
                            <p className="text-xs text-gray-600 mt-1">Chủ đề: {c.theme}</p>
                            <div className="mt-2.5 space-y-1 bg-amber-50/70 p-2.5 rounded-lg border border-amber-100">
                              {prizeList.map((pz, i) => (
                                <p key={i} className="text-xs text-emerald-900">
                                  <strong>{pz.rank} ({pz.quantity}):</strong> {pz.value}
                                </p>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => { setActiveComp(c); setCompAnswers({}); setCompResult(null); }}
                            className={`mt-4 text-sm font-semibold py-2.5 rounded-lg text-white ${
                              expired ? 'bg-gray-500' : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                          >
                            {expired ? 'Xem thông tin cuộc thi (Đã đóng)' : 'Tham gia dự thi ngay →'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'surveys' && (
          <div>
            {activeSurvey ? (
              <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-3xl mx-auto">
                <button onClick={() => setActiveSurvey(null)} className="text-xs text-emerald-700 font-semibold mb-4">
                  ← Danh sách các đợt khảo sát
                </button>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-950">{activeSurvey.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">{activeSurvey.description}</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                    {formatCountdown(activeSurvey.end_time)}
                  </span>
                </div>

                {surveySubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-xl text-center space-y-2">
                    <CheckCircle size={40} className="text-emerald-700 mx-auto" />
                    <h3 className="font-bold text-lg text-emerald-900">Cảm ơn bà con/cán bộ đã gửi phiếu khảo sát!</h3>
                  </div>
                ) : new Date(activeSurvey.end_time) <= now ? (
                  <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center text-red-700 font-semibold">
                    Đợt khảo sát này đã hết thời hạn tiếp nhận phiếu.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitSurvey} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border">
                      <input
                        value={surveyMeta.respondent_name}
                        onChange={(e) => setSurveyMeta({ ...surveyMeta, respondent_name: e.target.value })}
                        placeholder="Họ và tên (không bắt buộc)"
                        className="border rounded-lg px-3 py-2 bg-white text-sm"
                      />
                      <input
                        required
                        value={surveyMeta.commune}
                        onChange={(e) => setSurveyMeta({ ...surveyMeta, commune: e.target.value })}
                        placeholder="Xã / Phường đang sinh sống (Bắt buộc)*"
                        className="border rounded-lg px-3 py-2 bg-white text-sm"
                      />
                    </div>

                    {(activeSurvey.questions || []).map((q, idx) => (
                      <div key={q.id} className="p-4 border rounded-xl space-y-2">
                        <p className="font-bold text-sm">
                          Câu {idx + 1}: {q.label}{' '}
                          {q.type === 'multi' && <span className="text-xs font-normal text-emerald-700">(Có thể chọn nhiều đáp án)</span>}
                        </p>
                        {q.type === 'choice' ? (
                          <div className="space-y-1.5">
                            {(q.options || []).map(opt => (
                              <label key={opt} className="flex items-center gap-2 p-2 rounded hover:bg-emerald-50 cursor-pointer text-sm">
                                <input
                                  type="radio"
                                  required
                                  name={q.id}
                                  checked={surveyAnswers[q.id] === opt}
                                  onChange={() => handleSurveyAnswerChange(q.id, opt)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : q.type === 'multi' ? (
                          <div className="space-y-1.5">
                            {(q.options || []).map(opt => {
                              const checked = Array.isArray(surveyAnswers[q.id]) && surveyAnswers[q.id].includes(opt);
                              return (
                                <label key={opt} className="flex items-center gap-2 p-2 rounded hover:bg-emerald-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleSurveyMultiToggle(q.id, opt)}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            required
                            value={surveyAnswers[q.id] || ''}
                            onChange={(e) => handleSurveyAnswerChange(q.id, e.target.value)}
                            placeholder="Nhập câu trả lời hoặc số liệu..."
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    ))}

                    <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl">
                      Gửi Phiếu Khảo Sát
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-900 text-white p-6 rounded-2xl">
                  <h2 className="text-xl font-bold">Phiếu Khảo sát & Thu thập Nhu cầu Sản xuất</h2>
                  <p className="text-sm text-emerald-100 mt-1">
                    Hệ thống tự động lưu nháp trên điện thoại khi đang điền; cán bộ xã có thể tải Mã QR từng phiếu để gửi vào nhóm Zalo thôn bản.
                  </p>
                </div>
                {surveys.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border text-center text-gray-500">Hiện chưa có đợt khảo sát nào đang mở.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {surveys.map(s => {
                      const expired = new Date(s.end_time) <= now;
                      return (
                        <div key={s.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center gap-2">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${expired ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-800'}`}>
                                {formatCountdown(s.end_time)}
                              </span>
                              <button
                                onClick={() => setQrModalTitle(s.title)}
                                className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                              >
                                <QrCode size={15} /> Lấy mã QR Zalo
                              </button>
                            </div>
                            <h3 className="font-bold text-lg mt-2">{s.title}</h3>
                            <p className="text-xs text-gray-600 mt-1">{s.description}</p>
                          </div>
                          <button
                            onClick={() => handleOpenSurvey(s)}
                            className={`mt-4 text-sm font-semibold py-2.5 rounded-lg text-white ${
                              expired ? 'bg-gray-500' : 'bg-emerald-700 hover:bg-emerald-800'
                            }`}
                          >
                            {expired ? 'Đã hết hạn khảo sát' : 'Điền phiếu khảo sát →'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="grid md:grid-cols-3 gap-6">
            <form onSubmit={handleSendQa} className="bg-white p-5 rounded-xl border shadow-sm space-y-3 h-fit">
              <h3 className="font-bold text-emerald-900">Gửi câu hỏi tới Kỹ sư Trung tâm</h3>
              <p className="text-xs text-gray-500">Hỏi về kỹ thuật trồng trọt, chăn nuôi, phòng trị bệnh vật nuôi, giá giống...</p>
              {qaSent && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg">
                  Đã gửi câu hỏi thành công! Kỹ sư chuyên môn sẽ trả lời và hiển thị công khai tại mục này.
                </div>
              )}
              <input required value={qaForm.asker_name} onChange={(e) => setQaForm({ ...qaForm, asker_name: e.target.value })} placeholder="Họ và tên của bạn" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input required value={qaForm.commune} onChange={(e) => setQaForm({ ...qaForm, commune: e.target.value })} placeholder="Xã / Phường" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea required rows={4} value={qaForm.question} onChange={(e) => setQaForm({ ...qaForm, question: e.target.value })} placeholder="Nhập nội dung cần tư vấn kỹ thuật..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5">
                <Send size={15} /> Gửi câu hỏi tư vấn
              </button>
            </form>

            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-lg text-gray-800">Giải đáp kỹ thuật đã công bố ({qaList.length})</h3>
              {qaList.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border text-center text-gray-500 text-sm">
                  Chưa có câu hỏi nào được công bố.
                </div>
              ) : (
                qaList.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-xl border shadow-sm space-y-2.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Người hỏi: <strong>{item.asker_name}</strong> ({item.commune})</span>
                      <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="font-semibold text-gray-900">Hỏi: {item.question}</p>
                    {item.answer && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-700 p-3.5 rounded-r-lg text-sm text-emerald-950">
                        <strong>Kỹ sư Khuyến nông trả lời:</strong> {item.answer}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {qrModalTitle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setQrModalTitle('')}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base text-emerald-950">{qrModalTitle}</h3>
            <div className="bg-white p-4 border rounded-xl inline-block">
              <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.href : 'https://khuyennongcb.gov.vn'} size={190} />
            </div>
            <p className="text-xs text-gray-600">Chụp màn hình mã QR này gửi vào nhóm Zalo các xã/phường để bà con quét mở trực tiếp trên điện thoại.</p>
            <button onClick={() => setQrModalTitle('')} className="w-full bg-emerald-700 text-white py-2 rounded-lg text-sm font-semibold">
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}

      <footer className="bg-emerald-950 text-emerald-200 text-xs mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="font-bold text-white uppercase">Trung tâm Khuyến nông và Giống Nông lâm nghiệp Cao Bằng</p>
            <p className="mt-1">Hệ thống thông tin kỹ thuật, đào tạo trực tuyến và khảo sát nông nghiệp tỉnh Cao Bằng.</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="bg-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-800">
              Tổng lượt truy cập: <strong className="text-amber-400">{totalVisits.toLocaleString('vi-VN')}</strong>
            </span>
            <Link href="/admin" className="text-emerald-400 hover:text-white inline-flex items-center gap-1">
              <Lock size={13} /> Cổng Quản trị Cán bộ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}