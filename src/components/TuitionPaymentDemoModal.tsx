import React, { useState } from 'react';
import { CustomSelect } from './CustomSelect';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  QrCode, 
  Upload, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Check, 
  X, 
  Sparkles, 
  Eye, 
  FileText,
  UserCheck,
  Zap
} from 'lucide-react';
import { TuitionSetting, TuitionReceipt } from '../types';
import { generateTransferContent } from '../utils/tuitionUtils';

interface TuitionPaymentDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySampleData?: (setting: TuitionSetting, receipt: TuitionReceipt) => void;
}

export const TuitionPaymentDemoModal: React.FC<TuitionPaymentDemoModalProps> = ({
  isOpen,
  onClose,
  onApplySampleData
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [simulatedClassName, setSimulatedClassName] = useState('Lớp Toán 12 - Luyện Thi Đại Học');
  const [simulatedLimitHours, setSimulatedLimitHours] = useState<number>(20);
  const [simulatedFee, setSimulatedFee] = useState<number>(1500000);
  const [simulatedBank, setSimulatedBank] = useState('MBBank');
  const [simulatedAccountNo, setSimulatedAccountNo] = useState('0987654321');
  const [simulatedAccountName, setSimulatedAccountName] = useState('NGUYEN VAN A');
  const [simulatedCurrentHours, setSimulatedCurrentHours] = useState<number>(21.5);
  const [simulatedReceiptUploaded, setSimulatedReceiptUploaded] = useState<boolean>(false);
  const [sampleApplied, setSampleApplied] = useState<boolean>(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOverLimit = simulatedCurrentHours >= simulatedLimitHours;
  const isNearLimit = simulatedCurrentHours >= simulatedLimitHours * 0.8 && !isOverLimit;
  const progressPercent = Math.min(100, Math.round((simulatedCurrentHours / simulatedLimitHours) * 100));

  const sampleReceiptBase64 = "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80";

  const handleSimulateUpload = () => {
    setSimulatedReceiptUploaded(true);
    setCurrentStep(4);
  };

  const handleResetDemo = () => {
    setCurrentStep(1);
    setSimulatedCurrentHours(21.5);
    setSimulatedReceiptUploaded(false);
  };

  const handlePopulateIntoApp = () => {
    if (onApplySampleData) {
      const sampleSetting: TuitionSetting = {
        id: `demo_setting_${Date.now()}`,
        className: simulatedClassName,
        limitHours: simulatedLimitHours,
        tuitionFee: simulatedFee,
        qrBankId: simulatedBank,
        qrAccountNumber: simulatedAccountNo,
        qrAccountName: simulatedAccountName,
        updatedAt: new Date().toISOString()
      };

      const sampleReceipt: TuitionReceipt = {
        id: `demo_receipt_${Date.now()}`,
        studentId: 'demo_student_01',
        studentName: 'Nguyễn Văn Minh (Học sinh mẫu)',
        className: simulatedClassName,
        amount: simulatedFee,
        hoursAtPayment: simulatedCurrentHours,
        screenshotUrl: sampleReceiptBase64,
        paidAt: new Date().toISOString(),
        status: 'approved',
        note: 'Giao dịch chuyển khoản học phí mẫu qua VietQR'
      };

      onApplySampleData(sampleSetting, sampleReceipt);
      setSampleApplied(true);
      setTimeout(() => {
        setSampleApplied(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-blue-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                Mô Phỏng & Hướng Dẫn Vận Hành Cấu Hình Học Phí
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wide">
                  Demo Interactive
                </span>
              </h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                Xem toàn bộ quy trình từ lúc Giáo viên cài đặt đến khi Học sinh quét mã QR và xác nhận thanh toán
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { num: 1, label: '1. Cấu hình lớp' },
              { num: 2, label: '2. Học sinh tích lũy' },
              { num: 3, label: '3. Quét QR nộp phí' },
              { num: 4, label: '4. Duyệt & Reset' }
            ].map(s => {
              const active = currentStep === s.num;
              const passed = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    active 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : passed 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {passed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* STEP 1: TEACHER CONFIGURATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-indigo-950 text-sm">Bước 1: Giáo viên cài đặt Định mức & Tài khoản ngân hàng</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Giáo viên nhập số giờ học cho mỗi chu kỳ (ví dụ 20 giờ), mức học phí (ví dụ 1.500.000 đ) và số tài khoản nhận tiền. Hệ thống sẽ tự động tạo mã VietQR chuẩn cho từng học sinh.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên lớp áp dụng:</label>
                  <input
                    type="text"
                    value={simulatedClassName}
                    onChange={e => setSimulatedClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số giờ định mức mỗi chu kỳ (giờ):</label>
                  <input
                    type="number"
                    value={simulatedLimitHours}
                    onChange={e => setSimulatedLimitHours(Number(e.target.value) || 20)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Mức học phí theo chu kỳ (VNĐ):</label>
                  <input
                    type="number"
                    step={50000}
                    value={simulatedFee}
                    onChange={e => setSimulatedFee(Number(e.target.value) || 1500000)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-emerald-700 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngân hàng & Số tài khoản nhận tiền:</label>
                  <div className="flex gap-2 items-center">
                    <div className="w-40 shrink-0">
                      <CustomSelect
                        value={simulatedBank}
                        onChange={val => setSimulatedBank(val)}
                        options={[
                          { value: 'MBBank', label: 'MB Bank' },
                          { value: 'VietinBank', label: 'VietinBank' },
                          { value: 'Vietcombank', label: 'Vietcombank' },
                          { value: 'Techcombank', label: 'Techcombank' },
                        ]}
                        size="sm"
                        className="w-full text-xs font-bold"
                      />
                    </div>
                    <input
                      type="text"
                      value={simulatedAccountNo}
                      onChange={e => setSimulatedAccountNo(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs"
                      placeholder="Số tài khoản..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  Tiếp tục: Xem Học sinh tích lũy giờ
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STUDENT ACCUMULATING HOURS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-950 text-sm">Bước 2: Hệ thống tự động tính lũy kế giờ học của học sinh</h4>
                  <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                    Mỗi khi học sinh tham gia các buổi học trực tuyến hoặc điểm danh có mặt trong tháng, hệ thống tự động cộng dồn số giờ học thực tế.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-600">Thử kéo thanh trượt để giả lập số giờ học:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedCurrentHours(10)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                    >
                      10 giờ (50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedCurrentHours(18)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold"
                    >
                      18 giờ (Sắp đến hạn)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedCurrentHours(22)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold"
                    >
                      22 giờ (Vượt mức 🔴)
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={simulatedCurrentHours}
                  onChange={e => setSimulatedCurrentHours(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />

                {/* Progress Card Simulation */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-900">{simulatedClassName}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Lũy kế giờ học: <strong className="text-indigo-600 text-sm font-black">{simulatedCurrentHours}h</strong> / {simulatedLimitHours}h
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                      isOverLimit 
                        ? 'bg-rose-100 text-rose-700 animate-pulse' 
                        : isNearLimit 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isOverLimit ? 'Đã đạt định mức nộp phí' : isNearLimit ? 'Sắp đạt định mức' : 'Đang trong chu kỳ'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {isOverLimit && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Học sinh nhận được thông báo: Đã học {simulatedCurrentHours}h. Vui lòng đóng học phí {simulatedFee.toLocaleString('vi-VN')} đ để tiếp tục chu kỳ mới.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl text-xs"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  Tiếp tục: Xem Giao diện Cổng đóng học phí
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: QR CODE & PAYMENT SUBMISSION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">Bước 3: Học sinh / Phụ huynh quét VietQR tự động điền nội dung</h4>
                  <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                    Hệ thống sinh mã QR động chứa đúng số tiền {simulatedFee.toLocaleString('vi-VN')} đ, số tài khoản nhận và nội dung chuyển khoản kèm mã học sinh.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Left: QR simulation */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center shadow-xs">
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-3 w-48 h-48 flex items-center justify-center relative">
                    <img 
                      src={`https://api.vietqr.io/image/${simulatedBank}-${simulatedAccountNo}-compact2.jpg?amount=${simulatedFee}&addInfo=${encodeURIComponent(generateTransferContent('HOCPHI_{studentName}_{className}', { name: 'Nguyen Van Minh', connectionCode: 'HS01' }, simulatedClassName))}`}
                      alt="VietQR Demo" 
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        // Fallback icon if offline
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center -z-1 text-slate-400 text-[10px]">
                      <QrCode className="w-12 h-12 text-indigo-400 mb-1" />
                      Mã VietQR Demo
                    </div>
                  </div>
                  <p className="text-xs font-black text-slate-900">{simulatedBank} • {simulatedAccountNo}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{simulatedAccountName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 px-2 py-0.5 bg-slate-100 rounded">
                    ND: {generateTransferContent('HOCPHI_{studentName}_{className}', { name: 'Nguyen Van Minh', connectionCode: 'HS01' }, simulatedClassName)}
                  </p>
                  <span className="mt-2 text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {simulatedFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Right: Upload simulator */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      Tải lên bằng chứng chuyển khoản:
                    </h5>
                    <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                      Sau khi chuyển khoản qua App ngân hàng, Học sinh chụp ảnh màn hình giao dịch thành công và tải lên hệ thống.
                    </p>
                    <div className="p-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-center py-6">
                      <CreditCard className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Chụp màn hình giao dịch chuyển tiền</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ PNG, JPG, JPEG</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateUpload}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all mt-3"
                  >
                    <Zap className="w-4 h-4" />
                    Bấm để Giả lập Học sinh gửi Biên lai
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl text-xs"
                >
                  Quay lại
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: APPROVAL, RESET & AUDIT */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-blue-950 text-sm">Bước 4: Hệ thống tự động ghi nhận, Reset giờ học & Lưu biên lai</h4>
                  <p className="text-blue-800 text-xs mt-1 leading-relaxed">
                    Ngay sau khi gửi biên lai thành công, số giờ tích lũy của học sinh được reset về 0 để bắt đầu chu kỳ 20 giờ tiếp theo. Giáo viên có thể kiểm tra danh sách biên lai bất cứ lúc nào.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Mẫu Biên lai ghi nhận trên hệ thống của Giáo viên:
                </h5>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">Nguyễn Văn Minh</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        ✓ Đã thanh toán
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Lớp: <strong>{simulatedClassName}</strong> • Số giờ chốt: <strong>{simulatedCurrentHours}h</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Thời gian nộp: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-sm font-black text-emerald-600">
                      +{simulatedFee.toLocaleString('vi-VN')} đ
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptUrl(sampleReceiptBase64)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md font-extrabold mt-1 cursor-pointer transition-colors flex items-center gap-1 shadow-3xs"
                      title="Nhấp để xem ảnh biên lai chuyển khoản"
                    >
                      <Eye className="w-3 h-3 text-indigo-600" />
                      <span>Ảnh biên lai đính kèm</span>
                    </button>
                  </div>
                </div>

                {/* Lightbox Modal in Demo */}
                {previewReceiptUrl && (
                  <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in" onClick={() => setPreviewReceiptUrl(null)}>
                    <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-extrabold text-slate-900 text-sm">Biên lai chuyển khoản học phí (Demo)</h4>
                        </div>
                        <button type="button" onClick={() => setPreviewReceiptUrl(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-[380px]">
                        <img src={previewReceiptUrl} alt="Biên lai học phí" className="w-full h-full object-contain max-h-[380px]" />
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>Số tiền: <strong className="text-indigo-600">{simulatedFee.toLocaleString('vi-VN')} đ</strong></span>
                        <button type="button" onClick={() => setPreviewReceiptUrl(null)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
                          Đóng
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Quy trình thanh toán khép kín hoàn tất: Học sinh không bị ngắt quãng giờ học, Giáo viên quản lý doanh thu minh bạch và dễ dàng đối soát!</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Mô phỏng lại từ đầu
                </button>

                {onApplySampleData && (
                  <button
                    type="button"
                    onClick={handlePopulateIntoApp}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {sampleApplied ? 'Đã nạp thành công!' : 'Nạp dữ liệu mẫu này vào App để xem trực tiếp'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Đóng bảng mô phỏng
          </button>
        </div>
      </div>
    </div>
  );
};
