import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Mail, FastForward, Minus, Plus, Send, X, Gift, Flame, PartyPopper, MessageSquareHeart } from 'lucide-react';
import { LoveLetter, User } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';

export const HANDWRITING_FONTS = [
  { id: 'itim', name: 'Nắn Nót', font: "'Itim', cursive", desc: 'Chữ viết tay học sinh tròn trịa, chuẩn dấu tiếng Việt' },
  { id: 'patrick', name: 'Tự Nhiên', font: "'Patrick Hand', cursive", desc: 'Nét bút bi mộc mạc, phóng khoáng' },
  { id: 'mali', name: 'Dễ Thương', font: "'Mali', cursive", desc: 'Nét chữ nhí nhảnh, mềm mại' },
  { id: 'sriracha', name: 'Bút Mực', font: "'Sriracha', cursive", desc: 'Nét bút mực cổ điển ấm áp' },
];

export const THANK_YOU_EFFECTS = [
  { id: 'fireworks', name: 'Pháo Hoa Rực Rỡ', icon: Flame, color: 'from-amber-500 to-rose-500', emoji: '🎆', desc: 'Bùng nổ chùm pháo hoa sắc màu' },
  { id: 'hearts', name: 'Mưa Trái Tim', icon: Heart, color: 'from-rose-500 to-pink-500', emoji: '💖', desc: 'Cơn mưa tim lãng mạn bay khắp màn hình' },
  { id: 'sakura', name: 'Cánh Hoa Rơi', icon: Sparkles, color: 'from-pink-400 to-rose-400', emoji: '🌸', desc: 'Cánh hoa anh đào rơi nhẹ nhàng' },
  { id: 'stars', name: 'Sao Hoàng Kim', icon: PartyPopper, color: 'from-yellow-400 to-amber-500', emoji: '🌟', desc: 'Bụi sao vàng lấp lánh ánh kim' },
  { id: 'gift', name: 'Hộp Quà Tri Ân', icon: Gift, color: 'from-indigo-500 to-purple-500', emoji: '🎁', desc: 'Hộp quà tri ân mở tung rực rỡ' },
];

const THANK_YOU_TEMPLATES = [
  '🌸 Dạ em đã nhận được thư rồi ạ! Em cảm ơn Thầy/Cô rất nhiều, chúc Thầy/Cô luôn dồi dào sức khỏe và ngập tràn niềm vui ạ! ❤️',
  '✨ Cảm ơn lời động viên quý báu của Thầy/Cô! Em sẽ nỗ lực học tập thật chăm chỉ và đạt kết quả tốt nhất! 🌟',
  '💖 Nhận được bức thư ấm áp này em vui lắm ạ! Cảm ơn người gửi rất nhiều! 🥰',
  '🎉 Cảm ơn bạn rất nhiều vì món quà tinh thần tuyệt vời này nhé!',
];

interface LoveLetterModalProps {
  letter: LoveLetter | null;
  currentUser: User;
  onClose: () => void;
  onMarkRead?: (letterId: string) => void;
}

