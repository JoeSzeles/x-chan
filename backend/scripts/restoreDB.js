import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the backup directory path
const backupDir = path.join(__dirname, '../backups');

// Check if backup directory exists
if (!fs.existsSync(backupDir)) {
    console.error('No backups directory found!');
    process.exit(1);
}

// Get list of backups
const backups = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('backup-'))
    .sort()
    .reverse();

if (backups.length === 0) {
    console.error('No backups found!');
    process.exit(1);
}

// Use the most recent backup by default
const backupToRestore = backups[0];
const backupPath = path.join(backupDir, backupToRestore);

// MongoDB connection string - replace with your actual connection string
const MONGO_URI = "mongodb://localhost:27017/twitter-clone";

// Use the full path to mongorestore (adjust this path based on your installation)
const MONGORESTORE_PATH = "C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe";

// Create restore command
const command = `"${MONGORESTORE_PATH}" --uri="${MONGO_URI}" --drop "${backupPath}"`;

console.log('Starting database restore...');
console.log(`Restoring from backup: ${backupPath}`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error during restore: ${error}`);
        console.error('Please make sure MongoDB Database Tools is installed and the path is correct');
        return;
    }
    if (stderr) {
        console.error(`Restore stderr: ${stderr}`);
        return;
    }
    console.log(`Restore completed successfully!`);
}); 