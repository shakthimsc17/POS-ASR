# ASRTEX Textile POS - Automated Daily Database Backup Script
# Schedule this in Windows Task Scheduler to run daily at store closing (e.g. 10:00 PM)

$BackupDir = "C:\ASRTEX\Backups"
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Created backup folder: $BackupDir"
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\asrtex_pos_$Timestamp.sql"
$PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

if (!(Test-Path $PgDumpPath)) {
    Write-Error "PostgreSQL pg_dump not found at $PgDumpPath"
    exit 1
}

Write-Host "Starting backup of asrtex_pos database to $BackupFile..."
& $PgDumpPath -U postgres -d asrtex_pos -F c -b -v -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    
    # Retention Policy: Delete backups older than 30 days
    Get-ChildItem -Path $BackupDir -Filter *.sql | Where-Object {
        $_.CreationTime -lt (Get-Date).AddDays(-30)
    } | Remove-Item -Force
    Write-Host "Cleaned up backups older than 30 days."
} else {
    Write-Error "Backup failed with exit code $LASTEXITCODE"
}
