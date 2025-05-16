const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const LOG_DIR = path.join(__dirname, '../logs');
const DB_NAME = 'twitter-clone';
const MONGODB_URI = 'mongodb://localhost:27017';

// Ensure backup and log directories exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create timestamp for backup folder and log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);
const logFile = path.join(LOG_DIR, `backup-${timestamp}.log`);

// Create log stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    logStream.write(logMessage);
}

// Function to clean up old backups (keep last 7 days)
function cleanupOldBackups() {
    const MAX_BACKUP_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            log(`Error reading backup directory: ${err.message}`);
            return;
        }

        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    log(`Error getting stats for ${file}: ${err.message}`);
                    return;
                }

                const fileAge = now - stats.mtime.getTime();
                if (fileAge > MAX_BACKUP_AGE) {
                    fs.rm(filePath, { recursive: true }, err => {
                        if (err) {
                            log(`Error deleting old backup ${file}: ${err.message}`);
                        } else {
                            log(`Deleted old backup: ${file}`);
                        }
                    });
                }
            });
        });
    });
}

// Main backup function
function performBackup() {
    log('Starting automated backup...');
    
    // Create backup directory
    fs.mkdirSync(backupFolder, { recursive: true });
    
    // Construct mongodump command
    const mongodumpPath = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
    const command = `"${mongodumpPath}" --uri="${MONGODB_URI}/${DB_NAME}" --out="${backupFolder}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            log(`Backup failed: ${error.message}`);
            return;
        }
        if (stderr) {
            log(`Backup stderr: ${stderr}`);
        }
        if (stdout) {
            log(`Backup stdout: ${stdout}`);
        }

        log('Backup completed successfully');
        log(`Backup location: ${backupFolder}`);
        
        // Clean up old backups
        cleanupOldBackups();
        
        // Close log stream
        logStream.end();
    });
}

// Run the backup
performBackup(); 