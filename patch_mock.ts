import * as fs from 'fs';

let content = fs.readFileSync('src/mockData.ts', 'utf8');

content = content.replace(/export const mockStudents: User\[\] = \[([\s\S]*?)\];/g, 'export const mockStudents: User[] = [];');
content = content.replace(/export const mockClasses: ClassSession\[\] = \[([\s\S]*?)\];/g, 'export const mockClasses: ClassSession[] = [];');
content = content.replace(/export const mockAssignments: Assignment\[\] = \[([\s\S]*?)\];/g, 'export const mockAssignments: Assignment[] = [];');
content = content.replace(/export const mockSubmissions: Submission\[\] = \[([\s\S]*?)\];/g, 'export const mockSubmissions: Submission[] = [];');
content = content.replace(/export const mockSimulations: HTMLSimulation\[\] = \[([\s\S]*?)\];/g, 'export const mockSimulations: HTMLSimulation[] = [];');
content = content.replace(/export const mockProgress: StudentProgress\[\] = \[([\s\S]*?)\];/g, 'export const mockProgress: StudentProgress[] = [];');

fs.writeFileSync('src/mockData.ts', content);
