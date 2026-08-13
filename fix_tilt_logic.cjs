const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// I will make sure the threshold is correct and add a bit of logging for the user to understand.
// Wait, console.log might be too noisy. Let's make it 0.03 for a more sensitive trigger.
code = code.replace("if (dy > 0.05)", "if (dy > 0.04)");
code = code.replace("else if (dy < -0.05)", "else if (dy < -0.04)");

fs.writeFileSync('src/components/GamePreview.tsx', code);
console.log("Sensitivity updated.");
