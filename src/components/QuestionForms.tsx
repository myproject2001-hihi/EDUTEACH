import React from 'react';

export const MultipleChoiceForm = () => (
  <div className="space-y-4">
    <textarea className="w-full p-3 border rounded-xl" placeholder="Nội dung câu hỏi..." />
    <div className="grid grid-cols-2 gap-3">
      {['A', 'B', 'C', 'D'].map(opt => (
        <input key={opt} className="p-2 border rounded-lg" placeholder={`Đáp án ${opt}`} />
      ))}
    </div>
  </div>
);

export const TrueFalseForm = () => (
  <div className="space-y-4">
    <textarea className="w-full p-3 border rounded-xl" placeholder="Mệnh đề chính..." />
    <div className="space-y-2">
      {['a', 'b', 'c', 'd'].map(opt => (
        <input key={opt} className="w-full p-2 border rounded-lg" placeholder={`Ý ${opt}...`} />
      ))}
    </div>
  </div>
);

export const EssayForm = () => (
  <div className="space-y-4">
    <textarea className="w-full p-3 border rounded-xl" placeholder="Nội dung câu hỏi tự luận / trả lời ngắn..." />
    <input className="w-full p-2 border rounded-lg" placeholder="Đáp án (nếu có)" />
  </div>
);

export const QUESTION_FORM_MAP: Record<string, React.FC<any>> = {
  multiple_choice: MultipleChoiceForm,
  true_false: TrueFalseForm,
  essay: EssayForm
};
