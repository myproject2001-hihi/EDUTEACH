const fs = require('fs');
let code = fs.readFileSync('src/views/AssignmentsView.tsx', 'utf8');

const regex = /<div className="flex-1 lg:overflow-y-auto space-y-4 pr-2 custom-scrollbar"> bg-white[\s\S]*?<div className="flex-1 lg:overflow-y-auto space-y-4 pr-2 custom-scrollbar">/;
if (regex.test(code)) {
  code = code.replace(regex, '<div className="flex-1 lg:overflow-y-auto space-y-4 pr-2 custom-scrollbar">');
  fs.writeFileSync('src/views/AssignmentsView.tsx', code);
  console.log("Fixed duplication");
} else {
  console.log("Duplication not found");
}
