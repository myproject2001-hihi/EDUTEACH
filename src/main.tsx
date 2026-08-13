import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress MediaPipe's noisy TF Lite logs to prevent them from showing as errors in the UI
const suppressTFLiteLog = (originalFn: any) => (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('TensorFlow Lite XNNPACK delegate for CPU')) {
    return;
  }
  originalFn(...args);
};

console.info = suppressTFLiteLog(console.info);
console.log = suppressTFLiteLog(console.log);
console.warn = suppressTFLiteLog(console.warn);
console.error = suppressTFLiteLog(console.error);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
