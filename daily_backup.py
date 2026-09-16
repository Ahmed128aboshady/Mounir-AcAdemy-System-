"""
Mounir Academy - Automated Daily Backup Script
Backs up Supabase database tables and project data to D:\\Mounir\\Backup
Runs daily at 10:00 PM
"""

import os
import sys
import json
import csv
import shutil
import zipfile
from datetime import datetime
import urllib.request
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

BACKUP_ROOT = r"D:\Mounir\Backup"
LOG_FILE = os.path.join(BACKUP_ROOT, "backup_log.txt")

SUPABASE_URL = "https://chwhrxquvaiskdsthips.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod2hyeHF1dmFpc2tkc3RoaXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDM2NzgsImV4cCI6MjEwNDYxOTY3OH0.k_t-GUAT01c6ko-8QcF5L4FYnZQPV6HIu4JSnH1zbO4"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

TABLES_TO_BACKUP = [
    "students",
    "enrollments",
    "teachers",
    "users",
    "lectures"
]

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def fetch_supabase_table(table_name):
    all_rows = []
    offset = 0
    limit = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers=HEADERS, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data:
                    break
                all_rows.extend(data)
                if len(data) < limit:
                    break
                offset += limit
        except Exception as e:
            log(f"⚠️ Warning: Error fetching {table_name} at offset {offset}: {e}")
            break
            
    return all_rows

def save_json(data, filepath):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def save_csv(data, filepath):
    if not data or not isinstance(data, list):
        return
    keys = list(data[0].keys())
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for row in data:
            # format dict/list nested objects as json strings for csv
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, (dict, list)):
                    clean_row[k] = json.dumps(v, ensure_ascii=False)
                else:
                    clean_row[k] = v
            writer.writerow(clean_row)

def perform_backup():
    log("==========================================")
    log("🚀 Starting Mounir Academy Daily Backup...")
    
    os.makedirs(BACKUP_ROOT, exist_ok=True)
    
    now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    staging_dir = os.path.join(BACKUP_ROOT, f"_temp_{now_str}")
    db_staging = os.path.join(staging_dir, "database")
    os.makedirs(db_staging, exist_ok=True)
    
    total_records = 0
    summary = {}
    
    # 1. Backup Supabase tables
    for table in TABLES_TO_BACKUP:
        log(f"📥 Fetching table: {table}...")
        rows = fetch_supabase_table(table)
        count = len(rows)
        total_records += count
        summary[table] = count
        
        # Save JSON & CSV
        json_path = os.path.join(db_staging, f"{table}.json")
        csv_path = os.path.join(db_staging, f"{table}.csv")
        save_json(rows, json_path)
        save_csv(rows, csv_path)
        log(f"  ✅ Saved {table}: {count} records (JSON & CSV)")
        
    # 2. Copy local project critical data if available
    local_project_dir = r"C:\Users\user\.gemini\antigravity\scratch\monir_smart_lms"
    local_files_staging = os.path.join(staging_dir, "local_data")
    os.makedirs(local_files_staging, exist_ok=True)
    
    critical_files = [
        os.path.join(local_project_dir, "students_credentials.csv"),
        os.path.join(local_project_dir, "js", "db_seed.json")
    ]
    
    for fpath in critical_files:
        if os.path.exists(fpath):
            fname = os.path.basename(fpath)
            shutil.copy2(fpath, os.path.join(local_files_staging, fname))
            log(f"  ✅ Copied local file: {fname}")

    # 3. Create metadata summary file
    metadata = {
        "backup_date": now_str,
        "backup_timestamp": datetime.now().isoformat(),
        "total_records": total_records,
        "tables_summary": summary,
        "status": "SUCCESS"
    }
    save_json(metadata, os.path.join(staging_dir, "backup_manifest.json"))
    
    # 4. Create ZIP file
    zip_filename = f"backup_{now_str}.zip"
    zip_path = os.path.join(BACKUP_ROOT, zip_filename)
    log(f"📦 Compressing backup to: {zip_filename}...")
    
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(staging_dir):
            for file in files:
                abs_file = os.path.join(root, file)
                rel_file = os.path.relpath(abs_file, staging_dir)
                zipf.write(abs_file, rel_file)
                
    # 5. Mirror to 'latest' folder for instant inspection
    latest_dir = os.path.join(BACKUP_ROOT, "latest")
    if os.path.exists(latest_dir):
        shutil.rmtree(latest_dir)
    shutil.copytree(staging_dir, latest_dir)
    
    # Clean up staging
    shutil.rmtree(staging_dir)
    
    # 6. Retention: Keep only the latest 30 backups
    all_zips = sorted([
        os.path.join(BACKUP_ROOT, f) 
        for f in os.listdir(BACKUP_ROOT) 
        if f.startswith("backup_") and f.endswith(".zip")
    ])
    if len(all_zips) > 30:
        for old_zip in all_zips[:-30]:
            try:
                os.remove(old_zip)
                log(f"🧹 Removed old backup archive: {os.path.basename(old_zip)}")
            except Exception:
                pass

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    log(f"🎉 Backup completed successfully!")
    log(f"📁 Archive: {zip_path} ({zip_size_mb:.2f} MB)")
    log(f"📊 Total records backed up: {total_records}")
    log("==========================================\n")
    return zip_path

if __name__ == "__main__":
    perform_backup()
