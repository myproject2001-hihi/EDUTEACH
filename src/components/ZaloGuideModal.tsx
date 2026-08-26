import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  HelpCircle, 
  Key, 
  Link2, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Check, 
  ChevronRight, 
  BookOpen, 
  ShieldAlert, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface ZaloGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'student' | 'teacher' | 'admin';
}

export function ZaloGuideModal({ isOpen, onClose, role }: ZaloGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>(
    role === 'student' ? 'student' : 'teacher'
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isOpen) return null;

  const callbackUrlExample = window.location.origin + '/api/zalo/callback';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-slate-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0068ff]/10 text-[#0068ff] rounded-2xl flex items-center justify-center text-lg font-black shadow-inner">
                🤖
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  Cẩm Nang Tích Hợp Zalo Bot
                  <span className="text-[10px] font-bold bg-[#0068ff]/10 text-[#0068ff] px-2 py-0.5 rounded-full border border-[#0068ff]/20">
                    v3.0 OpenAPI
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Hướng dẫn chi tiết kết nối EduConnect với Zalo để tự động gửi nhận thông tin học tập.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 active:scale-95 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 p-2 bg-slate-50/20">
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'teacher'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-150'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              👨‍🏫 DÀNH CHO GIÁO VIÊN (THIẾT LẬP BOT)
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'student'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-150'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🎒 DÀNH CHO HỌC SINH (NHẬN TIN NHẮN)
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
            {activeTab === 'teacher' ? (
              // TEACHER INSTRUCTIONS
              <div className="space-y-6">
                {/* Intro alert */}
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-medium">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-blue-950">Lợi ích của việc thiết lập Zalo OA Bot:</p>
                    <p className="mt-1">Gửi tin nhắn trực tiếp từ ứng dụng của thầy cô đến điện thoại học sinh/phụ huynh hoàn toàn miễn phí (đối với tin nhắn phản hồi CS trong 48h). Giúp thông báo bài tập mô phỏng, flashcard, điểm số ngay lập tức mà học sinh không cần mở trình duyệt kiểm tra thường xuyên.</p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-800 border-b pb-1.5 flex items-center gap-2">
                    <span className="text-[#0068ff]">1.</span> Đăng ký Zalo Official Account &amp; App liên kết
                  </h4>
                  <div className="pl-5 space-y-3 text-xs leading-relaxed">
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        <b>Bước 1.1:</b> Truy cập <a href="https://oa.zalo.me" target="_blank" rel="noopener noreferrer" className="text-[#0068ff] underline font-extrabold inline-flex items-center gap-0.5">oa.zalo.me <ExternalLink className="w-3 h-3" /></a>, đăng nhập tài khoản Zalo cá nhân và đăng ký một trang <b>Zalo Official Account (OA)</b> đại diện cho lớp học hoặc tổ chức giáo dục của bạn (chọn loại hình <i>Doanh nghiệp - Giáo dục</i>).
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        <b>Bước 1.2:</b> Truy cập trang dành cho lập trình viên <a href="https://developers.zalo.me" target="_blank" rel="noopener noreferrer" className="text-[#0068ff] underline font-extrabold inline-flex items-center gap-0.5">developers.zalo.me <ExternalLink className="w-3 h-3" /></a>, bấm vào <b>Thêm Ứng Dụng Mới</b>. Nhập tên ứng dụng của lớp (Ví dụ: <code>EduConnect Bot</code>) và liên kết với Zalo OA đã tạo ở bước trên.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 border-b pb-1.5 flex items-center gap-2">
                    <span className="text-[#0068ff]">2.</span> Cấu hình ứng dụng &amp; URL chuyển hướng (Callback URL)
                  </h4>
                  <div className="pl-5 space-y-3 text-xs leading-relaxed">
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        Trong trang quản lý Zalo App của bạn, điều hướng đến menu <b>Đăng nhập</b> &gt; <b>Thiết lập</b>. Tiến hành thêm địa chỉ <b>Callback URL</b> của ứng dụng vào danh sách hợp lệ.
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Đường dẫn Callback URL gợi ý của bạn:</span>
                        <button
                          onClick={() => handleCopy(callbackUrlExample, 'callback')}
                          className="text-[#0068ff] font-bold hover:underline flex items-center gap-1 active:scale-95"
                        >
                          {copiedText === 'callback' ? <span className="text-emerald-600 flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Đã chép</span> : <span className="flex items-center gap-0.5"><Copy className="w-3.5 h-3.5" /> Sao chép</span>}
                        </button>
                      </div>
                      <p className="font-mono bg-white p-2.5 rounded-xl border border-slate-200 text-[#0068ff] font-bold text-[11px] overflow-x-auto select-all">
                        {callbackUrlExample}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 border-b pb-1.5 flex items-center gap-2">
                    <span className="text-[#0068ff]">3.</span> Lấy mã Access Token &amp; Cập nhật hệ thống
                  </h4>
                  <div className="pl-5 space-y-3 text-xs leading-relaxed">
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        <b>Bước 3.1:</b> Di chuyển đến <b>Công cụ thử nghiệm (API Explorer)</b> trên Zalo Developers.
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        <b>Bước 3.2:</b> Chọn ứng dụng của bạn, chọn đúng tài khoản Official Account (OA) và cấp quyền đầy đủ gồm: <code>Quyền gửi tin và thông báo qua OA</code> và <code>Quyền quản lý tin nhắn người dùng</code>.
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-[#0068ff] shrink-0 mt-0.5" />
                      <p>
                        <b>Bước 3.3:</b> Bấm sinh mã <b>Access Token</b>. Hãy sao chép chuỗi mã rất dài này rồi quay lại hệ thống EduConnect dán vào bảng cấu hình Zalo Bot (bấm nút "Cấu hình & Hướng dẫn" tại Trang Bài Tập hoặc lưu tại cấu hình hệ thống).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important notice */}
                <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl text-xs space-y-1 font-medium leading-relaxed">
                  <p className="font-extrabold text-amber-900 flex items-center gap-1">⚠️ Lưu ý cực kỳ quan trọng:</p>
                  <p>Access Token thử nghiệm của Zalo có thời hạn hiệu lực là <b>25 giờ</b>. Khi hết hạn, quý thầy cô cần bấm lấy token mới tại API Explorer dán lại, hoặc tích hợp cơ chế lấy qua Code Challenge PKCE để tự động gia hạn tự động qua Refresh Token lâu dài (bản chính thức).</p>
                </div>
              </div>
            ) : (
              // STUDENT INSTRUCTIONS
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-emerald-900">Cách nhận tin nhắn bài tập tự động:</p>
                    <p className="mt-1">Khi đăng ký hoàn tất, mỗi khi thầy cô giao Flashcard từ vựng, Bài mô phỏng thí nghiệm tương tác, hay kiểm tra toán mới, hệ thống sẽ gửi tin nhắn trực tiếp về tài khoản Zalo cá nhân của em hoặc phụ huynh.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Step 1 */}
                  <div className="flex gap-4 items-start border-l-2 border-slate-100 pl-4 relative">
                    <span className="absolute -left-[11px] top-0.5 w-5 h-5 bg-[#0068ff] text-white rounded-full flex items-center justify-center font-black text-[10px]">1</span>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-slate-800 text-sm">Bước 1: Quan tâm trang Zalo OA của lớp</h5>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Hỏi thầy cô giáo chủ nhiệm đường dẫn (Link Zalo.me) hoặc QR Code của trang Zalo Official Account đại diện lớp học. Bấm nút <b>Quan tâm / Theo dõi (Follow)</b> trang Zalo OA đó để cho phép bot liên hệ với em.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 items-start border-l-2 border-slate-100 pl-4 relative">
                    <span className="absolute -left-[11px] top-0.5 w-5 h-5 bg-[#0068ff] text-white rounded-full flex items-center justify-center font-black text-[10px]">2</span>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-slate-800 text-sm">Bước 2: Gửi cú pháp để lấy Zalo User ID</h5>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Mở cuộc trò chuyện với trang Zalo OA của lớp mà em vừa quan tâm. Hãy nhắn tin gửi đi nội dung:
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold text-[#0068ff]">
                          /id
                        </div>
                        <span className="text-xs text-slate-400 font-bold">hoặc</span>
                        <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold text-[#0068ff]">
                          me
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Zalo Bot của lớp sẽ ngay lập tức tự động trả lời kèm cho em một <b>dãy mã số định danh bí mật</b> (Ví dụ: <code>842953048592038410</code>).
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start pl-4 relative">
                    <span className="absolute -left-[11px] top-0.5 w-5 h-5 bg-[#0068ff] text-white rounded-full flex items-center justify-center font-black text-[10px]">3</span>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-slate-800 text-sm">Bước 3: Nhập mã vào hệ thống EduConnect</h5>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Sao chép chuẩn xác dãy số ID nhận được từ Zalo Bot, quay lại trang quản lý bài tập của EduConnect, kéo xuống phần <b>Tích hợp Thông Báo Zalo Bot</b> và dán vào ô nhập liệu rồi nhấn <b>Kết nối</b>. 
                      </p>
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Sau khi kết nối, hệ thống sẽ ghi nhận và gửi các thông báo học tập trực tiếp tới em chuẩn xác nhất!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Cần thêm trợ giúp? Hãy liên hệ Thầy/Cô quản lý.</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#0068ff] hover:bg-[#0051d4] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-100"
            >
              Tôi đã hiểu
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
