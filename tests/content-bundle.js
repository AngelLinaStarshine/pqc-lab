// Runs the lesson content test against the server's own lesson files (works on Windows, macOS and Linux).
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const A = path.join(__dirname, '..', 'app');
const parts = ['shared/catalog.js', 'shared/lessons.js', 'shared/engine.js', 'shared/ops.js', 'public/ui.js'].map(f => fs.readFileSync(path.join(A, f), 'utf8'));
const tmp = path.join(os.tmpdir(), 'pqc-lab-bundle.js');
fs.writeFileSync(tmp, parts.join('\n'));
const out = execFileSync(process.execPath, [path.join(__dirname, 'content_test.js'), tmp], {encoding:'utf8'});
console.log(out.trim().split('\n').slice(-2).join('\n'));
if(/FAILURES [1-9]/.test(out)) process.exit(1);