export const LoveLetterModal: React.FC<LoveLetterModalProps> = ({
  letter,
  currentUser,
  onClose,
  onMarkRead
}) => {
  const [isOpenEnvelope, setIsOpenEnvelope] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [selectedFontId, setSelectedFontId] = useState<string>(() => {
    return letter?.fontStyle || localStorage.getItem('love_letter_preferred_font') || 'itim';
  });
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // -2, 0, +2, +4
  
  // Options dialog state when clicking "Đã Nhận & Cảm Ơn"
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsTab, setOptionsTab] = useState<'message' | 'effect'>('message');
  const [thankYouMessage, setThankYouMessage] = useState(THANK_YOU_TEMPLATES[0]);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Active Running Visual Effect
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  const activeFont = HANDWRITING_FONTS.find(f => f.id === selectedFontId) || HANDWRITING_FONTS[0];

  const handleSelectFont = (fontId: string) => {
    setSelectedFontId(fontId);
    localStorage.setItem('love_letter_preferred_font', fontId);
  };

  useEffect(() => {
    if (letter?.fontStyle) {
      setSelectedFontId(letter.fontStyle);
    }
  }, [letter]);

  useEffect(() => {
    if (!letter || !isOpenEnvelope) {
      setTypedText('');
      setIsTypingDone(false);
      return;
    }

    const fullContent = letter.content || '';
    let index = 0;
    setTypedText('');
    setIsTypingDone(false);

    const timer = setInterval(() => {
      index++;
      setTypedText(fullContent.slice(0, index));
      if (index >= fullContent.length) {
        clearInterval(timer);
        setIsTypingDone(true);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [letter, isOpenEnvelope]);

  if (!letter) return null;

  const handleSkipTyping = () => {
    setTypedText(letter.content || '');
    setIsTypingDone(true);
  };

  const handleOpenOptionsModal = () => {
    setShowOptionsModal(true);
  };

  // Option 1: Send Thank-You Message back
  const handleSendThankYouMessage = async () => {
    if (!thankYouMessage.trim()) return;
    setIsSendingReply(true);

    try {
      if (letter.senderId && letter.senderId !== currentUser.id) {
        const notifId = 'notif_reply_' + Date.now();
        await setDoc(doc(db, 'system_notifications', notifId), {
          id: notifId,
          title: `💌 ${currentUser.name} đã gửi lời cảm ơn tới bạn!`,
          content: `"${thankYouMessage.trim()}" (Phản hồi cho bức thư: "${letter.title}")`,
          type: 'personal_reminder',
          badge: '💌 Lời Cảm Ơn',
          badgeColor: 'rose',
          createdAt: new Date().toISOString(),
          targetStudentId: letter.senderId
        });
      }

      if (onMarkRead) {
        onMarkRead(letter.id);
      }
      setShowOptionsModal(false);
      
      // Trigger hearts celebration before closing
      triggerCelebration('hearts', 2500);
    } catch (err: any) {
      console.error('Failed to send thank you message:', err);
      handleFirestoreError(err, OperationType.CREATE, 'system_notifications');
      if (onMarkRead) {
        onMarkRead(letter.id);
      }
      setShowOptionsModal(false);
      onClose();
    } finally {
      setIsSendingReply(false);
    }
  };

  // Option 2: Choose celebration effect
  const handleSelectEffectAndFinish = (effectId: string) => {
    if (onMarkRead) {
      onMarkRead(letter.id);
    }
    setShowOptionsModal(false);
    triggerCelebration(effectId, 3200);
  };

  const triggerCelebration = (effectId: string, durationMs = 3000) => {
    setActiveEffect(effectId);
    setTimeout(() => {
      setActiveEffect(null);
      onClose();
    }, durationMs);
  };

  // Color themes for envelope and letter paper
  const getThemeStyles = () => {
    switch (letter.envelopeStyle) {
      case 'rose_love':
        return {
          envelopeBg: 'bg-gradient-to-br from-rose-100 via-pink-100 to-rose-200 border-rose-300',
          flapBg: 'bg-rose-200 border-rose-300',
          sealBg: 'bg-rose-500 text-white shadow-rose-300',
          paperBg: 'bg-[#fff9fa] border-rose-300/80',
          lineColor: 'rgba(244, 63, 94, 0.12)',
          inkColor: 'text-[#4c0519]',
          badgeBg: 'bg-rose-100/90 text-rose-800 border-rose-200',
          accentText: 'text-rose-700'
        };
      case 'pastel_gold':
        return {
          envelopeBg: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border-amber-300',
          flapBg: 'bg-amber-200 border-amber-300',
          sealBg: 'bg-amber-600 text-white shadow-amber-300',
          paperBg: 'bg-[#fefcf6] border-amber-300/80',
          lineColor: 'rgba(217, 119, 6, 0.12)',
          inkColor: 'text-[#3f2005]',
          badgeBg: 'bg-amber-100/90 text-amber-900 border-amber-200',
          accentText: 'text-amber-700'
        };
      case 'ocean_blue':
        return {
          envelopeBg: 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 border-sky-300',
          flapBg: 'bg-sky-200 border-sky-300',
          sealBg: 'bg-sky-600 text-white shadow-sky-300',
          paperBg: 'bg-[#f8fafc] border-sky-300/80',
          lineColor: 'rgba(14, 165, 233, 0.12)',
          inkColor: 'text-[#0f172a]',
          badgeBg: 'bg-sky-100/90 text-sky-900 border-sky-200',
          accentText: 'text-sky-700'
        };
      default: // vintage_warm
        return {
          envelopeBg: 'bg-gradient-to-br from-stone-200 via-amber-100 to-orange-100 border-amber-300',
          flapBg: 'bg-amber-200 border-amber-300',
          sealBg: 'bg-red-700 text-amber-100 shadow-red-400',
          paperBg: 'bg-[#fdfaf4] border-amber-300/90',
          lineColor: 'rgba(180, 83, 9, 0.12)',
          inkColor: 'text-[#292524]',
          badgeBg: 'bg-stone-200/90 text-stone-900 border-stone-300',
          accentText: 'text-red-700'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      
      {/* Background ambient glowing particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
              scale: 0.5 + Math.random() * 0.8,
              opacity: 0.15 + Math.random() * 0.4
            }}
            animate={{
              y: -100,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
              rotate: Math.random() * 360
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
            className="absolute text-rose-300/40 text-xl select-none"
          >
            {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '✨' : '🌸'}
          </motion.div>
        ))}
      </div>

      {/* FULLSCREEN CELEBRATION EFFECTS OVERLAY */}
      <AnimatePresence>
        {activeEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden"
          >
            {/* EFFECT 1: FIREWORKS */}
            {activeEffect === 'fireworks' && (
              <div className="relative w-full h-full flex items-center justify-center">
                {Array.from({ length: 40 }).map((_, i) => {
                  const angle = (i * 360) / 40;
                  const distance = 120 + (i % 5) * 60;
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                      animate={{
                        x: Math.cos(rad) * distance,
                        y: Math.sin(rad) * distance,
                        scale: [0, 1.8, 0],
                        opacity: [1, 1, 0]
                      }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: (i % 8) * 0.15 }}
                      className="absolute w-4 h-4 rounded-full shadow-lg"
                      style={{
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6'][i % 6]
                      }}
                    />
                  );
                })}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-amber-200 text-center space-y-1 z-10"
                >
                  <span className="text-4xl">🎆</span>
                  <h3 className="text-lg font-black text-slate-900">Pháo Hoa Chúc Mừng!</h3>
                  <p className="text-xs text-slate-600 font-bold">Đã nhận bức thư và lưu vào kho kỷ niệm thành công!</p>
                </motion.div>
              </div>
            )}

            {/* EFFECT 2: HEARTS EXPLOSION */}
            {activeEffect === 'hearts' && (
              <div className="relative w-full h-full flex items-center justify-center">
                {Array.from({ length: 35 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      y: 200,
                      x: (Math.random() - 0.5) * 400,
                      scale: 0.5,
                      opacity: 0
                    }}
                    animate={{
                      y: -300 - Math.random() * 200,
                      x: (Math.random() - 0.5) * 600,
                      scale: [0.5, 1.8, 1.2],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      delay: Math.random() * 1.2
                    }}
                    className="absolute text-3xl sm:text-5xl select-none"
                  >
                    {['💖', '❤️', '💕', '💗', '💌', '🌸'][i % 6]}
                  </motion.div>
                ))}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-rose-200 text-center space-y-1 z-10"
                >
                  <span className="text-4xl">💖</span>
                  <h3 className="text-lg font-black text-rose-900">Cảm Ơn Rất Nhiều!</h3>
                  <p className="text-xs text-rose-700 font-bold">Lời tri ân ấm áp đã được gửi tới người viết!</p>
                </motion.div>
              </div>
            )}

            {/* EFFECT 3: SAKURA PETALS */}
            {activeEffect === 'sakura' && (
              <div className="relative w-full h-full flex items-center justify-center">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      y: -100,
                      x: (Math.random() - 0.5) * 600,
                      rotate: 0,
                      opacity: 0
                    }}
                    animate={{
                      y: 500,
                      x: (Math.random() - 0.5) * 800,
                      rotate: 360,
                      opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: Math.random() * 1.5
                    }}
                    className="absolute text-2xl sm:text-4xl select-none"
                  >
                    🌸
                  </motion.div>
                ))}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-pink-200 text-center space-y-1 z-10"
                >
                  <span className="text-4xl">🌸</span>
                  <h3 className="text-lg font-black text-pink-950">Mưa Cánh Hoa Tri Ân!</h3>
                  <p className="text-xs text-pink-700 font-bold">Cảm ơn những tình cảm chân thành và ấm áp!</p>
                </motion.div>
              </div>
            )}

            {/* EFFECT 4: GOLDEN STARS */}
            {activeEffect === 'stars' && (
              <div className="relative w-full h-full flex items-center justify-center">
                {Array.from({ length: 35 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      scale: 0,
                      x: (Math.random() - 0.5) * 500,
                      y: (Math.random() - 0.5) * 500,
                      opacity: 0
                    }}
                    animate={{
                      scale: [0, 1.6, 0.8, 0],
                      opacity: [0, 1, 1, 0],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: Math.random() * 1.2
                    }}
                    className="absolute text-3xl sm:text-5xl select-none"
                  >
                    {['🌟', '✨', '⭐', '💫'][i % 4]}
                  </motion.div>
                ))}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-amber-200 text-center space-y-1 z-10"
                >
                  <span className="text-4xl">🌟</span>
                  <h3 className="text-lg font-black text-amber-900">Ánh Sao Hoàng Kim!</h3>
                  <p className="text-xs text-amber-700 font-bold">Kỷ niệm đẹp đã được lưu giữ trọn vẹn!</p>
                </motion.div>
              </div>
            )}

            {/* EFFECT 5: GIFT BOX BURST */}
            {activeEffect === 'gift' && (
              <div className="relative flex flex-col items-center justify-center space-y-3">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: [0, 1.3, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.8 }}
                  className="text-6xl sm:text-8xl select-none"
                >
                  🎁
                </motion.div>
                {Array.from({ length: 25 }).map((_, i) => {
                  const angle = (i * 360) / 25;
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        x: Math.cos(rad) * 160,
                        y: Math.sin(rad) * 160,
                        scale: [0, 1.5, 0],
                        opacity: [1, 1, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: (i % 5) * 0.1 }}
                      className="absolute text-xl select-none"
                    >
                      {['🎉', '🍬', '❤️', '⭐', '🎈'][i % 5]}
                    </motion.div>
                  );
                })}
                <div className="bg-white/95 backdrop-blur-md px-6 py-3.5 rounded-3xl shadow-2xl border border-indigo-200 text-center space-y-1 z-10">
                  <h3 className="text-lg font-black text-indigo-900">Món Quà Tri Ân!</h3>
                  <p className="text-xs text-indigo-700 font-bold">Chúc bạn luôn tràn đầy niềm vui và hạnh phúc!</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isOpenEnvelope ? (
          /* CLOSED ENVELOPE VIEW */
          <motion.div
            key="envelope-closed"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="flex flex-col items-center space-y-4 max-w-sm sm:max-w-md w-full"
          >
            {/* The Envelope Card */}
            <div
              onClick={() => setIsOpenEnvelope(true)}
              className={`w-full aspect-[4/3] ${theme.envelopeBg} rounded-3xl p-6 sm:p-8 shadow-2xl border-2 cursor-pointer transform hover:scale-[1.03] active:scale-[0.98] transition-all flex flex-col justify-between relative overflow-hidden group select-none`}
            >
              {/* Flap Triangle design */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1/2 ${theme.flapBg} border-b-2 shadow-sm pointer-events-none`}
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
                }}
              />

              {/* Wax Seal Center */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                <div className={`w-16 h-16 rounded-full ${theme.sealBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Heart className="w-8 h-8 fill-current" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest mt-2 text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                  Thư Yêu Thương
                </span>
              </div>

              {/* Recipient Details */}
              <div className="relative z-10 bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/90 shadow-sm text-left space-y-0.5">
                <p className="text-[10px] uppercase font-black text-slate-400">Gửi tới:</p>
                <p className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                  {currentUser.name} ({currentUser.role === 'student' ? 'Học sinh' : 'Giáo viên'})
                </p>
                <p className="text-xs text-slate-600 font-medium truncate">
                  Từ: <span className="font-bold text-indigo-700">{letter.senderName} ({letter.senderRole === 'admin' ? 'Admin' : letter.senderRole === 'teacher' ? 'Giáo viên' : 'Học sinh'})</span>
                </p>
              </div>

              {/* Prompt */}
              <div className="relative z-10 text-center pb-1">
                <span className="text-xs font-black text-rose-700 flex items-center justify-center gap-1.5 animate-pulse">
                  <Mail className="w-4 h-4" /> Chạm nhẹ để mở phong bì thư ✉️
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-white underline font-medium transition-colors"
            >
              Bỏ qua lúc này (Xem lại sau)
            </button>
          </motion.div>
        ) : (
          /* OPENED HANDWRITTEN LETTER VIEW */
          <motion.div
            key="letter-opened"
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative max-w-xl w-full ${theme.paperBg} rounded-3xl p-5 sm:p-7 border-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] my-auto flex flex-col justify-between overflow-hidden`}
            style={{
              maxHeight: 'min(92vh, 840px)'
            }}
          >
            {/* Lined stationery background pattern */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to bottom, transparent 31px, ${theme.lineColor} 32px)`,
                backgroundSize: '100% 32px'
              }}
            />

            {/* Vintage Postal Stamp in top-right corner */}
            <div className="absolute top-4 right-5 sm:right-7 hidden sm:flex flex-col items-center justify-center border-2 border-dashed border-rose-300/60 rounded-lg w-14 h-16 bg-white/60 p-1 rotate-3 shadow-sm pointer-events-none">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-300" />
              <span className="text-[8px] font-mono font-bold text-rose-800 tracking-tighter mt-0.5">AIR MAIL</span>
            </div>
            
            {/* Top Header Bar */}
            <div className="relative z-10 border-b border-stone-300/60 pb-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 max-w-[70%]">
                  <div className={`p-2 rounded-xl ${theme.sealBg} shadow-sm shrink-0`}>
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight break-words">
                      {letter.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                      Viết bởi: <strong className="text-slate-900 font-bold">{letter.senderName}</strong> • {new Date(letter.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isTypingDone && (
                    <button
                      onClick={handleSkipTyping}
                      className="px-2.5 py-1 bg-amber-100/90 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-amber-200"
                      title="Hiện nhanh toàn bộ thư"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Hiện hết</span>
                    </button>
                  )}

                  {/* Font size adjustment */}
                  <div className="flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded-lg border border-stone-200">
                    <button
                      onClick={() => setFontSizeOffset(prev => Math.max(-2, prev - 2))}
                      disabled={fontSizeOffset <= -2}
                      className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded transition-colors"
                      title="Giảm cỡ chữ"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-700 min-w-[16px] text-center">
                      {fontSizeOffset === 0 ? 'A' : `${fontSizeOffset > 0 ? '+' : ''}${fontSizeOffset}`}
                    </span>
                    <button
                      onClick={() => setFontSizeOffset(prev => Math.min(6, prev + 2))}
                      disabled={fontSizeOffset >= 6}
                      className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded transition-colors"
                      title="Tăng cỡ chữ"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Font Selector Bar on Opened Letter */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 bg-white/70 backdrop-blur-sm p-1 rounded-xl border border-stone-200/80">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 shrink-0">KIỂU CHỮ:</span>
                {HANDWRITING_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFont(f.id)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      selectedFontId === f.id
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                    style={{ fontFamily: f.font }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Handwritten Content Body - Dynamic height, auto word wrap, genuine Vietnamese handwriting */}
            <div className="relative z-10 my-2 overflow-y-auto max-h-[46vh] sm:max-h-[52vh] custom-scrollbar pr-1.5">
              <div
                className={`leading-relaxed sm:leading-loose ${theme.inkColor} whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text transition-all`}
                style={{
                  fontFamily: activeFont.font,
                  fontSize: `${20 + fontSizeOffset}px`,
                  letterSpacing: activeFont.id === 'marck' ? '0.04em' : '0.01em',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                {typedText}
                {!isTypingDone && (
                  <span className="inline-block w-1.5 sm:w-2 h-5 sm:h-6 bg-rose-500 ml-1 animate-pulse rounded-full align-middle" />
                )}
              </div>
            </div>

            {/* Bottom Signature & Action */}
            <div className="relative z-10 pt-3 mt-2 border-t border-stone-300/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left w-full sm:w-auto">
                <p className="text-xs text-slate-500 italic">
                  {letter.senderRole === 'student' ? 'Kính gửi Thầy/Cô,' : 'Thân gửi tới em,'}
                </p>
                <p 
                  className="text-lg sm:text-2xl font-bold text-rose-700 italic truncate max-w-[240px]" 
                  style={{ fontFamily: activeFont.font }}
                >
                  {letter.senderName}
                </p>
              </div>

              <button
                onClick={handleOpenOptionsModal}
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Heart className="w-4 h-4 fill-current" />
                <span>Đã Nhận & Cảm Ơn</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2 OPTIONS: Gửi lời cảm ơn HOẶC Lựa chọn hiệu ứng cảm ơn */}
      <AnimatePresence>
        {showOptionsModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowOptionsModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="text-center space-y-1 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                  <MessageSquareHeart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Đã Nhận Bức Thư ❤️</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Hãy gửi lời cảm ơn ấm áp hoặc chọn hiệu ứng ăn mừng để lưu vào kỷ niệm
                </p>
              </div>

              {/* 2 Options Tab Header */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setOptionsTab('message')}
                  className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    optionsTab === 'message'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>1. Gửi Lời Cảm Ơn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptionsTab('effect')}
                  className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    optionsTab === 'effect'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Hiệu Ứng Cảm Ơn</span>
                </button>
              </div>

              {/* TAB 1: GỬI LỜI CẢM ƠN */}
              {optionsTab === 'message' && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500">
                    Chọn câu chúc mẫu nhanh hoặc tự viết lời nhắn:
                  </p>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {THANK_YOU_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setThankYouMessage(tmpl)}
                        className={`w-full text-left p-2 rounded-xl text-xs transition-all border ${
                          thankYouMessage === tmpl
                            ? 'bg-rose-50 border-rose-300 font-bold text-rose-950'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={thankYouMessage}
                      onChange={(e) => setThankYouMessage(e.target.value)}
                      placeholder="Nhập lời cảm ơn của bạn gửi lại tới người viết..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (onMarkRead) {
                          onMarkRead(letter.id);
                        }
                        setShowOptionsModal(false);
                        onClose();
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Lưu Thư (Không gửi phản hồi)
                    </button>

                    <button
                      type="button"
                      disabled={isSendingReply || !thankYouMessage.trim()}
                      onClick={handleSendThankYouMessage}
                      className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingReply ? 'Đang gửi...' : 'Gửi Cảm Ơn Ngay'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LỰA CHỌN HIỆU ỨNG CẢM ƠN */}
              {optionsTab === 'effect' && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500">
                    Bấm chọn 1 hiệu ứng để bắn pháo hoa hoặc mưa tim rực rỡ màn hình:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {THANK_YOU_EFFECTS.map((eff) => {
                      return (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => handleSelectEffectAndFinish(eff.id)}
                          className="p-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-2xl text-left transition-all flex items-center gap-3 group active:scale-95"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${eff.color} text-white flex items-center justify-center shadow-sm shrink-0 text-lg`}>
                            {eff.emoji}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-rose-600 transition-colors">
                              {eff.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {eff.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 italic">
                      Hiệu ứng sẽ tự động phát và hoàn tất xác nhận thư
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onMarkRead) {
                          onMarkRead(letter.id);
                        }
                        setShowOptionsModal(false);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Bỏ qua hiệu ứng
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
