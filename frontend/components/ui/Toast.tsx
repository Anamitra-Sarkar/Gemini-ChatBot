"use client"

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  open: boolean;
  onClose: () => void;
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Info className="w-5 h-5" />, color: 'text-blue-400' },
  success: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-400' },
  warning: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-yellow-400' },
  error: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-400' },
};

export default function Toast({
  open,
  onClose,
  variant = 'info',
  title,
  message,
  duration = 5000,
}: ToastProps) {
  React.useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div className="glass bg-bg-elevated rounded-lg shadow-xl p-4 pr-12">
            <div className="flex items-start gap-3">
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    {title}
                  </h3>
                )}
                <p className="text-sm text-text-secondary">{message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
