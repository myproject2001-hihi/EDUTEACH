const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

const liveCameraCode = `
function LiveCamera() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState('');
  
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => setError('Lỗi camera'));
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4 z-30">{error}</div>;
  
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-70" />;
}
`;

code = code.replace(
  "export function GamePreview",
  liveCameraCode + "\nexport function GamePreview"
);

const brokenQuizCode = `<Camera className="w-16 h-16 text-white/50 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-sm px-4">
                [Khung Camera nhận diện cử động đầu]
              </div>`;

const fixedQuizCode = `<LiveCamera />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                Camera đang bật (Preview)
              </div>`;

if (code.includes(brokenQuizCode)) {
  code = code.replace(brokenQuizCode, fixedQuizCode);
  fs.writeFileSync('src/components/GamePreview.tsx', code);
  console.log("Updated GamePreview.tsx");
} else {
  console.log("Could not find brokenQuizCode in GamePreview.tsx");
}
