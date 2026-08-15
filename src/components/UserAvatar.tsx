import React, { useState } from 'react';

interface UserAvatarProps {
  name?: string;
  firstName?: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const COLOR_CLASSES = [
  'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-indigo-200',
  'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-blue-200',
  'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-200',
  'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-purple-200',
  'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-amber-200',
  'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-rose-200',
  'bg-gradient-to-tr from-violet-600 to-purple-700 text-white shadow-violet-200',
];

export function getFirstName(fullName?: string, firstNameInput?: string): string {
  if (firstNameInput && firstNameInput.trim()) return firstNameInput.trim();
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace === -1 ? trimmed : trimmed.substring(lastSpace + 1);
}

export function getLastName(fullName?: string, lastNameInput?: string): string {
  if (lastNameInput !== undefined && lastNameInput !== null) return lastNameInput;
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace === -1 ? '' : trimmed.substring(0, lastSpace);
}

export function combineName(lastName?: string, firstName?: string): string {
  const l = (lastName || '').trim();
  const f = (firstName || '').trim();
  if (l && f) return `${l} ${f}`;
  return l || f || '';
}

export function UserAvatar({ name = '', firstName, avatar, size = 'md', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const givenName = getFirstName(name, firstName);
  const initial = givenName ? givenName.charAt(0).toUpperCase() : 'U';

  // Deterministic color assignment based on initial char code
  const charCode = initial.charCodeAt(0) || 0;
  const colorClass = COLOR_CLASSES[charCode % COLOR_CLASSES.length];

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs font-bold ring-2 ring-white/50',
    md: 'w-10 h-10 text-sm font-extrabold ring-2 ring-white/80',
    lg: 'w-12 h-12 text-base font-black ring-2 ring-white/80',
    xl: 'w-16 h-16 text-xl font-black ring-4 ring-white/80',
  }[size];

  if (avatar && !imgError && (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:'))) {
    return (
      <img
        src={avatar}
        alt={name || 'Avatar'}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-slate-200 shadow-sm shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center shadow-md select-none border border-white/30 shrink-0 font-sans tracking-tight ${colorClass} ${className}`}
      title={name || 'User'}
    >
      {initial}
    </div>
  );
}
