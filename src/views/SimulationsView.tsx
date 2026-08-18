import React, { useState, useEffect, useRef } from 'react';
import { HTMLSimulation, User } from '../types';
import { Play, Maximize2, Minimize2, X, Plus, ExternalLink, Filter, Code, Upload, Image, Pencil, Trash2, Loader2 } from 'lucide-react';
import { SimulationFrame } from '../components/SimulationFrame';
import { loadSimulationHtmlContent, saveSimulationToFirestore } from '../lib/simulationStorage';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SimulationsProps {
  user: User;
  simulations: HTMLSimulation[];
  onAddSimulation?: (sim: HTMLSimulation) => void;
}

export function SimulationsView({ user, simulations: initialSims, onAddSimulation }: SimulationsProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';

  // Filter simList for Teacher vs Admin
  const filteredSimList = React.useMemo(() => {
    return initialSims;
  }, [initialSims]);

  const [simList, setSimList] = useState<HTMLSimulation[]>(filteredSimList);
  const [activeSim, setActiveSim] = useState<HTMLSimulation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const simContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSimList(filteredSimList);
  }, [filteredSimList]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (simContainerRef.current) {
        simContainerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          setIsFullscreen(!isFullscreen);
        });
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Modal State for Add & Edit Simulation
  const [showModal, setShowModal] = useState(false);
  const [editingSim, setEditingSim] = useState<HTMLSimulation | null>(null);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formHtmlContent, setFormHtmlContent] = useState('');
  const [formSourceType, setFormSourceType] = useState<'url' | 'html_code'>('url');
  const [formCategory, setFormCategory] = useState('Đại Số');
  const [formThumbnailSource, setFormThumbnailSource] = useState<'url' | 'upload' | 'default'>('default');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formThumbnailFile, setFormThumbnailFile] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);

  const categories = ['Tất cả', 'Đại Số', 'Hình Học', 'Khác'];

  const filteredSims = selectedCategory === 'Tất cả' 
    ? simList 
    : simList.filter(s => s.category === selectedCategory);

  // Open modal for creating a new simulation
  const handleOpenAddModal = () => {
    setEditingSim(null);
    setFormTitle('');
    setFormDesc('');
    setFormUrl('');
    setFormHtmlContent('');
    setFormSourceType('url');
    setFormCategory('Đại Số');
    setFormThumbnailSource('default');
    setFormThumbnailUrl('');
    setFormThumbnailFile(null);
    setShowModal(true);
  };

  // Open modal for editing an existing simulation
  const handleOpenEditModal = async (sim: HTMLSimulation) => {
    setEditingSim(sim);
    setFormTitle(sim.title || '');
    setFormDesc(sim.description || '');
    setFormCategory(sim.category || 'Đại Số');
    setFormUrl(sim.url || '');

    const isHtml = !!sim.htmlContent;
    setFormSourceType(isHtml ? 'html_code' : 'url');

    // Handle Thumbnail Source detection
    const defaultThumb = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
    if (sim.thumbnail && sim.thumbnail.startsWith('data:image')) {
      setFormThumbnailSource('upload');
      setFormThumbnailFile(sim.thumbnail);
      setFormThumbnailUrl('');
    } else if (sim.thumbnail && sim.thumbnail !== defaultThumb) {
      setFormThumbnailSource('url');
      setFormThumbnailUrl(sim.thumbnail);
      setFormThumbnailFile(null);
    } else {
      setFormThumbnailSource('default');
      setFormThumbnailUrl('');
      setFormThumbnailFile(null);
    }

    setShowModal(true);

    if (isHtml) {
      setIsLoadingHtml(true);
      try {
        const fullHtml = await loadSimulationHtmlContent(sim);
        setFormHtmlContent(fullHtml);
      } catch (err) {
        console.error('Lỗi giải nén mã HTML khi sửa:', err);
        setFormHtmlContent(sim.htmlContent || '');
      } finally {
        setIsLoadingHtml(false);
      }
    } else {
      setFormHtmlContent('');
    }
  };

  // Submit form for creating or updating simulation
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const defaultThumb = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
      let resolvedThumbnail = defaultThumb;
      if (formThumbnailSource === 'url' && formThumbnailUrl) {
        resolvedThumbnail = formThumbnailUrl.trim();
      } else if (formThumbnailSource === 'upload' && formThumbnailFile) {
        resolvedThumbnail = formThumbnailFile;
      }

      const simId = editingSim ? editingSim.id : `sim_${Date.now()}`;

      const simData: HTMLSimulation = {
        id: simId,
        title: formTitle.trim() || 'Mô phỏng mới',
        description: formDesc.trim() || '',
        url: formSourceType === 'url' ? formUrl.trim() : '',
        htmlContent: formSourceType === 'html_code' ? formHtmlContent : '',
        thumbnail: resolvedThumbnail,
        category: formCategory || 'Khác',
        hasQuiz: editingSim ? editingSim.hasQuiz : false,
        teacherId: editingSim ? editingSim.teacherId : (user.id || ''),
        teacherName: editingSim ? editingSim.teacherName : (user.name || 'Giáo viên'),
      };

      // Save to Firestore with compression & chunking support
      await saveSimulationToFirestore(simData);

      // Update local state list
      setSimList(prev => {
        const exists = prev.some(s => s.id === simId);
        if (exists) {
          return prev.map(s => s.id === simId ? simData : s);
        } else {
          return [simData, ...prev];
        }
      });

      if (onAddSimulation && !editingSim) {
        onAddSimulation(simData);
      }

      setShowModal(false);
      setEditingSim(null);
    } catch (err) {
      console.error("Lỗi khi lưu mô phỏng:", err);
      alert("Đã xảy ra lỗi khi lưu mô phỏng. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle simulation deletion
  const handleDeleteSim = async (simId: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'simulations', simId));
      setSimList(prev => prev.filter(s => s.id !== simId));
    } catch (err) {
      console.error("Lỗi khi xóa mô phỏng:", err);
    }
  };

  // Active Fullscreen / Embedded Simulation Viewer
  if (activeSim) {
    return (
      <div 
        ref={simContainerRef}
        className={
          isFullscreen 
            ? "fixed inset-0 z-[99999] w-screen h-screen bg-slate-900 flex flex-col rounded-none" 
            : "h-[calc(100vh-6rem)] flex flex-col bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-200"
        }
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0">
              {activeSim.category || 'Mô phỏng Tương tác'}
            </span>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg truncate">{activeSim.title}</h2>
              {activeSim.description && (
                <p className="text-xs text-slate-500 line-clamp-1 truncate max-w-xl" title={activeSim.description}>
                  {activeSim.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Zoom Toàn màn hình */}
            <button 
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md border border-indigo-500"
              title={isFullscreen ? "Thu nhỏ (Esc)" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Toàn màn hình</span>
                </>
              )}
            </button>

            {activeSim.url && (
              <button 
                onClick={() => window.open(activeSim.url, '_blank')}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200 hover:border-indigo-200 bg-white shadow-xs"
                title="Mở ra tab mới"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                setIsFullscreen(false);
                setActiveSim(null);
              }}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-200 bg-white shadow-xs"
              title="Đóng mô phỏng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white relative overflow-hidden">
          <SimulationFrame simulation={activeSim} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              {isTeacher ? 'Kho Mô Phỏng Dành Cho Giáo Viên' : 'Vui Chơi & Học Tập'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Thí Nghiệm & Mô Phỏng Tương Tác</h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isTeacher 
                ? 'Nơi giáo viên thêm link PhET hoặc nhúng file HTML tĩnh cho học sinh học tập sinh động' 
                : 'Nơi học sinh vui chơi sau tiết học, tự do khám phá và thực hành các mô phỏng Vật lý, Hóa học, Toán học!'}
            </p>
          </div>

          {isTeacher && (
            <button 
              onClick={handleOpenAddModal}
              className="px-5 py-3 bg-white text-emerald-800 font-bold text-xs sm:text-sm rounded-2xl hover:bg-emerald-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm Link PhET / HTML
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Simulations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSims.map(sim => (
          <div 
            key={sim.id} 
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div 
                className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setActiveSim(sim)}
              >
                <img 
                  src={sim.thumbnail} 
                  alt={sim.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                  {sim.category || 'Mô phỏng'}
                </div>
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 shadow-lg">
                    <Play className="w-6 h-6 ml-1" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-indigo-600 transition-colors">{sim.title}</h3>
                <div className="relative">
                  <p 
                    className={`text-xs text-slate-600 leading-relaxed transition-all duration-300 ${
                      expandedDescIds[sim.id] ? '' : 'line-clamp-2'
                    }`}
                  >
                    {sim.description}
                  </p>
                  {sim.description && sim.description.length > 70 && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDescIds(prev => ({ ...prev, [sim.id]: !prev[sim.id] }));
                      }}
                      className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 focus:outline-none"
                    >
                      {expandedDescIds[sim.id] ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between gap-2">
              <button 
                onClick={() => setActiveSim(sim)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Trải nghiệm
              </button>
              
              {isTeacher && (
                <>
                  <button 
                    onClick={() => handleOpenEditModal(sim)}
                    className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors border border-amber-200"
                    title="Sửa thông tin mô phỏng"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleDeleteSim(sim.id, sim.title)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200"
                    title="Xóa mô phỏng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {!sim.htmlContent && sim.url && (
                <a 
                  href={sim.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Mở tab riêng"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TEACHER ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header - Fixed at Top */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                {editingSim ? 'Chỉnh Sửa Bài Mô Phỏng' : 'Thêm Mô Phỏng / HTML Tĩnh'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLoadingHtml ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold">Đang tải mã nguồn mô phỏng...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên bài mô phỏng Toán:</label>
                    <input 
                      required type="text"
                      value={formTitle} onChange={e => setFormTitle(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="VD: Mô phỏng Đồ thị Hàm số bậc hai"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Môn học / Phân loại Toán:</label>
                    <select 
                      value={formCategory} onChange={e => setFormCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Đại Số">Đại Số</option>
                      <option value="Hình Học">Hình Học</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hình thức nhúng:</label>
                    <div className="flex gap-4 mb-1">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="sourceType" 
                          checked={formSourceType === 'url'} 
                          onChange={() => setFormSourceType('url')} 
                        />
                        Đường dẫn URL
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="sourceType" 
                          checked={formSourceType === 'html_code'} 
                          onChange={() => setFormSourceType('html_code')} 
                        />
                        Đính kèm file / Dán mã HTML
                      </label>
                    </div>
                  </div>

                  {formSourceType === 'url' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Đường link mô phỏng (URL):</label>
                      <input 
                        required type="url"
                        value={formUrl} onChange={e => setFormUrl(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://phet.colorado.edu/sims/html/..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Tải lên / Thay thế tệp HTML (.html):</label>
                        <div className="p-4 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl bg-slate-50 hover:bg-indigo-50/20 transition-all relative flex flex-col items-center justify-center text-center cursor-pointer">
                          <input 
                            type="file" 
                            accept=".html"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result;
                                if (typeof text === 'string') {
                                  setFormHtmlContent(text);
                                  if (!formTitle) {
                                    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                    setFormTitle(nameWithoutExt);
                                  }
                                }
                              };
                              reader.readAsText(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="w-8 h-8 text-indigo-500 mb-1.5" />
                          <p className="font-bold text-slate-700 text-[11px]">Chọn file .html từ máy tính</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Kéo thả file vào đây hoặc bấm để chọn tệp</p>
                        </div>
                      </div>

                      <div>
                        <textarea 
                          rows={5}
                          value={formHtmlContent} onChange={e => setFormHtmlContent(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono text-[10px] resize-y bg-slate-50 focus:bg-white custom-scrollbar"
                          placeholder="Dán mã HTML/CSS/JS tại đây..."
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ảnh bìa mô phỏng:</label>
                    <div className="flex gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() => setFormThumbnailSource('default')}
                        className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                          formThumbnailSource === 'default'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Mặc định
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormThumbnailSource('url')}
                        className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                          formThumbnailSource === 'url'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Đường dẫn URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormThumbnailSource('upload')}
                        className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                          formThumbnailSource === 'upload'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Tải ảnh lên
                      </button>
                    </div>

                    {formThumbnailSource === 'url' && (
                      <div className="space-y-2">
                        <input 
                          type="url"
                          value={formThumbnailUrl}
                          onChange={e => setFormThumbnailUrl(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Dán link ảnh (https://...)"
                        />
                        {formThumbnailUrl && (
                          <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                            <img src={formThumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {formThumbnailSource === 'upload' && (
                      <div className="space-y-2">
                        <div className="p-3 border border-dashed border-slate-300 hover:border-indigo-500 rounded-xl bg-slate-50/50 hover:bg-indigo-50/10 transition-all relative flex flex-col items-center justify-center text-center cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const rawData = event.target?.result;
                                if (typeof rawData === 'string') {
                                  const img = new window.Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const maxWidth = 1280;
                                    const maxHeight = 800;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > maxWidth) {
                                      height = Math.round((height * maxWidth) / width);
                                      width = maxWidth;
                                    }
                                    if (height > maxHeight) {
                                      width = Math.round((width * maxHeight) / height);
                                      height = maxHeight;
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.imageSmoothingEnabled = true;
                                      ctx.imageSmoothingQuality = 'high';
                                      ctx.drawImage(img, 0, 0, width, height);
                                      setFormThumbnailFile(canvas.toDataURL('image/jpeg', 0.92));
                                    } else {
                                      setFormThumbnailFile(rawData);
                                    }
                                  };
                                  img.onerror = () => setFormThumbnailFile(rawData);
                                  img.src = rawData;
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Image className="w-6 h-6 text-indigo-500 mb-1" />
                          <p className="font-bold text-slate-700 text-[10px]">Tải ảnh lên từ thiết bị</p>
                        </div>
                        {formThumbnailFile && (
                          <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                            <img src={formThumbnailFile} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {formThumbnailSource === 'default' && (
                      <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80" alt="Preview default" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn gọn:</label>
                    <textarea 
                      rows={2}
                      value={formDesc} onChange={e => setFormDesc(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none resize-none custom-scrollbar"
                      placeholder="Yêu cầu học sinh thực hành gì..."
                    />
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 sticky bottom-0 bg-white">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                      Hủy
                    </button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5">
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {editingSim ? 'Cập Nhật Thay Đổi' : 'Thêm vào Thư viện'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
