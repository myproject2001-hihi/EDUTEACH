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
                        <div className="flex-[2] min-h-[280px]`;
                        
  fs.writeFileSync('src/views/AssignmentsView.tsx', codeBefore + correctMiddle + codeAfter);
  console.log("Fixed successfully.");
} else {
  console.log("Not found.");
}
