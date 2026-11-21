/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, RefreshCw } from 'lucide-react';

interface LoadingSkeletonProps {
  id: string;
  type: 'card' | 'gallery' | 'list' | 'stats';
  count?: number;
}

export function LoadingSkeleton({ id, type, count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'stats':
        return (
          <div key={index} id={`${id}-stat-${index}`} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded-sm" />
                <div className="h-8 w-24 bg-slate-200 rounded-md" />
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl" />
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between">
              <div className="h-3 w-32 bg-slate-100 rounded-sm" />
              <div className="h-4 w-10 bg-slate-100 rounded-full" />
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div key={index} id={`${id}-gal-${index}`} className="aspect-square bg-slate-100 rounded-2xl border border-slate-200/40 overflow-hidden animate-pulse flex flex-col justify-end p-4">
            <div className="h-4 w-1/2 bg-slate-200/80 rounded mb-2" />
            <div className="h-3 w-1/3 bg-slate-200/60 rounded" />
          </div>
        );
      case 'list':
        return (
          <div key={index} id={`${id}-list-${index}`} className="flex items-center gap-4 p-3 border-b border-slate-100 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
            </div>
          </div>
        );
      case 'card':
      default:
        return (
          <div key={index} id={`${id}-card-${index}`} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
            <div className="w-full aspect-square bg-slate-100 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => renderSkeleton(idx))}
    </>
  );
}

interface EmptyStateProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  id,
  title,
  description,
  icon = <HelpCircle className="w-10 h-10 text-slate-400" />,
  actionLabel,
  onActionClick
}: EmptyStateProps) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200/80 max-w-md mx-auto my-6"
    >
      <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl mb-4 shadow-inner">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-xs mt-1.5 mb-6">
        {description}
      </p>
      {actionLabel && onActionClick && (
        <button
          id={`${id}-action-btn`}
          onClick={onActionClick}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
