'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const notificationStyles = {
  success: {
    bg: 'bg-green-100/80 dark:bg-green-500/20',
    border: 'border-green-300 dark:border-green-500/30',
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
  },
  error: {
    bg: 'bg-red-100/80 dark:bg-red-500/20',
    border: 'border-red-300 dark:border-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-300',
  },
  warning: {
    bg: 'bg-yellow-100/80 dark:bg-yellow-500/20',
    border: 'border-yellow-300 dark:border-yellow-500/30',
    icon: AlertCircle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-800 dark:text-yellow-300',
  },
  info: {
    bg: 'bg-blue-100/80 dark:bg-blue-500/20',
    border: 'border-blue-300 dark:border-blue-500/30',
    icon: AlertCircle,
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-300',
  },
};

export default function Notification({ type, title, message, isVisible, onClose }: NotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const styles = notificationStyles[type];
  const Icon = styles.icon;

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        onClose();
      }, 1500); // Auto-close after 1.5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[2147483647] animate-in slide-in-from-right-full duration-300">
      <div className={`
        ${styles.bg} ${styles.border}
        backdrop-blur-lg rounded-xl p-4 border shadow-2xl
        min-w-[320px] max-w-[400px]
        transform transition-all duration-300
        ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 ${styles.iconColor}`} />
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${styles.titleColor} mb-1`}>
              {title}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook pour gérer les notifications
export function useNotification() {
  const [notification, setNotification] = useState<{
    type: NotificationType;
    title: string;
    message: string;
    isVisible: boolean;
  }>({
    type: 'info',
    title: '',
    message: '',
    isVisible: false,
  });

  const showNotification = useCallback((type: NotificationType, title: string, message: string) => {
    setNotification({ type, title, message, isVisible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
  };
} 