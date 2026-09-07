const fs = require('fs');
const files = ["src/components/AssignmentReminder.tsx", "src/views/SimulationsView.tsx", "src/views/ScheduleView.tsx", "src/views/RewardStoreView.tsx"];

const replacement = `    if (!assignClass || assignClass.trim() === '') return true;
    const cleanAssign = assignClass.trim().toLowerCase();
    if (
      cleanAssign === 'all' || 
      cleanAssign === 'tất cả' || 
      cleanAssign === 'tat ca' || 
      cleanAssign === 'toàn hệ thống' || 
      cleanAssign === 'toan he thong' ||
      cleanAssign === 'tất cả các lớp (toàn trường)' ||
      cleanAssign === 'tat ca cac lop (toan truong)'
    ) {
      return true;
    }
    if (!userClass || userClass.trim() === '') return false;`;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/if \(\!assignClass \|\| assignClass\.trim\(\) === ''\) return true;\s*if \(\!userClass \|\| userClass\.trim\(\) === ''\) return false;/g, replacement);
  fs.writeFileSync(f, content);
});
