import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/src/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  hideCloseButton?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'lg',
  className,
  bodyClassName,
  headerClassName,
  hideCloseButton = false,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Classic Dim Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/60"
            onClick={onClose}
          />

          {/* Classic Window Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "relative w-full bg-white rounded-lg border border-slate-300 shadow-2xl overflow-hidden flex flex-col text-left z-10 max-h-[92vh] my-auto",
              maxWidthMap[maxWidth],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Classic Title Bar */}
            {(title || !hideCloseButton) && (
              <div
                className={cn(
                  "px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0",
                  headerClassName
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  {icon && (
                    <div className="shrink-0 text-slate-700">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {typeof title === 'string' ? (
                      <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {subtitle && (
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 active:bg-slate-300 border border-transparent hover:border-slate-300 transition-colors shrink-0"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className={cn("p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar text-slate-800 text-sm", bodyClassName)}>
              {children}
            </div>

            {/* Classic Action Footer */}
            {footer && (
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
