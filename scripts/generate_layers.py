#!/usr/bin/env python3
"""
RISE Phoenix NFT Collection — Layer Art Generator
Generates transparent PNG layers for the compositor.
Style: Dark fantasy, detailed, 1024x1024
"""

import os
import json
import subprocess
import random

# === Trait Configuration ===
TRAITS = {
    "background": {
        "weight": 0,
        "variants": [
            {"name": "Void", "rarity": "common", "prompt": "pure black void with faint purple nebula wisps, dark fantasy background, no phoenix, transparent where phoenix goes"},
            {"name": "Inferno", "rarity": "common", "prompt": "raging hellfire background with lava cracks, dark fantasy, dramatic orange and red, no phoenix, transparent center"},
            {"name": "Storm", "rarity": "common", "prompt": "violent lightning storm with dark purple clouds, dark fantasy background, no phoenix, transparent center"},
            {"name": "Cosmos", "rarity": "rare", "prompt": "deep space cosmos with stars and galaxies, dark fantasy background, midnight blue, no phoenix, transparent center"},
            {"name": "Golden", "rarity": "rare", "prompt": "golden heavenly light rays breaking through darkness, dark fantasy background, no phoenix, transparent center"},
            {"name": "Blood", "rarity": "epic", "prompt": "blood red mystical fog with ancient runes floating, dark fantasy background, no phoenix, transparent center"},
            {"name": "Frost", "rarity": "epic", "prompt": "frozen wasteland with ice crystals and blue mist, dark fantasy background, no phoenix, transparent center"},
            {"name": "Eclipse", "rarity": "legendary", "prompt": "solar eclipse with corona flares and dark energy, dark fantasy background, spectacular, no phoenix, transparent center"},
        ]
    },
    "body": {
        "weight": 1,
        "variants": [
            {"name": "Classic", "rarity": "common", "prompt": "phoenix body elegant and regal, dark fantasy style, fiery feathers, transparent background, just the body no wings no background"},
            {"name": "Armored", "rarity": "common", "prompt": "phoenix body covered in ornate dark metal armor plates, dark fantasy style, transparent background, just the body no wings"},
            {"name": "Ethereal", "rarity": "rare", "prompt": "phoenix body made of translucent ghostly fire, ethereal and spectral, dark fantasy style, transparent background, just the body no wings"},
            {"name": "Shadow", "rarity": "rare", "prompt": "phoenix body made of living shadow and dark smoke, barely visible form, dark fantasy style, transparent background, just the body no wings"},
            {"name": "Crystal", "rarity": "epic", "prompt": "phoenix body made of molten crystal and gemstone, refracting light, dark fantasy style, transparent background, just the body no wings"},
            {"name": "Bone", "rarity": "epic", "prompt": "phoenix body as skeletal remains still burning with inner fire, dark fantasy style, transparent background, just the body no wings"},
            {"name": "Divine", "rarity": "legendary", "prompt": "phoenix body radiating divine golden light, holy fire, magnificent, dark fantasy style, transparent background, just the body no wings"},
        ]
    },
    "wings": {
        "weight": 2,
        "variants": [
            {"name": "Spread", "rarity": "common", "prompt": "phoenix wings spread wide and majestic, fire trailing from tips, dark fantasy style, transparent background, just the wings"},
            {"name": "Folded", "rarity": "common", "prompt": "phoenix wings folded close to body, smoldering embers, dark fantasy style, transparent background, just the wings"},
            {"name": "Torn", "rarity": "rare", "prompt": "battle-scarred phoenix wings with tears and fire leaking through, dark fantasy style, transparent background, just the wings"},
            {"name": "Molten", "rarity": "rare", "prompt": "phoenix wings dripping with molten lava and liquid fire, dark fantasy style, transparent background, just the wings"},
            {"name": "Spectral", "rarity": "epic", "prompt": "phoenix wings as ghostly transparent energy, phased out, dark fantasy style, transparent background, just the wings"},
            {"name": "Celestial", "rarity": "legendary", "prompt": "phoenix wings made of starlight and cosmic energy, galaxy patterns, dark fantasy style, transparent background, just the wings"},
        ]
    },
    "fire_color": {
        "weight": 3,
        "variants": [
            {"name": "Red", "rarity": "common", "prompt": "intense red fire and flames aura, dark fantasy style, transparent background, just fire effect overlay"},
            {"name": "Blue", "rarity": "common", "prompt": "cold blue spirit fire aura, dark fantasy style, transparent background, just fire effect overlay"},
            {"name": "Gold", "rarity": "rare", "prompt": "radiant golden divine fire aura, dark fantasy style, transparent background, just fire effect overlay"},
            {"name": "Purple", "rarity": "rare", "prompt": "mystical purple arcane fire aura, dark fantasy style, transparent background, just fire effect overlay"},
            {"name": "White", "rarity": "epic", "prompt": "pure white holy fire aura blinding light, dark fantasy style, transparent background, just fire effect overlay"},
            {"name": "Black", "rarity": "legendary", "prompt": "void black fire that consumes light itself, dark anti-flame, dark fantasy style, transparent background, just fire effect overlay"},
        ]
    },
    "eyes": {
        "weight": 4,
        "variants": [
            {"name": "Blazing", "rarity": "common", "prompt": "blazing fiery phoenix eyes, intense burning gaze, dark fantasy style, transparent background, just the eyes"},
            {"name": "Calm", "rarity": "common", "prompt": "calm ancient knowing phoenix eyes, wise and deep, dark fantasy style, transparent background, just the eyes"},
            {"name": "Fierce", "rarity": "rare", "prompt": "fierce predatory phoenix eyes, aggressive and powerful, dark fantasy style, transparent background, just the eyes"},
            {"name": "Ancient", "rarity": "rare", "prompt": "ancient phoenix eyes with galaxy patterns in iris, dark fantasy style, transparent background, just the eyes"},
            {"name": "Cosmic", "rarity": "epic", "prompt": "cosmic phoenix eyes containing miniature galaxies, dark fantasy style, transparent background, just the eyes"},
            {"name": "Void", "rarity": "legendary", "prompt": "void phoenix eyes pure black with white rim, terrifying, dark fantasy style, transparent background, just the eyes"},
        ]
    },
    "aura": {
        "weight": 5,
        "variants": [
            {"name": "None", "rarity": "common", "prompt": None},
            {"name": "Lightning", "rarity": "rare", "prompt": "crackling lightning aura around phoenix, energy discharge, dark fantasy style, transparent background, aura effect only"},
            {"name": "Smoke", "rarity": "common", "prompt": "dark swirling smoke aura around phoenix, mysterious, dark fantasy style, transparent background, aura effect only"},
            {"name": "Stardust", "rarity": "epic", "prompt": "sparkling stardust aura around phoenix, cosmic particles, dark fantasy style, transparent background, aura effect only"},
            {"name": "Blood", "rarity": "epic", "prompt": "dripping blood mist aura around phoenix, dark and threatening, dark fantasy style, transparent background, aura effect only"},
            {"name": "Halo", "rarity": "legendary", "prompt": "divine golden halo above phoenix, holy radiance, dark fantasy style, transparent background, aura effect only"},
        ]
    }
}

