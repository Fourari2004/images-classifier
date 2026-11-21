/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts?: ToastMessage[];
  toast?: ToastMessage;
  onClose: (id: string) => void;
}

export default function Toast({ toasts, toast, onClose }: ToastProps) {
  const items = toasts || (toast ? [toast] : []);

  return (
    <div id="toast-container" className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            id={`toast-${t.id}`}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md bg-white/95 ${
              t.type === 'success'
                ? 'border-emerald-100 text-emerald-800 shadow-emerald-100/20'
                : t.type === 'error'
                ? 'border-rose-100 text-rose-800 shadow-rose-100/20'
                : 'border-blue-100 text-blue-800 shadow-blue-100/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>

            <button
              onClick={() => onClose(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
