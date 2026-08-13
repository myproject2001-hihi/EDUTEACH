const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

code = code.replace("if (faceLandmarker) faceLandmarker.close();\n    };\n  }, [onTilt]);", "if (faceLandmarker) faceLandmarker.close();\n    };\n  }, []);");

fs.writeFileSync('src/components/GamePreview.tsx', code);
console.log("Fixed!");
