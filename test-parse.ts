import * as fs from 'fs';
const text = fs.readFileSync('src/views/AssignmentsView.tsx', 'utf8');

const funcStr = text.match(/export function parseRawCodeToQuestions[\s\S]+?return \{ groupTitle: initialGroupTitle, parsedQuestions: questionsList \};\n\}/)?.[0];
const sampleStrMatch = text.match(/mau2: \`([\s\S]+?)\`,\n\s+mau3:/);

fs.writeFileSync('func.ts', `
${funcStr?.replace('export ', '')}
const sampleStr = \`${sampleStrMatch?.[1].replace(/\`/g, '\\`')}\`;
const result = parseRawCodeToQuestions(sampleStr);
console.log(JSON.stringify(result, null, 2));
`);
