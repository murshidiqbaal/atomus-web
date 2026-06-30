const fs = require('fs');
const path = require('path');

function searchFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("'Any'") || line.includes('"Any"') || line.match(/\bAny\b/i)) {
      if (!line.includes('any') && !line.includes('async') && !line.includes('as any')) {
        console.log(`${path.basename(filepath)}:${idx + 1}: ${line.trim()}`);
      }
    }
  });
}

const files = [
  'd:/vscode/Atomus/Atomus-admin/app/atomus-web/src/app/reports/page.tsx',
  'd:/vscode/Atomus/Atomus-admin/app/atomus-web/src/app/performance/page.tsx',
  'd:/vscode/Atomus/Atomus-admin/app/atomus-web/src/features/teacher-attendance/components/AttendanceAnalytics.tsx',
  'd:/vscode/Atomus/Atomus-admin/app/atomus-web/src/features/attendance/pages/AttendancePage.tsx',
  'd:/vscode/Atomus/Atomus-admin/app/atomus-web/src/features/attendance/components/AttendanceFilters.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    searchFile(f);
  } else {
    console.log(`File does not exist: ${f}`);
  }
});
