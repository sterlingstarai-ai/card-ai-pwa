/**
 * Toast notification component
 */

import { useEffect } from 'react';
import { CONFIG } from '../constants/config';

export const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, CONFIG.TIMEOUTS.TOAST);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div role="alert" aria-live="polite" style={{
      position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(30, 41, 59, 0.95)', color: 'white', padding: '12px 20px',
      borderRadius: '50px', fontSize: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)', zIndex: 100, animation: 'slideUp 0.3s ease-out'
    }}>
      <span>{message}</span>
    </div>
  );
};
