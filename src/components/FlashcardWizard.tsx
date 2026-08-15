import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Play, X, HelpCircle, Download, Upload, Plus } from 'lucide-react';
import { SAMPLE_TEMPLATES } from '../views/AssignmentsView';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardWizardProps {
  flashcardSubStep: 1 | 2;
  setFlashcardSubStep: (step: 1 | 2) => void;
  newFlashcards: Flashcard[];
  setNewFlashcards: (cards: Flashcard[]) => void;
  rawQuestionCode: string;
  setRawQuestionCode: (code: string) => void;
  setShowFlashcardPreview: (show: boolean) => void;
  setShowGamePreview: (show: boolean) => void;
  handleDownloadSampleFlashcards: () => void;
  handleImportFlashcards: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FlashcardWizard: React.FC<FlashcardWizardProps> = ({
  flashcardSubStep,
  setFlashcardSubStep,
  newFlashcards,
  setNewFlashcards,
  rawQuestionCode,
  setRawQuestionCode,
  setShowFlashcardPreview,
  setShowGamePreview,
  handleDownloadSampleFlashcards,
  handleImportFlashcards,
}) => {
  return (
    <div id="flashcard-wizard-container" className="flex-1 flex flex-col md:overflow-hidden bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
      {/* Stepper Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 border-b border-slate-100 pb-3 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar flex-1 pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFlashcardSubStep(1)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${flashcardSubStep === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">1</span>
            Thiết Lập Bộ Thẻ
          </button>
          <span className="text-slate-300 text-xs shrink-0">➔</span>
          <button
            type="button"
            onClick={() => setFlashcardSubStep(2)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${flashcardSubStep === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">2</span>
            Câu Hỏi Trắc Nghiệm
          </button>
        </div>
      </div>

      {/* Step Contents */}
      <div className="flex-1 md:overflow-hidden min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {flashcardSubStep === 1 && (
            <motion.div 
              key="flashcard-step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0 bg-white p-3 rounded-2xl border shadow-sm">
                <div>
                  <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 1</span>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mt-1 flex items-center gap-2">
                    <span>🗂️</span> Tạo danh sách thẻ ghi nhớ ({newFlashcards.length} thẻ)
                  </h4>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    type="button"
                    onClick={() => setShowFlashcardPreview(true)}
                    className="px-3 sm:px-4 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Xem trước trải nghiệm học lật thẻ của học sinh"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-700" /> Xem trước bộ thẻ
                  </button>
                  <button 
                    type="button"
                    onClick={handleDownloadSampleFlashcards}
                    className="px-3 sm:px-4 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-xl text-xs border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải file mẫu
                  </button>
                  <label className="px-3 sm:px-4 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Nhập file
                    <input type="file" accept=".txt,.csv" hidden onChange={handleImportFlashcards} />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setNewFlashcards([...newFlashcards, { id: Date.now().toString(), front: '', back: '' }])} 
                    className="px-3 sm:px-4 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm thẻ mới
                  </button>
                </div>
              </div>

              {/* Guidance Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2 shrink-0">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Nhập Flashcards thông minh:</span> Bạn có thể thêm tay, hoặc chuẩn bị file văn bản chứa nội dung dạng <code className="mx-1 px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold text-amber-800">Mặt trước - Mặt sau</code> (hoặc cách nhau bằng dấu phẩy) rồi tải lên để nhập hàng loạt cực nhanh.
                </div>
              </div>

              {/* Scrolling List of Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-4 custom-scrollbar">
                {newFlashcards.map((card, index) => (
                  <div key={card.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group hover:border-indigo-200 transition-colors">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">Thẻ #{index + 1}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          if (newFlashcards.length > 1) {
                            setNewFlashcards(newFlashcards.filter(c => c.id !== card.id));
                          } else {
                            alert('Bộ thẻ cần ít nhất 1 thẻ!');
                          }
                        }} 
                        className="p-1.5 bg-white text-rose-500 rounded-lg hover:bg-rose-50 border border-slate-200 transition-colors shadow-sm"
                        title="Xóa thẻ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mặt trước (Câu hỏi / Từ vựng)</label>
                        <textarea 
                          value={card.front} 
                          onChange={(e) => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, front: e.target.value } : c))} 
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none h-20 bg-white" 
                          placeholder="Nhập nội dung mặt trước..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mặt sau (Đáp án / Giải nghĩa)</label>
                        <textarea 
                          value={card.back} 
                          onChange={(e) => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, back: e.target.value } : c))} 
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 resize-none h-20 bg-white" 
                          placeholder="Nhập nội dung mặt sau..." 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {flashcardSubStep === 2 && (
            <motion.div 
              key="flashcard-step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-4 w-full"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 2</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span>📝</span> Mã nguồn câu hỏi kiểm tra Flashcard
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {rawQuestionCode.split('\n').length} dòng
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setFlashcardSubStep(1)}
                    className="px-3 py-1.5 text-slate-600 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200"
                  >
                    ⬅️ Quay lại
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowGamePreview(true)} 
                    className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 flex items-center gap-1.5 border border-emerald-500 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" /> Xem trước bài kiểm tra
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[220px]">
                <div className="w-10 bg-slate-50 border-r border-slate-200 text-right pt-4 text-[11px] font-mono text-slate-400 select-none overflow-hidden pb-4 shrink-0">
                  {Array.from({ length: Math.max(rawQuestionCode.split('\n').length, 12) }, (_, i) => i + 1).map(num => (
                    <div key={num} className="pr-2 leading-relaxed h-[21px]">{num}</div>
                  ))}
                </div>
                <textarea
                  value={rawQuestionCode}
                  onChange={(e) => setRawQuestionCode(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm kiểm tra sau khi học..."
                  className="flex-1 w-full p-4 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                  spellCheck={false}
                />
              </div>

              {/* Templates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu đề thi:</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 1</button>
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 2</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