RARITY_WEIGHTS = {
    "common": 50,
    "rare": 30,
    "epic": 15,
    "legendary": 5
}

def weighted_choice(variants):
    """Pick a variant based on rarity weights"""
    choices = []
    weights = []
    for v in variants:
        choices.append(v)
        weights.append(RARITY_WEIGHTS.get(v["rarity"], 50))
    return random.choices(choices, weights=weights, k=1)[0]

def generate_unique_combo(traits, existing_combos):
    """Generate a unique trait combination"""
    max_attempts = 10000
    for _ in range(max_attempts):
        combo = {}
        for trait_name, trait_data in traits.items():
            combo[trait_name] = weighted_choice(trait_data["variants"])
        
        # Create hash key from variant names
        key = tuple((t, v["name"]) for t, v in combo.items())
        if key not in existing_combos:
            existing_combos.add(key)
            return combo
    
    raise Exception("Could not generate unique combo after 10000 attempts")

def main():
    COLLECTION_SIZE = 500
    OUTPUT_DIR = "/home/jack/newtheo/workspace-cyberdyne/rise-nft/art"
    LAYERS_DIR = os.path.join(OUTPUT_DIR, "layers")
    
    # Generate all 500 unique combinations
    existing = set()
    combos = []
    for i in range(COLLECTION_SIZE):
        combo = generate_unique_combo(TRAITS, existing)
        combo["_id"] = i + 1
        combos.append(combo)
    
    # Save combo manifest
    manifest = []
    for combo in combos:
        entry = {"id": combo["_id"]}
        for trait_name, variant in combo.items():
            if trait_name == "_id":
                continue
            entry[trait_name] = {
                "name": variant["name"],
                "rarity": variant["rarity"]
            }
        manifest.append(entry)
    
    with open(os.path.join(OUTPUT_DIR, "combo_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    
    # Count rarity distribution
    rarity_counts = {}
    for combo in combos:
        highest = "common"
        for trait_name, variant in combo.items():
            if trait_name == "_id":
                continue
            r = variant["rarity"]
            if r == "legendary" and highest != "legendary":
                highest = "legendary"
            elif r == "epic" and highest not in ("legendary", "epic"):
                highest = "epic"
            elif r == "rare" and highest == "common":
                highest = "rare"
        rarity_counts[highest] = rarity_counts.get(highest, 0) + 1
    
    # Save layer variant list for image generation
    all_variants = {}
    for trait_name, trait_data in TRAITS.items():
        all_variants[trait_name] = []
        for v in trait_data["variants"]:
            if v["prompt"] is not None:  # Skip "None" aura
                all_variants[trait_name].append({
                    "name": v["name"],
                    "rarity": v["rarity"],
                    "prompt": v["prompt"],
                    "filename": f"{trait_name}_{v['name'].lower().replace(' ', '_')}.png"
                })
    
    with open(os.path.join(OUTPUT_DIR, "layer_specs.json"), "w") as f:
        json.dump(all_variants, f, indent=2)
    
    print(f"✅ Generated {len(combos)} unique combinations")
    print(f"📊 Rarity distribution:")
    for r in ["common", "rare", "epic", "legendary"]:
        print(f"   {r}: {rarity_counts.get(r, 0)}")
    
    # Count unique layer images needed
    total_images = sum(len(v) for v in all_variants.values())
    print(f"🎨 Unique layer images to generate: {total_images}")
    
    for trait_name, variants in all_variants.items():
        print(f"   {trait_name}: {len(variants)} images")

if __name__ == "__main__":
    main()