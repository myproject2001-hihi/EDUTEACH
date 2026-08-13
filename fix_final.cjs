const fs = require('fs');
let code = fs.readFileSync('src/views/AssignmentsView.tsx', 'utf8');

const regex = /<div className="mt-1 text-\[11px\] text-amber-700 font-mono bg-amber-100\/60 px-2 py-1 rounded border border-amber-200\/60">[\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">/;

const correct = `<div className="mt-1 text-[11px] text-amber-700 font-mono bg-amber-100/60 px-2 py-1 rounded border border-amber-200/60">
                                Ví dụ:<br/>
                                Apple - Quả táo<br/>
                                Cat,Con mèo<br/>
                                Thủ đô Việt Nam? - Hà Nội
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 lg:overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {newFlashcards.map((card, index) => (
                              <div key={card.id} className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                <button onClick={() => setNewFlashcards(newFlashcards.filter(c => c.id !== card.id))} className="absolute top-2 right-2 p-1.5 bg-white text-rose-500 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 hover:bg-rose-50">
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">`;
                                
if (regex.test(code)) {
  code = code.replace(regex, correct);
  fs.writeFileSync('src/views/AssignmentsView.tsx', code);
  console.log("Fixed!");
} else {
  console.log("Not found.");
}
