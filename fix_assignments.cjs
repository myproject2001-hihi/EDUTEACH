const fs = require('fs');
let code = fs.readFileSync('src/views/AssignmentsView.tsx', 'utf8');

const brokenStr = 'bg-eme                        <div className="flex-[2] min-h-[280px]';
const brokenIndex = code.indexOf(brokenStr);

if (brokenIndex > -1) {
  const codeBefore = code.slice(0, brokenIndex); 
  const codeAfter = code.slice(brokenIndex + brokenStr.length);
  
  const correctMiddle = `bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs sm:text-sm border border-emerald-200 hover:bg-emerald-200 flex items-center justify-center gap-2 shrink-0">
                              <Play className="w-4 h-4" /> Xem trước
                            </button>
                          </div>

                          <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[160px]">
                            <div className="w-10 bg-slate-50 border-r border-slate-200 text-right pt-4 text-[11px] font-mono text-slate-400 select-none overflow-hidden pb-4">
                              {Array.from({ length: Math.max(rawQuestionCode.split('\\n').length, 10) }, (_, i) => i + 1).map(num => (
                                <div key={num} className="pr-2 leading-relaxed h-[21px]">{num}</div>
                              ))}
                            </div>
                            <textarea
                              value={rawQuestionCode}
                              onChange={(e) => setRawQuestionCode(e.target.value)}
                              placeholder="Nhập nội dung câu hỏi..."
                              className="flex-1 w-full p-3 sm:p-4 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                              spellCheck={false}
                            />
                          </div>

                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                            <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu:</p>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 1</button>
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 2</button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Flashcard Configuration */}
                    {newType === 'flashcard' && (
                      <div className="w-full flex flex-col lg:h-full gap-4 overflow-y-auto lg:overflow-hidden">
                        <div className="flex-[2] min-h-[280px] bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:overflow-hidden shrink-0 lg:shrink">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0 gap-2">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                              <span>🗂️</span> Tạo danh sách thẻ (Flashcards)
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button 
                                type="button"
                                onClick={() => setShowFlashcardPreview(true)}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs sm:text-sm border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Xem trước trải nghiệm học lật thẻ của học sinh"
                              >
                                <Eye className="w-4 h-4 text-emerald-700" /> Xem trước bộ thẻ
                              </button>
                              <button 
                                type="button"
                                onClick={handleDownloadSampleFlashcards}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-50 text-amber-700 font-bold rounded-xl text-xs sm:text-sm border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
                                title="Tải file text mẫu (.txt)"
                              >
                                <Download className="w-4 h-4" /> Tải file mẫu
                              </button>
                              <label className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-200 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                                <Upload className="w-4 h-4" /> Nhập từ file
                                <input type="file" accept=".txt,.csv" hidden onChange={handleImportFlashcards} />
                              </label>
                              <button type="button" onClick={() => setNewFlashcards([...newFlashcards, { id: Date.now().toString(), front: '', back: '' }])} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-700 font-bold rounded-xl text-xs sm:text-sm border border-blue-200 hover:bg-blue-200 flex items-center gap-1.5 transition-colors">
                                <Plus className="w-4 h-4" /> Thêm thẻ
                              </button>
                            </div>
                          </div>

                          {/* Guidance Banner */}
                          <div className="mb-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2 shrink-0">
                            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <span className="font-bold">Cú pháp file .txt hoặc .csv: </span> 
                               Mỗi dòng 1 thẻ. <strong>Mặt trước</strong> và <strong>Mặt sau</strong> cách nhau bởi 
                               <code className="mx-1 px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold text-amber-800"> - </code> (dấu gạch ngang), 
                               <code className="mx-1 px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold text-amber-800">,</code> (dấu phẩy), hoặc TAB.
                              <div className="mt-1 text-[11px] text-amber-700 font-mono bg-amber-100/60 px-2 py-1 rounded border border-amber-200/60">
                                Ví dụ:<br/>
                                Apple - Quả táo<br/>
                                Cat,Con mèo<br/>
                                Thủ đô Việt Nam? - Hà Nội
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 lg:overflow-y-auto space-y-4 pr-2 custom-scrollbar">`;
                        
  fs.writeFileSync('src/views/AssignmentsView.tsx', codeBefore + correctMiddle + codeAfter);
  console.log("Fixed successfully.");
} else {
  console.log("Not found.");
}
