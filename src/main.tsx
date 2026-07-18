import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './index.css';
import React from 'react';

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Buffer = Buffer;
  
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const msg = args.join(' ');
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded') || msg.includes('GrpcConnection RPC')) {
       return;
    }
    originalConsoleError(...args);
  };
  
  const ignoreError = (errStr: string) => {
    return (
      errStr.includes('TON_CONNECT_SDK_ERROR') || 
      errStr.includes('TonConnect') ||
      errStr.includes('Aborted after attempts') ||
      errStr.includes('concurrent rendering') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('Quota limit exceeded') ||
      errStr.includes('GrpcConnection RPC')
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

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error("CAUGHT BY BOUNDARY", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color: 'red', padding: '20px', backgroundColor: 'black', height: '100vh', fontFamily: 'monospace'}}>
          <h1>Application Error</h1>
          <pre style={{whiteSpace: 'pre-wrap'}}>{this.state.error?.stack || this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

