#!/usr/bin/env python3
"""
RISE Phoenix NFT Collection — Image Variation Generator
Takes ~5 base phoenix images and creates 500 unique variations using:
- Color tinting (fire colors: red, blue, gold, purple, white, black)
- Background overlays (void, inferno, storm, cosmos, golden, blood, frost, eclipse)
- Aura effects (lightning, smoke, stardust, blood, halo)
- Eye glow effects
- Brightness/contrast shifts
- Subtle rotation and scale variation
"""

import os
import json
import random
import math
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw

# Paths
BASE_DIR = "/home/jack/newtheo/workspace-cyberdyne/rise-nft/art/bases"
OUTPUT_DIR = "/home/jack/newtheo/workspace-cyberdyne/rise-nft/art/composites"
MANIFEST_PATH = "/home/jack/newtheo/workspace-cyberdyne/rise-nft/art/combo_manifest.json"
METADATA_DIR = "/home/jack/newtheo/workspace-cyberdyne/rise-nft/art/metadata"

SIZE = (1024, 1024)
COLLECTION_NAME = "RISE Phoenix"
COLLECTION_SYMBOL = "RISE"

# Trait definitions (must match generate_layers.py)
BACKGROUNDS = ["Void", "Inferno", "Storm", "Cosmos", "Golden", "Blood", "Frost", "Eclipse"]
BODIES = ["Classic", "Armored", "Ethereal", "Shadow", "Crystal", "Bone", "Divine"]
WINGS = ["Spread", "Folded", "Torn", "Molten", "Spectral", "Celestial"]
FIRE_COLORS = ["Red", "Blue", "Gold", "Purple", "White", "Black"]
EYES = ["Blazing", "Calm", "Fierce", "Ancient", "Cosmic", "Void"]
AURAS = ["None", "Lightning", "Smoke", "Stardust", "Blood", "Halo"]

RARITY_MAP = {
    "Void": "common", "Inferno": "common", "Storm": "common",
    "Cosmos": "rare", "Golden": "rare", "Blood": "epic", "Frost": "epic", "Eclipse": "legendary",
    "Classic": "common", "Armored": "common", "Ethereal": "rare", "Shadow": "rare",
    "Crystal": "epic", "Bone": "epic", "Divine": "legendary",
    "Spread": "common", "Folded": "common", "Torn": "rare", "Molten": "rare",
    "Spectral": "epic", "Celestial": "legendary",
    "Red": "common", "Blue": "common", "Gold": "rare", "Purple": "rare",
    "White": "epic", "Black": "legendary",
    "Blazing": "common", "Calm": "common", "Fierce": "rare", "Ancient": "rare",
    "Cosmic": "epic", "Void": "legendary",
    "None": "common", "Lightning": "rare", "Smoke": "common",
    "Stardust": "epic", "Blood": "epic", "Halo": "legendary",
}

# Color tint maps for fire colors
FIRE_TINTS = {
    "Red": (1.0, 0.2, 0.1),      # strong red
    "Blue": (0.1, 0.3, 1.0),     # cool blue
    "Gold": (1.0, 0.85, 0.2),    # warm gold
    "Purple": (0.6, 0.15, 0.9),  # arcane purple
    "White": (0.95, 0.95, 1.0),  # near-white
    "Black": (0.05, 0.05, 0.05), # near-black
}

# Background colors (dark, moody)
BG_COLORS = {
    "Void": (5, 0, 15),
    "Inferno": (40, 8, 0),
    "Storm": (15, 5, 30),
    "Cosmos": (0, 5, 40),
    "Golden": (35, 25, 0),
    "Blood": (30, 0, 0),
    "Frost": (0, 15, 30),
    "Eclipse": (8, 0, 20),
}

# Aura overlay parameters
AURA_PARAMS = {
    "None": None,
    "Lightning": {"color": (100, 150, 255), "alpha": 40, "pattern": "electric"},
    "Smoke": {"color": (80, 80, 80), "alpha": 30, "pattern": "swirl"},
    "Stardust": {"color": (255, 255, 200), "alpha": 50, "pattern": "sparkle"},
    "Blood": {"color": (180, 0, 0), "alpha": 35, "pattern": "drip"},
    "Halo": {"color": (255, 215, 0), "alpha": 60, "pattern": "ring"},
}

# Eye glow colors
EYE_COLORS = {
    "Blazing": (255, 100, 0, 200),
    "Calm": (200, 200, 255, 150),
    "Fierce": (255, 0, 0, 220),
    "Ancient": (100, 50, 200, 180),
    "Cosmic": (50, 100, 255, 200),
    "Void": (0, 0, 0, 240),
}

def apply_color_tint(img, tint_color, intensity=0.3):
    """Apply a color tint overlay to the image"""
    overlay = Image.new("RGBA", img.size, (int(tint_color[0]*255), int(tint_color[1]*255), int(tint_color[2]*255), int(255 * intensity)))
    result = img.convert("RGBA")
    result = Image.alpha_composite(result, overlay)
    return result

