#!/usr/bin/env python3
"""
RISE Phoenix — Lighthouse/IPFS Upload Script
Uploads all 500 images + metadata JSONs to IPFS via Lighthouse Storage.
Updates metadata image URIs to ipfs:// CID references.
"""

import os
import json
import time
import requests
import sys
from pathlib import Path

LIGHTHOUSE_API_KEY = "4741b2a6.e590189e3c0c4d1a9998c49610c1f22c"
LIGHTHOUSE_UPLOAD_URL = "https://upload.lighthouse.storage/api/v0/add"

BASE_DIR = Path(__file__).parent.parent
IMAGES_DIR = BASE_DIR / "public" / "nft"
METADATA_DIR = BASE_DIR / "art" / "metadata"
CID_MAP_FILE = BASE_DIR / "art" / "cid_map.json"

def upload_file(filepath, api_key):
    """Upload a single file to Lighthouse/IPFS."""
    filename = os.path.basename(filepath)
    with open(filepath, 'rb') as f:
        response = requests.post(
            LIGHTHOUSE_UPLOAD_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (filename, f)},
            data={"wrapWithDirectory": "false"}
        )
    if response.status_code == 200:
        data = response.json()
        return data.get("Hash") or data.get("cid")
    else:
        print(f"  ❌ Upload failed: {response.status_code} — {response.text[:200]}")
        return None

def upload_directory(dir_path, api_key, label=""):
    """Upload all files in a directory, return {filename: cid} map."""
    files = sorted(dir_path.iterdir())
    cid_map = {}
    total = len(files)
    
    print(f"\n📦 Uploading {label} ({total} files)...")
    
    for i, filepath in enumerate(files, 1):
        if not filepath.is_file():
            continue
        fname = filepath.name
        print(f"  [{i}/{total}] {fname}...", end="", flush=True)
        
        cid = upload_file(str(filepath), api_key)
        if cid:
            cid_map[fname] = cid
            print(f" ✅ {cid[:20]}...")
        else:
            print(f" ❌ FAILED")
        
        # Rate limit — 2 requests/sec to be safe
        time.sleep(0.5)
    
    print(f"\n✅ {label}: {len(cid_map)}/{total} uploaded successfully")
    return cid_map

def update_metadata_uris(image_cid_map, metadata_dir):
    """Update each metadata JSON to reference ipfs:// image CID."""
    updated = 0
    for fname, img_cid in image_cid_map.items():
        # fname = "1.png" → metadata = "1.json"
        num = Path(fname).stem
        meta_path = metadata_dir / f"{num}.json"
        
        if not meta_path.exists():
            print(f"  ⚠️ No metadata for {fname}")
            continue
        
        with open(meta_path, 'r') as f:
            meta = json.load(f)
        
        # Update image field to ipfs:// URI
        meta["image"] = f"ipfs://{img_cid}"
        
        # Update files array if present
        if "properties" in meta and "files" in meta["properties"]:
            for file_entry in meta["properties"]["files"]:
                if file_entry.get("uri") == fname:
                    file_entry["uri"] = f"ipfs://{img_cid}"
        
        # Update rarity to tier model (Ember/Blaze/Genesis)
        old_rarity = meta.get("properties", {}).get("rarity", "")
        if old_rarity in ("common", "rare"):
            meta["properties"]["rarity"] = "ember"
            # Also update description
            meta["description"] = meta["description"].replace(old_rarity.capitalize(), "Ember")
        elif old_rarity == "epic":
            meta["properties"]["rarity"] = "blaze"
            meta["description"] = meta["description"].replace("Epic", "Blaze")
        elif old_rarity == "legendary":
            meta["properties"]["rarity"] = "genesis"
            meta["description"] = meta["description"].replace("Legendary", "Genesis")
        
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        updated += 1
    
    return updated

def main():
    print("🔥 RISE Phoenix — Lighthouse/IPFS Upload")
    print("=" * 50)
    
    # Verify directories exist
    if not IMAGES_DIR.exists():
        print(f"❌ Images directory not found: {IMAGES_DIR}")
        sys.exit(1)
    if not METADATA_DIR.exists():
        print(f"❌ Metadata directory not found: {METADATA_DIR}")
        sys.exit(1)
    
    img_count = len(list(IMAGES_DIR.glob("*.jpg")))
    meta_count = len(list(METADATA_DIR.glob("*.json")))
    print(f"📂 Images: {img_count} PNGs in {IMAGES_DIR}")
    print(f"📂 Metadata: {meta_count} JSONs in {METADATA_DIR}")
    
    # Step 1: Upload images
    image_cid_map = upload_directory(IMAGES_DIR, LIGHTHOUSE_API_KEY, "Images")
    
    if len(image_cid_map) != img_count:
        print(f"\n⚠️ Only {len(image_cid_map)}/{img_count} images uploaded. Check failures above.")
        print("Saving partial CID map...")
    
    # Step 2: Update metadata with ipfs:// image URIs + convert to 3-tier model
    print(f"\n📝 Updating metadata JSONs with IPFS URIs + 3-tier model (Ember/Blaze/Genesis)...")
    updated = update_metadata_uris(image_cid_map, METADATA_DIR)
    print(f"✅ {updated} metadata files updated")
    
    # Step 3: Upload updated metadata JSONs
    meta_cid_map = upload_directory(METADATA_DIR, LIGHTHOUSE_API_KEY, "Metadata")
    
    # Step 4: Save combined CID map
    combined = {
        "images": {k: v for k, v in sorted(image_cid_map.items())},
        "metadata": {k: v for k, v in sorted(meta_cid_map.items())},
        "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_images": len(image_cid_map),
        "total_metadata": len(meta_cid_map)
    }
    
    with open(CID_MAP_FILE, 'w') as f:
        json.dump(combined, f, indent=2)
    
    print(f"\n🔥 COMPLETE!")
    print(f"   Images uploaded: {len(image_cid_map)}/{img_count}")
    print(f"   Metadata uploaded: {len(meta_cid_map)}/{meta_count}")
    print(f"   CID map saved: {CID_MAP_FILE}")
    print(f"\n   Next: Use metadata CIDs as token_uri in the mint program")

if __name__ == "__main__":
    main()