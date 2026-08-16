import React from 'react';
import { X, HelpCircle, Brain, Trophy, AlertCircle, Sparkles } from 'lucide-react';

interface GameMenuOverlayProps {
  gameType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GameMenuOverlay({ gameType, isOpen, onClose }: GameMenuOverlayProps) {
  if (!isOpen) return null;

  const getGameInstructions = () => {
    switch (gameType) {
      case 'quiz_nghieng_dau':
        return {
          title: '🧠 Hướng Dẫn: Quiz Nghiêng Đầu AI',
          description: 'Sử dụng cử động đầu của bạn trước camera để chọn các phương án trắc nghiệm hoàn toàn rảnh tay!',
          rules: [
            { gesture: '⬅️ Nghiêng đầu sang TRÁI', action: 'Chọn phương án A (hoặc Đúng)' },
            { gesture: '➡️ Nghiêng đầu sang PHẢI', action: 'Chọn phương án B (hoặc Sai)' },
            { gesture: '⬆️ Ngẩng đầu lên TRÊN', action: 'Chọn phương án C' },
            { gesture: '⬇️ Gật đầu xuống DƯỚI', action: 'Chọn phương án D' }
          ],
          tips: 'Ngồi thẳng lưng cách camera khoảng 0.5m - 1m. Khi nghiêng đầu, hãy giữ nguyên tư thế trong tích tắc để thanh tiến trình nạp đầy 100% nhằm khóa đáp án chính xác nhất!'
        };
      case 'cuoc_dua_ngon_tay':
        return {
          title: '🏎️ Hướng Dẫn: Cuộc Đua Ngón Tay',
          description: 'Học sinh điều khiển xe đua của mình bằng cách giơ số lượng ngón tay tương ứng để bứt tốc vượt đối thủ!',
          rules: [
            { gesture: '☝️ Giơ 1 Ngón Tay (Ngón Trỏ)', action: 'Chọn đáp án A' },
            { gesture: '✌️ Giơ 2 Ngón Tay (Trỏ + Giữa)', action: 'Chọn đáp án B' },
            { gesture: '🤟 Giơ 3 Ngón Tay (Trỏ + Giữa + Áp Út)', action: 'Chọn đáp án C' },
            { gesture: '✋ Giơ 4 Ngón Tay (Bốn Ngón thẳng)', action: 'Chọn đáp án D' }
          ],
          tips: 'Giơ bàn tay cao ngang ngực trước camera rõ ràng. Khi camera nhận diện được số ngón tay chính xác, giữ nguyên vị trí trong vòng 0.3 giây để bứt tốc!'
        };
      case 'do_min':
        return {
          title: '💣 Hướng Dẫn: Dò Mìn Toán Học',
          description: 'Giải mã các phép tính toán học thông minh để tìm ra những ô đất an toàn không có mìn.',
          rules: [
            { gesture: '🖱️ Nhấp chọn ô số', action: 'Mở ô đất để hiển thị câu hỏi toán học' },
            { gesture: '🧮 Trả lời chính xác', action: 'Hợp pháp hóa ô an toàn và nhận điểm số lớn' },
            { gesture: '⚠️ Gặp ô mìn đen đủi', action: 'Nếu chọn nhầm mìn, bạn sẽ bị trừ một lượng điểm nhỏ' }
          ],
          tips: 'Hãy quan sát các con số chỉ thị xung quanh để suy luận logic xem mìn đang ẩn nấp ở đâu!'
        };
      default:
        return {
          title: '🎮 Hướng Dẫn Chơi Game Học Tập',
          description: 'Trải nghiệm phương pháp học tập tương tác thế hệ mới kết hợp trí tuệ nhân tạo và logic toán học.',
          rules: [
            { gesture: '🎯 Đọc kỹ câu hỏi', action: 'Quan sát các đáp án hiện lên trên màn hình' },
            { gesture: '⚡ Trả lời nhanh chóng', action: 'Nhận điểm thưởng bứt tốc vượt qua các chặng đua' }
          ],
          tips: 'Hoàn thành tất cả các câu hỏi trong thời gian ngắn nhất để vinh danh trên bảng xếp hạng học sinh xuất sắc!'
        };
    }
  };

  const info = getGameInstructions();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md select-none">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl flex flex-col gap-5 overflow-y-auto max-h-[90%] text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all pointer-events-auto"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Icon Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/30 text-indigo-400 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white leading-tight">
              {info.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {info.description}
            </p>
          </div>
        </div>

        {/* Dynamic Rules Grid */}
        <div className="space-y-3 mt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
            Cử chỉ & Phím tắt điều khiển:
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {info.rules.map((rule, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl"
              >
                <div className="text-base font-bold shrink-0 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-center min-w-[50px]">
                  {rule.gesture.split(' ')[0]}
                </div>
                <div className="text-xs">
                  <div className="font-extrabold text-slate-200">
                    {rule.gesture.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {rule.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning Tips Box */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-normal">
            <span className="font-bold text-amber-400">Mẹo chơi đỉnh cao: </span>
            {info.tips}
          </div>
        </div>

        {/* Ready play Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all pointer-events-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> SẴN SÀNG CHƠI NGAY
        </button>
      </div>
    </div>
  );
}