def apply_background(img, bg_name):
    """Replace black background with themed background"""
    bg_color = BG_COLORS.get(bg_name, (5, 0, 15))
    
    # Create gradient background
    bg = Image.new("RGBA", SIZE, bg_color)
    
    # Add radial gradient for depth
    draw = ImageDraw.Draw(bg)
    cx, cy = SIZE[0]//2, SIZE[1]//2
    
    # Simple radial gradient
    for r in range(max(SIZE), 0, -2):
        alpha = int(20 * (r / max(SIZE)))
        factor = 1.0 - (r / max(SIZE))
        c = tuple(min(255, int(bg_color[i] + bg_color[i] * factor * 3)) for i in range(3))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(*c, alpha))
    
    # Composite phoenix over background
    phoenix = img.convert("RGBA")
    
    # Simple approach: phoenix on black → extract bright pixels → overlay on bg
    result = bg.copy()
    pixels_phoenix = phoenix.load()
    pixels_bg = bg.load()
    pixels_result = result.load()
    
    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            pr, pg, pb, pa = pixels_phoenix[x, y]
            brightness = (pr + pg + pb) / 3
            if brightness > 20:  # Not pure black background
                # Blend based on brightness
                blend = min(1.0, brightness / 100)
                br, bg_c, bb, ba = pixels_bg[x, y]
                nr = int(pr * blend + br * (1 - blend))
                ng = int(pg * blend + bg_c * (1 - blend))
                nb = int(pb * blend + bb * (1 - blend))
                pixels_result[x, y] = (nr, ng, nb, 255)
            else:
                pixels_result[x, y] = pixels_bg[x, y]
    
    return result

def apply_aura(img, aura_name):
    """Add aura effect overlay"""
    params = AURA_PARAMS.get(aura_name)
    if params is None:
        return img
    
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = SIZE[0]//2, SIZE[1]//2
    
    if params["pattern"] == "ring":
        # Halo ring
        for r in range(200, 180, -1):
            alpha = int(params["alpha"] * (1 - abs(r - 190) / 20))
            draw.ellipse([cx-r, cy-280-r//3, cx+r, cy-280+r//3], 
                         fill=(*params["color"], alpha))
    elif params["pattern"] == "sparkle":
        # Random sparkles
        random.seed(hash(aura_name))
        for _ in range(50):
            sx = random.randint(cx-300, cx+300)
            sy = random.randint(cy-300, cy+300)
            s = random.randint(1, 4)
            draw.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(*params["color"], params["alpha"]))
    elif params["pattern"] == "electric":
        # Lightning streaks
        random.seed(hash(aura_name))
        for _ in range(8):
            points = [(cx + random.randint(-250, 250), cy + random.randint(-250, 250))]
            for _ in range(5):
                last = points[-1]
                points.append((last[0] + random.randint(-60, 60), last[1] + random.randint(-60, 60)))
            for i in range(len(points)-1):
                draw.line([points[i], points[i+1]], fill=(*params["color"], params["alpha"]), width=2)
    elif params["pattern"] == "swirl":
        # Smoke swirls
        random.seed(hash(aura_name))
        for _ in range(12):
            sx = cx + random.randint(-200, 200)
            sy = cy + random.randint(-200, 200)
            r = random.randint(20, 60)
            for dr in range(r, 0, -3):
                alpha = int(params["alpha"] * dr / r)
                draw.ellipse([sx-dr, sy-dr, sx+dr, sy+dr], fill=(*params["color"], alpha))
    elif params["pattern"] == "drip":
        # Blood drips
        random.seed(hash(aura_name))
        for _ in range(15):
            sx = cx + random.randint(-250, 250)
            sy = cy - random.randint(50, 200)
            h = random.randint(40, 120)
            w = random.randint(3, 8)
            draw.rectangle([sx, sy, sx+w, sy+h], fill=(*params["color"], params["alpha"]))
    
    result = img.convert("RGBA")
    result = Image.alpha_composite(result, overlay)
    return result

def apply_eye_glow(img, eye_name):
    """Add eye glow dots"""
    eye_color = EYE_COLORS.get(eye_name, (255, 100, 0, 200))
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Phoenix eyes roughly at these positions (varies by base)
    cx, cy = SIZE[0]//2, SIZE[1]//2 - 50
    eye_offset = 30
    
    # Left eye
    draw.ellipse([cx-eye_offset-8, cy-8, cx-eye_offset+8, cy+8], fill=eye_color)
    # Right eye  
    draw.ellipse([cx+eye_offset-8, cy-8, cx+eye_offset+8, cy+8], fill=eye_color)
    
    # Glow effect
    glow_color = (eye_color[0], eye_color[1], eye_color[2], 40)
    draw.ellipse([cx-eye_offset-20, cy-20, cx-eye_offset+20, cy+20], fill=glow_color)
    draw.ellipse([cx+eye_offset-20, cy-20, cx+eye_offset+20, cy+20], fill=glow_color)
    
    result = img.convert("RGBA")
    result = Image.alpha_composite(result, overlay)
    return result

