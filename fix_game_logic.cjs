const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// 1. Add states for tracking logic
const stateVars = `
  const [showGameCamera, setShowGameCamera] = useState(false);
  const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);
  const [tiltDir, setTiltDir] = useState<'left' | 'right' | 'none'>('none');
  
  // Game logic state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lockedAnswer, setLockedAnswer] = useState<'left' | 'right' | 'none'>('none');

  React.useEffect(() => {
    if (gameType !== 'quiz_nghieng_dau') return;
    if (answerStatus !== 'none' || tiltDir === 'none') return;
    
    // We detected a tilt! Let's lock it in after a small debounce or immediately.
    // For immediate feel with a tiny delay to avoid accidental triggers:
    const timer = setTimeout(() => {
       const question = questions[currentQuestionIndex];
       if (!question) return;
       
       const selectedIndex = tiltDir === 'left' ? 0 : 1;
       let isCorrect = false;
       
       if (typeof question.correctAnswer === 'number') {
           isCorrect = question.correctAnswer === selectedIndex;
       } else if (typeof question.correctAnswer === 'string') {
           isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
       } else {
           // Fallback for preview if no answer provided: just say it's correct for demonstration
           isCorrect = true; 
       }
       
       setAnswerStatus(isCorrect ? 'correct' : 'wrong');
       setLockedAnswer(tiltDir);
       
       // Move to next question after 2 seconds
       setTimeout(() => {
          setAnswerStatus('none');
          setLockedAnswer('none');
          if (currentQuestionIndex < questions.length - 1) {
             setCurrentQuestionIndex(prev => prev + 1);
          } else {
             setCurrentQuestionIndex(0); // loop
          }
       }, 2500);
       
    }, 500); // require holding for 500ms
    
    return () => clearTimeout(timer);
  }, [tiltDir, answerStatus, gameType, currentQuestionIndex, questions]);
`;

code = code.replace(/const \[showGameCamera, setShowGameCamera\] = useState\(false\);\n  const \[capturedPoseImg, setCapturedPoseImg\] = useState<string \| null>\(null\);\n  const \[tiltDir, setTiltDir\] = useState<'left' \| 'right' \| 'none'>\('none'\);/g, stateVars);

// 2. Modify quiz_nghieng_dau to show currentQuestionIndex and feedback
const oldQuizCase = /case 'quiz_nghieng_dau':[\s\S]*?case 'game_map':/;

const newQuizCase = `case 'quiz_nghieng_dau':
        const currentQ = questions[currentQuestionIndex] || questions[0];
        
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="flex items-center justify-between w-full max-w-2xl px-4">
               <div className="text-slate-500 font-bold">Câu {currentQuestionIndex + 1}/{Math.max(questions.length, 1)}</div>
               {answerStatus !== 'none' && (
                  <div className={\`font-black text-lg animate-bounce \${answerStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500'}\`}>
                     {answerStatus === 'correct' ? '🎉 CHÍNH XÁC!' : '❌ SAI RỒI!'}
                  </div>
               )}
            </div>
          
            <div className={\`w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 shadow-2xl flex items-center justify-center transition-colors duration-300 \${tiltDir === 'left' ? 'border-blue-500 shadow-blue-500/50' : tiltDir === 'right' ? 'border-rose-500 shadow-rose-500/50' : 'border-indigo-500'}\`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <LiveCamera onTilt={answerStatus === 'none' ? setTiltDir : undefined} />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                {answerStatus !== 'none' ? 'Đã khóa đáp án' : tiltDir === 'left' ? 'Đang nghiêng TRÁI' : tiltDir === 'right' ? 'Đang nghiêng PHẢI' : 'Camera đang bật (Preview)'}
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{currentQ?.question || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'}</h3>
              <p className="text-slate-500 text-sm">Nghiêng đầu sang trái hoặc phải (giữ 0.5s) để chọn đáp án</p>
            </div>
            <div className="flex w-full max-w-2xl gap-4">
              <div className={\`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] 
                \${lockedAnswer === 'left' ? (answerStatus === 'correct' ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300') : 
                  tiltDir === 'left' && answerStatus === 'none' ? 'bg-blue-600 border-blue-300 shadow-[0_4px_0_#1e3a8a] scale-105' : 'bg-blue-500 border-blue-400 shadow-[0_8px_0_#1e3a8a]'}
              \`}>
                <span className="text-3xl mb-2">⬅️</span>
                {currentQ?.options?.[0] || 'Đáp án A'}
              </div>
              <div className={\`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] 
                \${lockedAnswer === 'right' ? (answerStatus === 'correct' ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300') : 
                  tiltDir === 'right' && answerStatus === 'none' ? 'bg-blue-600 border-blue-300 shadow-[0_4px_0_#1e3a8a] scale-105' : 'bg-blue-500 border-blue-400 shadow-[0_8px_0_#1e3a8a]'}
              \`}>
                <span className="text-3xl mb-2">➡️</span>
                {currentQ?.options?.[1] || 'Đáp án B'}
              </div>
            </div>
          </div>
        );
      case 'game_map':`;

code = code.replace(oldQuizCase, newQuizCase);
fs.writeFileSync('src/components/GamePreview.tsx', code);
console.log("Updated logic");
