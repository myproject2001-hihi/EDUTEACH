const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// I'll insert a quick LiveCamera component into GamePreview.tsx
const liveCameraComponent = `
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

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4">{error}</div>;
  
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-70" />;
}
`;

// wait, it's a functional component file. Let's see what imports it has.
