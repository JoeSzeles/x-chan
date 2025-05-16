import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create backups directory if it doesn't exist
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Generate timestamp for backup folder name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `backup-${timestamp}`);

// MongoDB connection string - replace with your actual connection string
const MONGO_URI = "mongodb://localhost:27017/twitter-clone";

// Use the full path to mongodump (adjust this path based on your installation)
const MONGODUMP_PATH = "C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe";

// Create backup command
const command = `"${MONGODUMP_PATH}" --uri="${MONGO_URI}" --out="${backupPath}"`;

console.log('Starting database backup...');
console.log(`Backup will be saved to: ${backupPath}`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error during backup: ${error}`);
        console.error('Please make sure MongoDB Database Tools is installed and the path is correct');
        return;
    }
    if (stderr) {
        console.error(`Backup stderr: ${stderr}`);
        return;
    }
    console.log(`Backup completed successfully!`);
    console.log(`Backup location: ${backupPath}`);
}); 