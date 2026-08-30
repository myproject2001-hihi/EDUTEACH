import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, Play, X, HelpCircle, Download, Upload, Plus, Trash2, Image, Link, 
  FolderOpen, Sparkles, AlertCircle, ArrowRight, Check, HelpCircle as QuestionIcon
} from 'lucide-react';
import { SAMPLE_TEMPLATES } from '../views/AssignmentsView';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  image?: string;
  frontImage?: string;
  backImage?: string;
}

interface FlashcardWizardProps {
  flashcardSubStep: 1 | 2;
  setFlashcardSubStep: (step: 1 | 2) => void;
  newFlashcards: Flashcard[];
  setNewFlashcards: (cards: Flashcard[]) => void;
  rawQuestionCode: string;
  setRawQuestionCode: (code: string) => void;
  setShowFlashcardPreview: (show: boolean) => void;
  setShowFlashcardQuizTest: (show: boolean) => void;
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
  setShowFlashcardQuizTest,
  handleDownloadSampleFlashcards,
  handleImportFlashcards,
}) => {
  // Smart Batch Image Importer Modal States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [frontFiles, setFrontFiles] = useState<{ name: string; base64: string; key: string }[]>([]);
  const [backFiles, setBackFiles] = useState<{ name: string; base64: string; key: string }[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  // Match Helper Function to extract standard numbers or normalized strings
  const extractKey = (filename: string): string => {
    // Remove extension
    const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
    // Match first sequence of digits
    const match = baseName.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10).toString(); // "01" -> "1"
    }
    // Fallback: lowercase alphanumeric name
    return baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Handle uploading multiple files for Front
  const handleFrontFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingFiles(true);
    const loaded: { name: string; base64: string; key: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await readFileAsBase64(file);
      loaded.push({
        name: file.name,
        base64,
        key: extractKey(file.name)
      });
    }

    setFrontFiles(loaded);
    setIsReadingFiles(false);
  };

  // Handle uploading multiple files for Back
  const handleBackFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingFiles(true);
    const loaded: { name: string; base64: string; key: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await readFileAsBase64(file);
      loaded.push({
        name: file.name,
        base64,
        key: extractKey(file.name)
      });
    }

    setBackFiles(loaded);
    setIsReadingFiles(false);
  };

  // Promise helper to read files as Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // Compute paired items preview
  const pairedItems = React.useMemo(() => {
    const allKeys = Array.from(new Set([
      ...frontFiles.map(f => f.key),
      ...backFiles.map(b => b.key)
    ])).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    return allKeys.map(key => {
      const front = frontFiles.find(f => f.key === key);
      const back = backFiles.find(b => b.key === key);
      return {
        key,
        front,
        back,
        status: front && back ? 'matched' : front ? 'only_front' : 'only_back'
      };
    });
  }, [frontFiles, backFiles]);

  // Execute import of matched cards
  const executeBatchImport = () => {
    if (pairedItems.length === 0) {
      alert('Chưa có file ảnh nào được chọn!');
      return;
    }

    const importedCards: Flashcard[] = pairedItems.map((item, idx) => {
      // Create clean text defaults based on keys/names
      const cleanFrontName = item.front 
        ? item.front.name.substring(0, item.front.name.lastIndexOf('.'))
        : '';
      const cleanBackName = item.back
        ? item.back.name.substring(0, item.back.name.lastIndexOf('.'))
        : '';

      return {
        id: `fc_batch_${Date.now()}_${idx}`,
        front: cleanFrontName || `Thẻ số ${item.key}`,
        back: cleanBackName || `Đáp án thẻ ${item.key}`,
        frontImage: item.front?.base64,
        backImage: item.back?.base64
      };
    });

    setNewFlashcards(importedCards);
    setShowBatchModal(false);
    setFrontFiles([]);
    setBackFiles([]);
    alert(`Đã ghép thành công và nhập ${importedCards.length} thẻ mới vào bài học!`);
  };

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
                    className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm border border-indigo-500 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-100 shrink-0"
                    title="Xem trước trải nghiệm học lật thẻ của học sinh"
                  >
                    <Play className="w-3.5 h-3.5" /> Preview bộ thẻ
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewFlashcards([{ id: Date.now().toString(), front: '', back: '' }])}
                    className="px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 shrink-0"
                    title="Xóa nhanh toàn bộ danh sách thẻ"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                  </button>
                  
                  {/* Smart Batch Upload Button */}
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(true)}
                    className="px-3 sm:px-4 py-2 bg-purple-50 text-purple-700 font-extrabold rounded-xl text-xs border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm active:scale-95"
                    title="Ghép hàng loạt ảnh mặt trước và mặt sau cực dễ"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Ghép ảnh hàng loạt
                  </button>

                  <button 
                    type="button"
                    onClick={handleDownloadSampleFlashcards}
                    className="px-3 sm:px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-xl text-xs border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải file mẫu
                  </button>
                  <label className="px-3 sm:px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" /> Nhập file
                    <input type="file" accept=".txt,.csv,.json" hidden onChange={handleImportFlashcards} />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setNewFlashcards([...newFlashcards, { id: Date.now().toString(), front: '', back: '' }])} 
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm thẻ mới
                  </button>
                </div>
              </div>

              {/* Guidance Banner */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-start gap-2 shrink-0">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-extrabold text-indigo-900">Mẹo cho Giáo viên:</span> Có thể dùng nút <span className="font-bold text-purple-700">"Ghép ảnh hàng loạt"</span> để tải lên cùng lúc nhiều ảnh mặt trước (Folder 1, 2, 3) và mặt sau (Folder 1, 2, 3), hệ thống sẽ tự động bắt cặp khớp theo số thứ tự hoặc tên cực kỳ nhanh chóng và nhàn hạ!
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

                    {/* Symmetrical Image Section (Front & Back) */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Image Option */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Ảnh mặt trước (Không bắt buộc)</span>
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={card.frontImage || card.image || ''}
                            onChange={(e) => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: e.target.value } : c))}
                            placeholder="Dán URL ảnh mặt trước..."
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-medium"
                          />
                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-colors" title="Tải ảnh lên">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: reader.result as string } : c));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {(card.frontImage || card.image) && (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center p-0.5 bg-white group/thumb">
                              <img src={card.frontImage || card.image} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              <button type="button" onClick={() => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, frontImage: '', image: '' } : c))} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Back Image Option */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-purple-500" />
                          <span>Ảnh mặt sau (Không bắt buộc)</span>
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={card.backImage || ''}
                            onChange={(e) => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: e.target.value } : c))}
                            placeholder="Dán URL ảnh mặt sau..."
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-medium"
                          />
                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-colors" title="Tải ảnh lên">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: reader.result as string } : c));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {card.backImage && (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center p-0.5 bg-white group/thumb">
                              <img src={card.backImage} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              <button type="button" onClick={() => setNewFlashcards(newFlashcards.map(c => c.id === card.id ? { ...c, backImage: '' } : c))} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-1 gap-2 shrink-0">
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
                    onClick={() => setRawQuestionCode('')}
                    title="Xóa trắng mã nguồn câu hỏi"
                    className="p-1.5 px-3 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa trắng</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowFlashcardQuizTest(true)} 
                    title="Xem trước bài kiểm tra trắc nghiệm flashcard"
                    className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-indigo-500 transition-all shadow-md shadow-indigo-100 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[220px]">
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

      {/* RENDER SMART BATCH PAIRING MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-lg">Ghép Cặp & Nhập Kho Ảnh Hàng Loạt</h3>
                  <p className="text-white/85 text-[11px] font-medium">Tự động bắt cặp ảnh Mặt trước & Mặt sau theo tên file (ví dụ: 1.jpg ghép với 1.jpg)</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowBatchModal(false);
                  setFrontFiles([]);
                  setBackFiles([]);
                }} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Front Folder Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">1</span>
                      Thư mục / Loạt ảnh MẶT TRƯỚC
                    </span>
                    {frontFiles.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Đã chọn {frontFiles.length} ảnh
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                    Chọn tất cả ảnh của **mặt trước** (Có thể đặt tên chứa các số thứ tự: <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">1.jpg</code>, <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">2.jpg</code>, hoặc tên <code className="font-bold bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[10px]">apple.png</code>).
                  </p>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleFrontFilesChange}
                      className="hidden" 
                      id="batch-front-uploader" 
                    />
                    <label 
                      htmlFor="batch-front-uploader" 
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/10"
                    >
                      <Upload className="w-7 h-7 text-indigo-500 animate-bounce" />
                      <span className="text-xs font-bold text-slate-700">Chọn nhiều ảnh Mặt trước</span>
                      <span className="text-[10px] text-slate-400 font-medium">Hỗ trợ chọn hàng chục ảnh cùng lúc</span>
                    </label>
                  </div>
                </div>

                {/* Upload Back Folder Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-[10px]">2</span>
                      Thư mục / Loạt ảnh MẶT SAU
                    </span>
                    {backFiles.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Đã chọn {backFiles.length} ảnh
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                    Chọn các ảnh tương ứng của **mặt sau** (Đặt tên trùng số thứ tự hoặc trùng tên tương ứng: <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">1.jpg</code>, <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">2.jpg</code>, <code className="font-bold bg-slate-100 text-purple-600 px-1 py-0.5 rounded text-[10px]">apple.png</code>).
                  </p>

                  <div className="relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleBackFilesChange}
                      className="hidden" 
                      id="batch-back-uploader" 
                    />
                    <label 
                      htmlFor="batch-back-uploader" 
                      className="border-2 border-dashed border-slate-200 hover:border-purple-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50/50 hover:bg-purple-50/10"
                    >
                      <Upload className="w-7 h-7 text-purple-500 animate-bounce" />
                      <span className="text-xs font-bold text-slate-700">Chọn nhiều ảnh Mặt sau</span>
                      <span className="text-[10px] text-slate-400 font-medium">Chọn loạt ảnh đáp án</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              {isReadingFiles && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Đang đọc dữ liệu ảnh, vui lòng đợi giây lát...</span>
                </div>
              )}

              {/* Pairing Preview */}
              {pairedItems.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Bản đồ ghép cặp dự kiến ({pairedItems.length} thẻ ghi nhớ)
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      Tự bắt cặp theo số thứ tự trích xuất từ tên file
                    </span>
                  </div>

                  {/* List of Pairings */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 custom-scrollbar pr-1">
                    {pairedItems.map((item, idx) => {
                      return (
                        <div key={item.key} className="py-3 flex items-center justify-between gap-4 text-xs font-medium">
                          {/* Front Side Card Thumbnail Preview */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {item.front ? (
                              <div className="w-10 h-10 border border-slate-200 bg-slate-50 p-0.5 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={item.front.base64} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 border-2 border-dashed border-slate-200 rounded-lg shrink-0 flex items-center justify-center bg-slate-50 text-slate-300">
                                <QuestionIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase block">Trước</span>
                              <span className="text-slate-800 font-bold block truncate text-[11px]">{item.front ? item.front.name : '(Trống - Sẽ điền sau)'}</span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                              Mã #{item.key}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 mt-1" />
                          </div>

                          {/* Back Side Card Thumbnail Preview */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
                            <div className="truncate">
                              <span className="text-[10px] font-bold text-purple-600 uppercase block">Sau</span>
                              <span className="text-slate-800 font-bold block truncate text-[11px]">{item.back ? item.back.name : '(Trống - Sẽ điền sau)'}</span>
                            </div>
                            {item.back ? (
                              <div className="w-10 h-10 border border-slate-200 bg-slate-50 p-0.5 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={item.back.base64} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 border-2 border-dashed border-slate-200 rounded-lg shrink-0 flex items-center justify-center bg-slate-50 text-slate-300">
                                <QuestionIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                * Lưu ý: Tải lên hình ảnh trực tiếp dạng file Base64, không cần lưu trữ bên thứ ba.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setFrontFiles([]);
                    setBackFiles([]);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeBatchImport}
                  disabled={pairedItems.length === 0 || isReadingFiles}
                  className={`px-5 py-2 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 ${
                    pairedItems.length === 0 || isReadingFiles
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Xác nhận Ghép & Nhập ({pairedItems.length} thẻ)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
