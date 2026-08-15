import React, { useState, useEffect } from 'react';
import { HTMLSimulation, User } from '../types';
import { Play, Maximize2, X, Plus, ExternalLink, Sparkles, Filter, Code, Upload, Image } from 'lucide-react';

interface SimulationsProps {
  user: User;
  simulations: HTMLSimulation[];
  onAddSimulation?: (sim: HTMLSimulation) => void;
}

export function SimulationsView({ user, simulations: initialSims, onAddSimulation }: SimulationsProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Filter simList for Teacher vs Admin
  const filteredSimList = React.useMemo(() => {
    if (isAdmin) return initialSims;
    if (user.role === 'teacher') {
      return initialSims.filter(s => !s.teacherId || s.teacherId === user.id);
    }
    return initialSims;
  }, [initialSims, user, isAdmin]);

  const [simList, setSimList] = useState<HTMLSimulation[]>(filteredSimList);
  const [activeSim, setActiveSim] = useState<HTMLSimulation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  useEffect(() => {
    setSimList(filteredSimList);
  }, [filteredSimList]);

  // Teacher modal for adding custom simulation / HTML link
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newHtmlContent, setNewHtmlContent] = useState('');
  const [newSourceType, setNewSourceType] = useState<'url' | 'html_code'>('url');
  const [newCategory, setNewCategory] = useState('Đại Số');
  const [newThumbnailSource, setNewThumbnailSource] = useState<'url' | 'upload' | 'default'>('default');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newThumbnailFile, setNewThumbnailFile] = useState<string | null>(null);

  const categories = ['Tất cả', 'Đại Số', 'Hình Học', 'Khác'];

  const filteredSims = selectedCategory === 'Tất cả' 
    ? simList 
    : simList.filter(s => s.category === selectedCategory);

  const handleAddSim = (e: React.FormEvent) => {
    e.preventDefault();
    
    let resolvedThumbnail = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
    if (newThumbnailSource === 'url' && newThumbnailUrl) {
      resolvedThumbnail = newThumbnailUrl;
    } else if (newThumbnailSource === 'upload' && newThumbnailFile) {
      resolvedThumbnail = newThumbnailFile;
    }

    const newSim: HTMLSimulation = {
      id: `sim_${Date.now()}`,
      title: newTitle,
      description: newDesc,
      url: newSourceType === 'url' ? newUrl : '',
      htmlContent: newSourceType === 'html_code' ? newHtmlContent : undefined,
      thumbnail: resolvedThumbnail,
      category: newCategory,
      hasQuiz: false,
      teacherId: user.id,
      teacherName: user.name,
    };
    setSimList([newSim, ...simList]);
    if (onAddSimulation) onAddSimulation(newSim);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
    setNewHtmlContent('');
    setNewThumbnailSource('default');
    setNewThumbnailUrl('');
    setNewThumbnailFile(null);
  };

  // Active Fullscreen / Embedded Simulation Viewer
  if (activeSim) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              {activeSim.category || 'Mô phỏng Tương tác'}
            </span>
            <h2 className="font-bold text-slate-900 text-lg">{activeSim.title}</h2>
          </div>

          <div className="flex space-x-2">
            {!activeSim.htmlContent && activeSim.url && (
              <button 
                onClick={() => window.open(activeSim.url, '_blank')}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                title="Mở tab mới"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setActiveSim(null)}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Đóng mô phỏng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white relative">
          {activeSim.htmlContent ? (
            <iframe 
              srcDoc={activeSim.htmlContent}
              className="absolute inset-0 w-full h-full border-0 bg-white"
              allowFullScreen
              title={activeSim.title}
            />
          ) : (
            <iframe 
              src={activeSim.url}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              title={activeSim.title}
            />
          )}
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
              onClick={() => setShowAddModal(true)}
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
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{sim.description}</p>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between gap-3">
              <button 
                onClick={() => setActiveSim(sim)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Trải nghiệm ngay
              </button>
              
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

      {/* TEACHER ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                Thêm Mô Phỏng / HTML Tĩnh
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSim} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên bài mô phỏng Toán:</label>
                <input 
                  required type="text"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: Mô phỏng Đồ thị Hàm số bậc hai"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Môn học / Phân loại Toán:</label>
                <select 
                  value={newCategory} onChange={e => setNewCategory(e.target.value)}
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
                      checked={newSourceType === 'url'} 
                      onChange={() => setNewSourceType('url')} 
                    />
                    Đường dẫn URL
                  </label>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sourceType" 
                      checked={newSourceType === 'html_code'} 
                      onChange={() => setNewSourceType('html_code')} 
                    />
                    Đính kèm file / Dán mã HTML
                  </label>
                </div>
              </div>

              {newSourceType === 'url' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đường link mô phỏng (URL):</label>
                  <input 
                    required type="url"
                    value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://phet.colorado.edu/sims/html/..."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Tải lên tệp HTML của bạn (.html):</label>
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
                              setNewHtmlContent(text);
                              if (!newTitle) {
                                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                setNewTitle(nameWithoutExt);
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
                      value={newHtmlContent} onChange={e => setNewHtmlContent(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono text-[10px] resize-y bg-slate-50 focus:bg-white"
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
                    onClick={() => setNewThumbnailSource('default')}
                    className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                      newThumbnailSource === 'default'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Mặc định
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewThumbnailSource('url')}
                    className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                      newThumbnailSource === 'url'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Đường dẫn URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewThumbnailSource('upload')}
                    className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                      newThumbnailSource === 'upload'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tải ảnh lên
                  </button>
                </div>

                {newThumbnailSource === 'url' && (
                  <div className="space-y-2">
                    <input 
                      type="url"
                      value={newThumbnailUrl}
                      onChange={e => setNewThumbnailUrl(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Dán link ảnh (https://...)"
                    />
                    {newThumbnailUrl && (
                      <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        <img src={newThumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {newThumbnailSource === 'upload' && (
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
                            if (typeof event.target?.result === 'string') {
                              setNewThumbnailFile(event.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <Image className="w-6 h-6 text-indigo-500 mb-1" />
                      <p className="font-bold text-slate-700 text-[10px]">Tải ảnh lên từ thiết bị</p>
                    </div>
                    {newThumbnailFile && (
                      <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        <img src={newThumbnailFile} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {newThumbnailSource === 'default' && (
                  <div className="mt-1 h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80" alt="Preview default" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn gọn:</label>
                <textarea 
                  rows={2}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none resize-none"
                  placeholder="Yêu cầu học sinh thực hành gì..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-colors">
                  Thêm vào Thư viện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
