const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

const logSuppressor = `
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
`;

if (!code.includes('suppressTFLiteLog')) {
  // Insert right after imports
  const lines = code.split('\n');
  const lastImportIndex = lines.reduce((acc, line, idx) => line.startsWith('import') ? idx : acc, -1);
  lines.splice(lastImportIndex + 1, 0, logSuppressor);
  fs.writeFileSync('src/main.tsx', lines.join('\n'));
  console.log("Log suppressor added.");
} else {
  console.log("Already exists.");
}
