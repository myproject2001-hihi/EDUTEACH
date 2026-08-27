const { execSync } = require('child_process');
try {
    const out = execSync('npx tsc --noEmit', {encoding: 'utf-8'});
    console.log("OK");
} catch(e) {
    console.log(e.stdout);
}
