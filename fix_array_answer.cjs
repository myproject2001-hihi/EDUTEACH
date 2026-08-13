const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

const oldCheck = `} else if (typeof question.correctAnswer === 'string') {
           isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
       } else {`;

const newCheck = `} else if (typeof question.correctAnswer === 'string') {
           isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
       } else if (Array.isArray(question.correctAnswer)) {
           isCorrect = question.correctAnswer.includes(selectedIndex);
       } else {`;

if (code.includes(oldCheck)) {
   code = code.replace(oldCheck, newCheck);
   fs.writeFileSync('src/components/GamePreview.tsx', code);
   console.log("Updated check!");
}
