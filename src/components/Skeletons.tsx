import React from 'react';

// Base Skeleton element with shimmer effect
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`} />
  );
}

// Skeleton for Assignment Card in the sidebar list
export function AssignmentCardSkeleton() {
  return (
    <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded-lg" />
      <div className="pt-2 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton for Assignment List column
export function AssignmentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <AssignmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton for Selected Assignment Detail Panel
export function AssignmentDetailSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-2/3 rounded-xl" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-lg" />
        </div>
      </div>

      {/* Instruction Box Skeleton */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>

      {/* Banner / Notice Skeleton */}
      <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full bg-amber-200/80 shrink-0" />
        <Skeleton className="h-4 w-full rounded-md bg-amber-200/60" />
      </div>

      {/* Action / Start Exam Box Skeleton */}
      <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 text-center max-w-xl mx-auto">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-7 w-48 mx-auto rounded-xl" />
        <Skeleton className="h-4 w-3/4 mx-auto rounded-md" />
        <Skeleton className="h-12 w-full rounded-2xl bg-indigo-200/80" />
      </div>
    </div>
  );
}

// Skeleton for Teacher Submissions List
export function SubmissionsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-xl" />
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for Table rows
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-lg hidden sm:block" />
          <Skeleton className="h-5 w-28 rounded-lg hidden md:block" />
          <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for Notification Items
export function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
