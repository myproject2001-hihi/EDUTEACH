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
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Info,
  Layers,
  Settings,
  Globe,
  Sliders,
  Send,
  Sparkles,
  PhoneCall
} from 'lucide-react';

interface ZaloGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'student' | 'teacher' | 'admin';
}

export function ZaloGuideModal({ isOpen, onClose, role }: ZaloGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'fees-faq' | 'callback-guide' | 'student'>(
    role === 'student' ? 'student' : 'setup'
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-[#0068ff] text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/20">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Cẩm Nang Tích Hợp Zalo Official Account
                  </h3>
                  <span className="text-[10px] font-black bg-[#0068ff] text-white px-2.5 py-0.5 rounded-full shadow-sm">
                    OpenAPI v3
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tài liệu trực quan kèm minh họa giao diện thực tế trên Zalo Developers &amp; Zalo OA Manager
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/70 active:scale-95 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 p-2 bg-slate-50/60 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'setup'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛠️ 4 Bước Cấu Hình Nhanh</span>
            </button>
            <button
              onClick={() => setActiveTab('fees-faq')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'fees-faq'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💰 Chi Phí &amp; Xác Thực OA</span>
            </button>
            <button
              onClick={() => setActiveTab('callback-guide')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'callback-guide'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🔗 Callback URL &amp; Quyền API</span>
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'student'
                  ? 'bg-white text-[#0068ff] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎒 Dành Cho Học Sinh</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm">
            {/* TAB 1: 4 BƯỚC CẤU HÌNH NHANH */}
            {activeTab === 'setup' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4.5 rounded-2xl flex items-start gap-3 leading-relaxed">
                  <Sparkles className="w-5 h-5 text-[#0068ff] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-blue-950 text-sm">Hướng dẫn cấu hình dành cho Thầy Cô:</p>
                    <p className="mt-1 text-xs text-blue-800">
                      Chỉ mất 2-3 phút thực hiện trực tiếp trên trang <b>developers.zalo.me</b> để kết nối hệ thống gửi bài tập, nhắc nhở nộp bài và nhận thắc mắc bài học tự động qua Zalo.
                    </p>
                  </div>
                </div>

                {/* STEP 1 */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#0068ff] text-white flex items-center justify-center font-black text-xs">1</span>
                      <span className="font-black text-slate-800 text-sm">Bước 1: Cài đặt Thông tin Ứng dụng</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">developers.zalo.me</span>
                  </div>
                  <div className="p-4.5 space-y-3">
                    <p className="text-slate-600">
                      Mở ứng dụng Zalo của bạn tại <b>Cài đặt</b> &gt; <b>Thông tin ứng dụng</b>:
                    </p>
                    
                    {/* Visual UI Simulation */}
                    <div className="bg-white border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-700">Thông tin ứng dụng</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang hoạt động
                          </span>
                          <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="w-3.5 h-3.5 bg-white rounded-full absolute right-0.5 top-0.5"></div></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 font-bold block">Tên hiển thị:</span>
                          <span className="font-mono font-bold text-slate-800">EduConnect Bot</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[11px] text-slate-500 font-bold block">Miền ứng dụng:</span>
                          <span className="font-mono font-bold text-[#0068ff]">{window.location.host}</span>
                        </div>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
                        <span>Mục Bảo mật: <b>Yêu cầu kiểm tra app secret proof</b></span>
                        <span className="font-black text-rose-600 px-2 py-0.5 bg-white rounded border border-amber-300">ĐỂ TẮT (OFF)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#0068ff] text-white flex items-center justify-center font-black text-xs">2</span>
                      <span className="font-black text-slate-800 text-sm">Bước 2: Liên kết với Official Account (OA)</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">Cột menu bên trái</span>
                  </div>
                  <div className="p-4.5 space-y-3">
                    <p className="text-slate-600">
                      Ở cột menu bên trái, tìm nhóm <b>Sản phẩm</b>:
                    </p>
                    
                    {/* Visual UI Simulation */}
                    <div className="bg-white border rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg">
                        <span className="text-[#0068ff]">👉 Thao tác:</span>
                        <span><b>Sản phẩm</b> &gt; <b>Official Account</b> &gt; <b>Quản lý OA</b> (hoặc Quản lý liên kết)</span>
                      </div>
                      <p className="text-xs text-slate-600 pl-2">
                        Bấm nút <b>"Liên kết với Official Account"</b> và chọn trang Zalo OA đại diện lớp học của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#0068ff] text-white flex items-center justify-center font-black text-xs">3</span>
                      <span className="font-black text-slate-800 text-sm">Bước 3: Lấy chuỗi Access Token trực tiếp</span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-600">Cách nhanh nhất (Không cần code)</span>
                  </div>
                  <div className="p-4.5 space-y-3">
                    <p className="text-slate-600">
                      Mở công cụ thử nghiệm của Zalo tại: <a href="https://developers.zalo.me/tools/explorer" target="_blank" rel="noreferrer" className="text-[#0068ff] font-bold underline inline-flex items-center gap-0.5">developers.zalo.me/tools/explorer <ExternalLink className="w-3 h-3" /></a>
                    </p>

                    {/* Explorer Simulation */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2.5 font-mono text-xs shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-emerald-400 font-bold">⚡ Zalo API Explorer</span>
                        <span className="text-[10px] text-slate-400">Official Account Token</span>
                      </div>
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <p>1. Chọn Ứng dụng: <span className="text-amber-400 font-bold">EduConnect Bot</span></p>
                        <p>2. Loại token: <span className="text-sky-400 font-bold">Official Account Token</span></p>
                        <p>3. Official Account: <span className="text-emerald-400 font-bold">Chọn OA Lớp Học Của Bạn</span></p>
                        <p>4. Tích chọn quyền: <span className="text-indigo-400 font-bold">Quyền gửi tin và thông báo qua OA</span></p>
                      </div>
                      <div className="pt-2">
                        <span className="bg-[#0068ff] text-white px-3 py-1.5 rounded-lg text-xs font-sans font-black inline-block">
                          👉 Bấm "Lấy AccessToken" ➔ Cấp quyền
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 4 */}
                <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/40">
                  <div className="bg-emerald-100/80 px-4 py-3 border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">4</span>
                      <span className="font-black text-emerald-950 text-sm">Bước 4: Dán mã vào EduConnect và Lưu</span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-700">Hoàn tất</span>
                  </div>
                  <div className="p-4.5 space-y-2.5 text-xs text-slate-700">
                    <p>
                      Sao chép chuỗi mã <b>Access Token</b> vừa nhận được, quay lại EduConnect và dán vào ô <b>OA Access Token</b> (trên Dashboard hoặc Trang Bài Tập), sau đó nhấn <b>Lưu cấu hình hệ thống</b>.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="font-mono text-slate-500 truncate mr-2">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</span>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shrink-0">Đã sẵn sàng</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHI PHÍ & XÁC THỰC OA */}
            {activeTab === 'fees-faq' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-black text-sm text-emerald-950">Giải đáp: Tạo Zalo OA &amp; Tích hợp Bot có mất phí không?</h4>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    ✅ <b>HOÀN TOÀN MIỄN PHÍ 100%:</b> Bạn có thể đăng ký tài khoản Zalo OA tại <a href="https://oa.zalo.me" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">oa.zalo.me</a> bằng Zalo cá nhân mà không tốn bất kỳ chi phí nào. Gửi thông báo qua Open API cho học sinh đã quan tâm OA cũng hoàn toàn miễn phí.
                  </p>
                </div>

                {/* Yellow banner alert explained */}
                <div className="border border-amber-200 rounded-2xl bg-amber-50/50 p-4.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h4 className="font-black text-sm text-amber-950">
                      Thông báo màu vàng: "Tài khoản OA đang được yêu cầu nộp hồ sơ xác thực"
                    </h4>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono">
                    "Tài khoản OA đang được yêu cầu nộp hồ sơ xác thực trước ngày... Hướng dẫn chuẩn bị hồ sơ ➔ Bắt đầu xác thực!"
                  </div>
                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900">Giải thích cho quý Thầy Cô:</p>
                    <ul className="list-disc list-inside space-y-1.5 pl-1">
                      <li>
                        <b>Đây là thông báo mặc định của Zalo</b>: Mọi tài khoản OA mới tạo đều nhận thông báo này (thời hạn 14 ngày).
                      </li>
                      <li>
                        <b>Trong thời gian ân hạn</b>: Thầy cô vẫn gọi API, gửi bài tập và kiểm tra bot bình thường.
                      </li>
                      <li>
                        <b>Nếu không có Giấy phép kinh doanh</b>: Zalo OA sau 14 ngày có thể bị giới hạn tính năng. Vì vậy, EduConnect đã chuẩn bị sẵn phương án tối ưu dưới đây!
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 2 Recommended Solutions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                      <PhoneCall className="w-4 h-4 text-[#0068ff]" />
                      <span>Phương Án 1: Zalo Cá Nhân 1-Chạm</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dành cho giáo viên tự do/lớp nhỏ: Chỉ cần lưu Số điện thoại Zalo của giáo viên. Học sinh bấm một chạm để nhắn tin thẳng vào Zalo cá nhân của thầy cô mà <b>không cần giấy tờ, không lo bị khóa OA</b>.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Phương Án 2: Xác Thực OA Chính Thức</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dành cho trung tâm/trường học có Giấy phép đăng ký kinh doanh: Bấm nút <b>"Nộp xác thực OA"</b> trên Zalo OA Manager để nhận tích vàng chính thức vĩnh viễn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CALLBACK URL & QUYỀN API */}
            {activeTab === 'callback-guide' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                    <Globe className="w-5 h-5 text-[#0068ff]" />
                    <span>Callback URL là gì và tại sao ô đó có thể bị khóa (không sửa được)?</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <b>Callback URL (URL chuyển hướng)</b> là địa chỉ web mà Zalo sẽ chuyển người dùng về sau khi họ đăng nhập Zalo thành công trên website.
                  </p>
                </div>

                {/* FAQ: Why is Callback URL disabled? */}
                <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4.5 space-y-3">
                  <h4 className="font-black text-blue-950 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#0068ff]" />
                    <span>Tại sao bạn không chỉnh sửa được ô "Official Account Callback Url"?</span>
                  </h4>
                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed pl-6">
                    <p>
                      1. Ô này chỉ dùng khi bạn xây dựng hệ thống <b>Đăng nhập bằng Zalo tự động (OAuth Web Login)</b>.
                    </p>
                    <p>
                      2. Để gửi tin nhắn bài tập và thông báo qua Zalo OA, <b>bạn KHÔNG CẦN điền ô này</b>.
                    </p>
                    <p>
                      3. Bạn chỉ cần lấy trực tiếp mã <b>Access Token</b> tại <a href="https://developers.zalo.me/tools/explorer" target="_blank" rel="noreferrer" className="text-[#0068ff] font-bold underline">API Explorer</a> như hướng dẫn ở Tab 1 là xong ngay!
                    </p>
                  </div>
                </div>

                {/* Suggested Callback URL if needed */}
                <div className="border border-slate-200 rounded-2xl p-4.5 space-y-3 bg-white">
                  <span className="font-black text-slate-800 text-xs block">
                    Nếu bạn muốn cài đặt Callback URL cho tính năng đăng nhập:
                  </span>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="font-mono text-[#0068ff] font-bold truncate mr-2 select-all text-[11px]">
                      {callbackUrlExample}
                    </span>
                    <button
                      onClick={() => handleCopy(callbackUrlExample, 'callback-tab')}
                      className="px-3 py-1.5 bg-[#0068ff] text-white font-extrabold rounded-lg hover:bg-blue-600 transition-all text-xs shrink-0 flex items-center gap-1"
                    >
                      {copiedText === 'callback-tab' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DÀNH CHO HỌC SINH */}
            {activeTab === 'student' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4.5 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-900 text-sm">Hướng dẫn học sinh nhận thông báo bài tập qua Zalo:</p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Khi kết nối, em sẽ nhận được tin nhắn Zalo tự động mỗi khi thầy cô giao bài mới, nhắc nhở trước hạn nộp và nhận kết quả chấm điểm tức thì.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-3.5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="w-6 h-6 rounded-full bg-[#0068ff] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">1</span>
                    <div className="space-y-1">
                      <h5 className="font-black text-slate-800 text-xs sm:text-sm">Bước 1: Quan tâm trang Zalo OA của lớp</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Bấm vào đường link Zalo OA do thầy cô gửi hoặc quét mã QR Code của lớp, sau đó nhấn nút <b>"Quan tâm" (Follow)</b>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3.5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="w-6 h-6 rounded-full bg-[#0068ff] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">2</span>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-slate-800 text-xs sm:text-sm">Bước 2: Nhắn tin cho Zalo OA để lấy mã ID</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Mở ô chat với trang Zalo OA của lớp và gửi tin nhắn chữ: <code>/id</code> hoặc <code>me</code>. Bot sẽ gửi lại cho em một dãy số ID người dùng.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3.5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">3</span>
                    <div className="space-y-1">
                      <h5 className="font-black text-slate-800 text-xs sm:text-sm">Bước 3: Nhập mã vào EduConnect</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Quay lại trang EduConnect, bấm vào thẻ Zalo trên Dashboard, dán mã ID vào ô <b>Zalo User ID</b> và bấm Xác nhận liên kết.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Info className="w-4 h-4 text-[#0068ff] shrink-0" />
              <span>Nếu cần hỗ trợ kỹ thuật, hãy liên hệ với Quản trị viên EduConnect.</span>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0068ff] hover:bg-blue-600 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              Tôi đã hiểu &amp; Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

