import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GuideOnboardingModal } from './GuideOnboardingModal';
import { User } from '../types';

interface GuideButtonProps {
  activeTab: string;
  user: User | null;
}

export function GuideButton({ activeTab, user }: GuideButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors relative min-w-[40px] min-h-[40px] flex items-center justify-center"
        title="Hướng dẫn sử dụng tab hiện tại"
      >
        <HelpCircle className="w-5 h-5 2xl:w-6 2xl:h-6" />
      </button>
      
      {isOpen && (
        <GuideOnboardingModal 
          user={user} 
          onClose={() => setIsOpen(false)} 
          activeTab={activeTab} 
        />
      )}
    </>
  );
}