def apply_fire_color(img, fire_name, base_index):
    """Apply fire color tint - different intensity per base for variety"""
    tint = FIRE_TINTS.get(fire_name, (1.0, 0.2, 0.1))
    intensity = 0.15 + (base_index % 5) * 0.05  # 0.15-0.35 range
    return apply_color_tint(img, tint, intensity)

def apply_variation(img, base_index, variant_index):
    """Apply subtle variations for uniqueness"""
    # Slight brightness variation
    bright_factor = 0.9 + (variant_index % 20) * 0.01
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(bright_factor)
    
    # Slight contrast variation
    cont_factor = 0.95 + (variant_index % 15) * 0.01
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(cont_factor)
    
    # Slight color saturation variation
    sat_factor = 0.85 + (variant_index % 20) * 0.015
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(sat_factor)
    
    # Slight blur/sharpen for texture variety
    if variant_index % 7 == 0:
        img = img.filter(ImageFilter.SMOOTH)
    elif variant_index % 7 == 3:
        img = img.filter(ImageFilter.SHARPEN)
    
    return img

def determine_overall_rarity(traits):
    """Determine overall rarity tier"""
    highest = "common"
    rarity_order = {"common": 0, "rare": 1, "epic": 2, "legendary": 3}
    for trait_name, value in traits.items():
        r = RARITY_MAP.get(value, "common")
        if rarity_order.get(r, 0) > rarity_order.get(highest, 0):
            highest = r
    return highest

def generate_metadata(token_id, traits, overall_rarity):
    """Generate metadata JSON for a token"""
    attributes = []
    for trait_name, value in traits.items():
        if value != "None":
            attributes.append({
                "trait_type": trait_name.replace("_", " ").title(),
                "value": value
            })
    
    return {
        "name": f"RISE Phoenix #{token_id}",
        "symbol": COLLECTION_SYMBOL,
        "description": f"A {overall_rarity} RISE Phoenix — 500 unique dark fantasy phoenixes rising from the flames on X1 Network.",
        "image": f"https://rise-phoenix.vercel.app/images/{token_id}.png",
        "attributes": attributes,
        "properties": {
            "category": "image",
            "rarity": overall_rarity,
            "files": [{"uri": f"{token_id}.png", "type": "image/png"}]
        }
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(METADATA_DIR, exist_ok=True)
    
    # Load manifest
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)
    
    # Load base images
    base_files = sorted([f for f in os.listdir(BASE_DIR) if f.endswith(('.jpg', '.png'))])
    if not base_files:
        print("❌ No base images found in", BASE_DIR)
        return
    
    bases = []
    for bf in base_files:
        img = Image.open(os.path.join(BASE_DIR, bf)).convert("RGBA").resize(SIZE)
        bases.append(img)
    
    print(f"📸 Loaded {len(bases)} base images")
    print(f"🎯 Generating {len(manifest)} unique phoenixes...")
    
    for entry in manifest:
        token_id = entry["id"]
        traits = {k: v["name"] for k, v in entry.items() if k != "id"}
        
        # Pick base image (deterministic based on body type)
        body = traits.get("body", "Classic")
        body_names = BODIES
        if body in body_names:
            base_idx = body_names.index(body) % len(bases)
        else:
            base_idx = token_id % len(bases)
        
        img = bases[base_idx].copy()
        
        # Apply transformations in order
        # 1. Background replacement
        bg_name = traits.get("background", "Void")
        img = apply_background(img, bg_name)
        
        # 2. Fire color tint
        fire_name = traits.get("fire_color", "Red")
        img = apply_fire_color(img, fire_name, base_idx)
        
        # 3. Aura effect
        aura_name = traits.get("aura", "None")
        img = apply_aura(img, aura_name)
        
        # 4. Eye glow
        eye_name = traits.get("eyes", "Blazing")
        img = apply_eye_glow(img, eye_name)
        
        # 5. Individual variation
        img = apply_variation(img, base_idx, token_id)
        
        # Convert to RGB for saving
        img = img.convert("RGB")
        
        # Save composite image
        img.save(os.path.join(OUTPUT_DIR, f"{token_id}.png"), "PNG", optimize=True)
        
        # Generate and save metadata
        overall_rarity = determine_overall_rarity(traits)
        metadata = generate_metadata(token_id, traits, overall_rarity)
        with open(os.path.join(METADATA_DIR, f"{token_id}.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        if token_id % 50 == 0:
            print(f"  ✅ {token_id}/{len(manifest)} generated")
    
    print(f"\n🎉 Done! {len(manifest)} unique RISE Phoenix NFTs generated")
    print(f"   Images: {OUTPUT_DIR}/")
    print(f"   Metadata: {METADATA_DIR}/")

if __name__ == "__main__":
    main()