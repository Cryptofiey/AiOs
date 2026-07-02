import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Buffer = Buffer;
  const ignoreError = (errStr: string) => {
    return (
      errStr.includes('TON_CONNECT_SDK_ERROR') || 
      errStr.includes('TonConnect') ||
      errStr.includes('Aborted after attempts') ||
      errStr.includes('concurrent rendering')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errStr = String(reason || '');
    const errMsg = String(reason?.message || '');
    const errName = String(reason?.name || '');
    
    if (ignoreError(errStr) || ignoreError(errMsg) || ignoreError(errName)) {
      console.warn('[Global] Suppressed unhandled rejection:', reason);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const error = event.error;
    const errStr = String(error || '');
    const errMsg = String(event.message || '');
    const errName = String(error?.name || '');

    if (ignoreError(errStr) || ignoreError(errMsg) || ignoreError(errName)) {
      console.warn('[Global] Suppressed error event:', event.message);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

