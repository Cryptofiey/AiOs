const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');
code = code.replace("import './index.css';", "import './index.css';\nimport React from 'react';");
code = code.replace(
"createRoot(document.getElementById('root')!).render(",
`class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
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
`
);
code = code.replace(
`  <StrictMode>
    <App />
  </StrictMode>`,
`  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>`
);
fs.writeFileSync('src/main.tsx', code);
