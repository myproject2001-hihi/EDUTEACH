import React from 'react';
import { Camera, Upload, Check } from 'lucide-react';
import { MarkdownMath } from './MarkdownMath';

export const FileUploadWorkspace = ({ newPdfUrl, setNewPdfUrl }: any) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 flex flex-col justify-center">
      <h4 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center justify-center gap-2 border-b border-slate-100 pb-3 sm:pb-4">
        <span>📁</span> Tạo đề Offline (Nộp bài tự luận)
      </h4>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
            1. Dán đường link đề bài / Tài liệu (Google Drive, PDF, Ảnh):
          </label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input 
              type="url"
              value={newPdfUrl} 
              onChange={e => setNewPdfUrl(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              placeholder="https://example.com/de-bai-tap.pdf"
            />
            <button 
              type="button"
              onClick={() => setNewPdfUrl('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=1000')}
              className="px-4 sm:px-5 py-2.5 sm:py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs sm:text-sm font-bold shrink-0"
            >
              Dùng đề mẫu
            </button>
          </div>
        </div>
        <div className="text-center font-bold text-slate-400">HOẶC</div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            2. Tải tệp đề bài lên từ máy tính (PDF, Ảnh):
          </label>
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 p-8 rounded-2xl text-center cursor-pointer transition-all relative">
            <input 
              type="file" 
              accept=".pdf,image/*"
              id="offlineTeacherFileInput"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (typeof event.target?.result === 'string') {
                      setNewPdfUrl(event.target.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">
              {newPdfUrl?.startsWith('data:') ? '✅ Đã tải file đề bài thành công!' : 'Bấm để chọn file đề bài từ thiết bị (.pdf, .png, .jpg)'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Học sinh sẽ nhìn thấy tệp đính kèm này để xem đề bài và tải về làm bài tập.</p>
            <button 
              type="button" 
              onClick={() => document.getElementById('offlineTeacherFileInput')?.click()}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm"
            >
              Tải tệp từ máy tính
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LessonCheckWorkspace = () => (
  <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-center text-center">
    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
      <Camera className="w-10 h-10" />
    </div>
    <h4 className="text-xl font-black text-slate-800">Kiểm tra Chép bài / Bài học</h4>
    <p className="text-slate-500 font-medium">
      Học sinh sẽ được yêu cầu chụp ảnh vở ghi chép bằng camera trên thiết bị (điện thoại/máy tính bảng) để nộp lại. Hệ thống sẽ tự động ghép ảnh thành file PDF để giáo viên dễ dàng chấm điểm.
    </p>
  </div>
);

export const WorkspaceMap: Record<string, React.FC<any>> = {
  file_upload: FileUploadWorkspace,
  lesson_check: LessonCheckWorkspace,
};
