import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Link as LinkIcon, Send, Eye, EyeOff, CheckCircle, AlertCircle, Bot, Copy, Check } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

interface SettingsViewProps {
  user: User;
}

export function SettingsView({ user }: SettingsViewProps) {
  const [webhookUrl, setWebhookUrl] = useState(`https://${window.location.hostname}/api/zalo-webhook`);
  const [secretToken, setSecretToken] = useState('');
  const [botToken, setBotToken] = useState('');
  const [testChatId, setTestChatId] = useState('');
  
  const [showSecret, setShowSecret] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Load existing config
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'zalo_bot');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.secretToken) setSecretToken(data.secretToken);
          if (data.botToken) setBotToken(data.botToken);
          if (data.testChatId) setTestChatId(data.testChatId);
        }
      } catch (err) {
        console.error("Lỗi tải cấu hình Zalo:", err);
      }
    };
    loadConfig();
  }, []);

  const generateSecretToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretToken(result);
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      await setDoc(doc(db, 'settings', 'zalo_bot'), {
        secretToken,
        botToken,
        testChatId,
        updatedAt: new Date().toISOString()
      });
      setNotification({ message: 'Lưu cấu hình Zalo Bot thành công!', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Có lỗi khi lưu cấu hình. Vui lòng kiểm tra quyền (Firestore Rules).', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!botToken || !testChatId) {
      setNotification({ message: 'Vui lòng nhập Bot Token và Zalo Chat ID để test!', type: 'error' });
      return;
    }
    
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/send-zalo-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken,
          chatId: testChatId,
          message: 'Xin chào! Đây là tin nhắn thử nghiệm từ hệ thống EduTeach.'
        }),
      });
      
      const data = await response.json();
      
      if (data.error && data.error !== 0) {
        throw new Error(data.message || 'Lỗi gửi tin nhắn');
      }
      
      setNotification({ message: 'Đã gửi tin nhắn test thành công! Vui lòng kiểm tra ứng dụng Zalo.', type: 'success' });
    } catch (err: any) {
      console.error('Lỗi gửi tin nhắn Zalo:', err);
      setNotification({ message: `Lỗi gửi tin nhắn: ${err.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-500" />
            Cài đặt Zalo Bot
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Cấu hình kết nối Zalo Bot để tự động gửi thông báo hệ thống cho học sinh và giáo viên.</p>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="text-sm font-semibold">{notification.message}</div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">1. Thông tin Webhook</h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Webhook URL (Dán vào Zalo Bot Creator)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">URL phải bắt đầu bằng https://...</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mã bí mật (Secret Token)</label>
              <div className="flex gap-2">
                <button
                  onClick={generateSecretToken}
                  className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors text-slate-600"
                  title="Tạo mã mới"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={secretToken}
                    onChange={(e) => setSecretToken(e.target.value)}
                    placeholder="Mã bí mật (8-256 ký tự)"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span><strong>Giải thích:</strong> Mã này do bạn tự tạo trên hệ thống của chúng ta, sau đó <strong>copy dán vào Zalo</strong> để Zalo xác thực khi gửi thông báo về đây.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">2. Cấu hình gửi tin nhắn (Từ Zalo)</h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Zalo Bot Token</label>
              <div className="relative">
                <input
                  type={showBotToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Nhập Zalo Bot Token..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Mã này do <strong>Zalo cấp</strong>, bạn copy từ Zalo và dán vào đây để hệ thống có quyền gửi tin nhắn qua Zalo.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Zalo Chat ID Test (Kiểm tra)</label>
              <input
                type="text"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="Ví dụ: 1234567890123456"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
            <button
              onClick={handleTestConnection}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Send className="w-4 h-4" />
              Gửi tin nhắn test
            </button>
          </div>
          
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-3xl border border-blue-100 shadow-sm overflow-hidden p-6 mt-6">
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-blue-600" />
          3. Hướng dẫn liên kết tài khoản cho người dùng
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Để hệ thống có thể tự động gửi bài tập, nhắc nhở hoặc thông báo, người dùng (Học sinh hoặc Giáo viên) cần làm thao tác sau trên Zalo của họ:
        </p>
        <div className="bg-white p-4 rounded-xl border border-blue-100 font-mono text-sm font-bold text-blue-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-400" />
            <span>/start {user.connectionCode || user.id.substring(0, 6).toUpperCase()}</span>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            👆 Phía trên là <strong>Mã kết nối 6 số của riêng bạn</strong>. Bạn có thể dùng mã này để liên kết với tài khoản Zalo của mình.
          </p>
          <p>
            <strong>Đối với Học sinh:</strong> Mỗi học sinh cũng sẽ có một mã kết nối riêng gồm 6 chữ số. Bạn có thể xem mã này trong phần quản lý tài khoản/danh sách học sinh. Khi học sinh nhắn tin theo cú pháp <code>/start [Mã_kết_nối_6_số]</code>, Webhook sẽ tự động cập nhật tài khoản và liên kết thành công.
          </p>
        </div>
      </div>
    </div>
  );
}
