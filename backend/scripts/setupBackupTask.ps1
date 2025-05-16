# Get the absolute path to the batch file
$scriptPath = Join-Path $PSScriptRoot "runBackup.bat"
$scriptPath = [System.IO.Path]::GetFullPath($scriptPath)

# Create the scheduled task action
$action = New-ScheduledTaskAction -Execute $scriptPath

# Create the trigger (run daily at 2 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM

# Create the task settings
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

# Create the task
$taskName = "TwitterCloneDBBackup"
$description = "Daily backup of Twitter Clone database"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Existing task removed"
}

# Register the new task
Register-ScheduledTask -TaskName $taskName -Description $description -Action $action -Trigger $trigger -Settings $settings -Force

Write-Host "Backup task scheduled successfully!"
Write-Host "Task will run daily at 2 AM"
Write-Host "Backup location: $($scriptPath | Split-Path -Parent)\backups"
Write-Host "Log location: $($scriptPath | Split-Path -Parent)\logs" 