"""
Download the Ripe & Grade dataset (approved samples + photos) to your computer.

Setup (once):
    pip install supabase

Run:
    SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=your-service-role-key python download_dataset.py

On Windows PowerShell:
    $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="..."; python download_dataset.py

The service_role key bypasses all security rules. Keep it on your own computer only:
never put it in the website, GitHub, or a chat.

Output:
    dataset/
      samples.csv                one row per photo, with labels
      images/<crop>/<file>.jpg   the photos
"""

import csv
import os
import sys
from pathlib import Path

from supabase import create_client

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY")
BUCKET = "produce"
OUT = Path("dataset")
STATUS = os.environ.get("STATUS", "approved")  # set STATUS=all to include everything

if not URL or not KEY:
    sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (see the top of this file).")

client = create_client(URL, KEY)

# 1. Fetch sample rows, 1000 at a time.
rows = []
start = 0
while True:
    query = client.table("samples").select("*").order("created_at")
    if STATUS != "all":
        query = query.eq("review_status", STATUS)
    page = query.range(start, start + 999).execute().data
    rows.extend(page)
    if len(page) < 1000:
        break
    start += 1000
print(f"Found {len(rows)} samples with status '{STATUS}'.")

# 2. Download each photo and write one CSV line per photo.
columns = [
    "image_file", "sample_id", "source", "project", "crop", "view", "final_label",
    "ripeness", "defects", "obtained_from", "seller_claim", "grade", "damaged_pct",
    "treatment", "hours_since_start", "lab_result", "signs", "sample_tag", "town",
    "phone_model", "created_at",
]
OUT.mkdir(exist_ok=True)
downloaded = skipped = failed = 0

with open(OUT / "samples.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=columns)
    writer.writeheader()
    for s in rows:
        for photo in s.get("photos") or []:
            path = photo["path"]
            local = OUT / "images" / s["crop"] / path.replace("/", "_")
            local.parent.mkdir(parents=True, exist_ok=True)
            if local.exists():
                skipped += 1
            else:
                try:
                    local.write_bytes(client.storage.from_(BUCKET).download(path))
                    downloaded += 1
                except Exception as e:  # keep going if one photo fails
                    print(f"Could not download {path}: {e}")
                    failed += 1
                    continue
            writer.writerow({
                "image_file": str(local.relative_to(OUT)),
                "sample_id": s["id"],
                "source": s["source"],
                "project": s.get("project"),
                "crop": s["crop"],
                "view": photo.get("view"),
                "final_label": s.get("final_label"),
                "ripeness": s.get("ripeness"),
                "defects": "; ".join(s.get("defects") or []),
                "obtained_from": s.get("obtained_from"),
                "seller_claim": s.get("seller_claim"),
                "grade": s.get("grade"),
                "damaged_pct": s.get("damaged_pct"),
                "treatment": s.get("treatment"),
                "hours_since_start": s.get("hours_since_start"),
                "lab_result": s.get("lab_result"),
                "signs": "; ".join(s.get("signs") or []),
                "sample_tag": s.get("sample_tag"),
                "town": s.get("town"),
                "phone_model": s.get("phone_model"),
                "created_at": s["created_at"],
            })

print(f"Done. {downloaded} downloaded, {skipped} already on disk, {failed} failed.")
print(f"Open {OUT / 'samples.csv'} to see the labels.")
