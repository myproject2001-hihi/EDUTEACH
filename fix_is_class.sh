#!/bin/bash
FILES="src/components/AssignmentReminder.tsx src/views/SimulationsView.tsx src/views/ScheduleView.tsx src/views/RewardStoreView.tsx"

for file in $FILES; do
  sed -i -e '/if (!assignClass || assignClass.trim() === '\'''\') return true;/!b;n;c\
    const cleanAssign = assignClass.trim().toLowerCase();\
    if (\
      cleanAssign === '\''all'\'' || \
      cleanAssign === '\''tất cả'\'' || \
      cleanAssign === '\''tat ca'\'' || \
      cleanAssign === '\''toàn hệ thống'\'' || \
      cleanAssign === '\''toan he thong'\'' ||\
      cleanAssign === '\''tất cả các lớp (toàn trường)'\'' ||\
      cleanAssign === '\''tat ca cac lop (toan truong)'\''\
    ) {\
      return true;\
    }\
    if (!userClass || userClass.trim() === '\'''\') return false;
' $file
done
