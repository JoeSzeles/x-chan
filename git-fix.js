
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Main function to run the git fix operations
async function fixGitPushIssues() {
  try {
    console.log('Starting Git fix process...');
    
    // Step 1: Check for and remove lock files
    console.log('\nStep 1: Checking for lock files...');
    const gitDir = path.join(process.cwd(), '.git');
    const lockFiles = await findLockFiles(gitDir);
    
    if (lockFiles.length > 0) {
      console.log(`Found ${lockFiles.length} lock files. Removing them...`);
      for (const lockFile of lockFiles) {
        fs.unlinkSync(lockFile);
        console.log(`Removed: ${lockFile}`);
      }
    } else {
      console.log('No lock files found.');
    }
    
    // Step 2: Pull changes
    console.log('\nStep 2: Pulling remote changes...');
    try {
      const { stdout: pullOutput } = await execPromise('git pull --no-rebase');
      console.log(pullOutput);
    } catch (pullError) {
      console.log('Pull encountered conflicts. This is normal if there are merge conflicts.');
      console.log(pullError.stdout || pullError.message);
    }
    
    // Step 3: Check for merge conflicts
    console.log('\nStep 3: Checking for merge conflicts...');
    const { stdout: statusOutput } = await execPromise('git status');
    
    if (statusOutput.includes('Unmerged paths') || statusOutput.includes('fix conflicts')) {
      console.log('Merge conflicts detected. Please resolve them manually in the files listed below:');
      
      const conflictedFiles = statusOutput
        .split('\n')
        .filter(line => line.includes('both modified:'))
        .map(line => line.trim().replace('both modified:', '').trim());
      
      console.log('\nConflicted files:');
      conflictedFiles.forEach(file => console.log(`- ${file}`));
      
      console.log('\nAfter resolving conflicts, run these commands:');
      console.log('1. git add <resolved-file-paths>');
      console.log('2. git commit -m "Resolve merge conflicts"');
      console.log('3. git push');
    } else {
      console.log('No merge conflicts detected.');
      
      // Step 4: Try to push changes
      console.log('\nStep 4: Pushing changes...');
      try {
        const { stdout: pushOutput } = await execPromise('git push');
        console.log('Push successful!');
        console.log(pushOutput);
      } catch (pushError) {
        console.log('Push failed. You may need additional steps:');
        console.log(pushError.stdout || pushError.message);
      }
    }
    
  } catch (error) {
    console.error('Error during Git fix process:', error.message);
  }
}

// Helper function to find lock files
async function findLockFiles(dir) {
  const lockFiles = [];
  
  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.lock')) {
        lockFiles.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return lockFiles;
}

// Run the fix process
fixGitPushIssues();
