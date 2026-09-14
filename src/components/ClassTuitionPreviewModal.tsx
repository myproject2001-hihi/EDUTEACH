import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Sparkles, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  Upload, 
  Users, 
  AlertCircle,
  Building,
  UserCheck,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { TuitionSetting, User, TuitionReceipt } from '../types';
import { generateTransferContent } from '../utils/tuitionUtils';

interface ClassTuitionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  setting: TuitionSetting;
  studentsInClass?: User[];
  allStudents?: User[];
  onSimulateReceipt?: (receipt: Partial<TuitionReceipt>) => void;
}

export const ClassTuitionPreviewModal: React.FC<ClassTuitionPreviewModalProps> = ({
  isOpen,
  onClose,
  setting,
  studentsInClass = [],
  allStudents = [],
  onSimulateReceipt
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'student' | 'details'>('student');
  const [simulatedHours, setSimulatedHours] = useState<number>(setting.limitHours || 20);
  const [isPaidStamping, setIsPaidStamping] = useState<boolean>(false);
  const [testReceiptUploaded, setTestReceiptUploaded] = useState<boolean>(false);

  // Available students for testing
  const sampleStudents = [
    { id: 'demo_01', name: 'Nguyễn Minh Ngọc', phoneStudent: '0901234567', connectionCode: 'HS-001', className: setting.className },
    { id: 'demo_02', name: 'Trần Bảo An', phoneStudent: '0987654321', connectionCode: 'HS-002', className: setting.className },
    { id: 'demo_03', name: 'Lê Hoàng Nam', phoneStudent: '0912345678', connectionCode: 'HS-003', className: setting.className },
  ];

  const candidateStudents = studentsInClass.length > 0 ? studentsInClass : (allStudents.length > 0 ? allStudents.slice(0, 5) : sampleStudents);
  const [selectedStudent, setSelectedStudent] = useState<any>(candidateStudents[0] || sampleStudents[0]);

  if (!isOpen || !setting) return null;

  // Formatted transfer string
  const transferContent = generateTransferContent(
    setting.transferContentTemplate,
    selectedStudent,
    setting.className
  );

  // VietQR dynamic image URL
  const vietQrUrl = setting.qrImageUrl || `https://img.vietqr.io/image/${encodeURIComponent(setting.qrBankId || 'MBBank')}-${encodeURIComponent(setting.qrAccountNumber || '0901234567')}-compact2.png?amount=${encodeURIComponent(setting.tuitionFee || 1500000)}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(setting.qrAccountName || '')}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulatePaymentStamp = () => {
    setIsPaidStamping(true);
    setTimeout(() => {
      setTestReceiptUploaded(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Xem Trước Giao Diện Học Sinh & Mã VietQR
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase tracking-wide">
                  Chế độ Demo GV
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Lớp: <span className="text-white font-bold">{setting.className}</span> • Mức phí: <span className="text-emerald-300 font-bold">{setting.tuitionFee?.toLocaleString('vi-VN')} VNĐ</span> / {setting.limitHours} giờ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tester Toolbar: Select Student */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Chọn học sinh mẫu để test:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {candidateStudents.map((st: any) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudent(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    selectedStudent.id === st.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>{st.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Mã HS: <span className="font-bold text-indigo-700 font-mono">{selectedStudent.connectionCode || selectedStudent.id}</span>
          </div>
        </div>

        {/* Modal Body: Mock Student View */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Note Banner */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Góc nhìn học sinh:</strong> Dưới đây là chính xác những gì học sinh <strong>{selectedStudent.name}</strong> sẽ nhìn thấy trong tab <em>"Học phí"</em> khi đến hạn thanh toán.
            </div>
          </div>

          {/* Student Tuition Card Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Card Header Status */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                  ⚠️ ĐẾN HẠN THANH TOÁN HỌC PHÍ
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  Đợt học phí Lớp {setting.className}
                </h4>
                <p className="text-xs text-rose-700 font-bold mt-0.5">
                  Đã tích lũy {setting.limitHours}.0 / {setting.limitHours} giờ quy định
                </p>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Số tiền cần đóng:</div>
                <div className="text-xl font-black text-rose-600">
                  {setting.tuitionFee?.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>

            {/* QR Code & Transfer Details Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: VietQR Image */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="relative group">
                  <div className="w-48 h-48 bg-white p-2 rounded-2xl border-2 border-indigo-100 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={vietQrUrl}
                      alt="VietQR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                    VietQR Chuẩn
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    Quét mã bằng app Ngân hàng
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Tự động điền đúng số tiền và nội dung chuyển khoản
                  </p>
                </div>
              </div>

              {/* Right Column: Bank Details & Custom Content */}
              <div className="space-y-3">
                {/* Bank Name */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Ngân hàng thụ hưởng</div>
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{setting.qrBankId || 'Chưa thiết lập'}</span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Số tài khoản</div>
                    <div className="text-sm font-black font-mono text-indigo-950 mt-0.5">
                      {setting.qrAccountNumber || 'Chưa thiết lập'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(setting.qrAccountNumber || '', 'acc')}
                    className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-3xs"
                  >
                    {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                {/* Account Holder */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Chủ tài khoản</div>
                  <div className="text-xs font-black text-slate-900 uppercase mt-0.5">
                    {setting.qrAccountName || 'Chưa thiết lập'}
                  </div>
                </div>

                {/* Transfer Content String */}
                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black text-indigo-900 uppercase flex items-center gap-1">
                      <span>Nội dung chuyển khoản (Đã tự động điền):</span>
                    </div>
                    <div className="text-xs font-mono font-black text-indigo-700 break-all bg-white px-2.5 py-1.5 rounded-lg border border-indigo-150 mt-1 shadow-3xs">
                      {transferContent}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(transferContent, 'content')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs shrink-0 mt-4"
                  >
                    {copiedField === 'content' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'content' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Receipt Upload / Stamp Section */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                {testReceiptUploaded ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Biên lai đã được mô phỏng duyệt thành công!
                  </span>
                ) : (
                  <span>Học sinh có thể tải ảnh chụp màn hình chuyển khoản sau khi quét mã.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulatePaymentStamp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Thử nghiệm đóng mộc duyệt</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            💡 Nội dung chuyển khoản sẽ luôn được hệ thống chuẩn hóa không dấu và bỏ ký tự đặc biệt để tương thích tất cả app ngân hàng.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Đóng xem thử
          </button>
        </div>
      </div>
    </div>
  );
};
