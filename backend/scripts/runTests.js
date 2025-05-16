import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run tests directly since server is already running
console.log('Starting API tests...');
const testProcess = spawn('node', ['testCommentAPI.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

testProcess.on('close', (code) => {
    console.log(`Tests completed with code ${code}`);
    process.exit(code);
});

testProcess.on('error', (error) => {
    console.error('Error running tests:', error);
    process.exit(1);
}); 