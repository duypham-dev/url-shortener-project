import React, { useEffect } from 'react';
import { useConfirmStore } from '../store/useConfirmStore';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

export const GlobalConfirmModal: React.FC = () => {
  const { isOpen, config, closeConfirmDialog } = useConfirmStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeConfirmDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeConfirmDialog]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeConfirmDialog(false);
    }
  };

  const getIcon = () => {
    switch (config.variant) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getIconBackground = () => {
    switch (config.variant) {
      case 'danger': return 'bg-red-100';
      case 'warning': return 'bg-yellow-100';
      case 'success': return 'bg-green-100';
      case 'info':
      default: return 'bg-blue-100';
    }
  };

  const getButtonClass = () => {
    const base = "inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    switch (config.variant) {
      case 'danger': return `${base} bg-red-600 hover:bg-red-500 focus:ring-red-600`;
      case 'warning': return `${base} bg-yellow-600 hover:bg-yellow-500 focus:ring-yellow-600`;
      case 'success': return `${base} bg-green-600 hover:bg-green-500 focus:ring-green-600`;
      case 'info':
      default: return `${base} bg-blue-600 hover:bg-blue-500 focus:ring-blue-600`;
    }
  };

  return (
    <div
      className="relative z-[9999]"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/20 transition-opacity backdrop-blur-md" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto" onClick={handleBackdropClick}>
        <div 
          className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
          onClick={handleBackdropClick} // Extra layer to catch clicks outside the modal box
        >
          {/* Modal Panel */}
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-100">
            <button
              onClick={() => closeConfirmDialog(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${getIconBackground()}`}>
                  {getIcon()}
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full pr-6">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                    {config.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {config.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end sm:px-6 gap-2 sm:gap-0 border-t border-gray-100">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => closeConfirmDialog(false)}
              >
                {config.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                className={getButtonClass()}
                onClick={() => closeConfirmDialog(true)}
              >
                {config.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
