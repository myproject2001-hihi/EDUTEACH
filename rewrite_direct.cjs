const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// 1. We replace the dependency array `}, [onTilt]);` with `}, []);` in the LiveCamera useEffect.
// Wait, we need to add the ref.
code = code.replace(
  "const [isLoaded, setIsLoaded] = React.useState(false);",
  "const [isLoaded, setIsLoaded] = React.useState(false);\n  const onTiltRef = React.useRef(onTilt);\n  React.useEffect(() => { onTiltRef.current = onTilt; }, [onTilt]);"
);

code = code.replace(
  "onTilt?.('left');",
  "onTiltRef.current?.('left');"
);
code = code.replace(
  "onTilt?.('right');",
  "onTiltRef.current?.('right');"
);
code = code.replace(
  "onTilt?.('none');",
  "onTiltRef.current?.('none');"
);
code = code.replace(
  "onTilt?.('none');",
  "onTiltRef.current?.('none');"
);
code = code.replace(
  "}, [onTilt]);",
  "}, []);"
);

// 2. We change the timer holding logic in GamePreview
// change 500 to 100
code = code.replace(/const timer = setTimeout\(\(\) => \{([\s\S]*?)\}, 500\);/g, "const timer = setTimeout(() => {$1}, 100);");


fs.writeFileSync('src/components/GamePreview.tsx', code);
console.log("Replaced!");
