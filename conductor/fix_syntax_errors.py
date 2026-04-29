#!/usr/bin/env python
"""
SYNTAX ERROR FIXER
Fix the 4 syntax errors identified in Phase 1
"""

import os
import sys
from pathlib import Path

print("=" * 80)
print("SYNTAX ERROR FIXER")
print("=" * 80)

BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

# Files with syntax errors to fix
files_to_fix = [
    'optimize_system.py',
    'apps/ai_engine/adaptive_learning_engine_v2.py',
    'apps/ai_engine/advanced_caching.py',
    'apps/dsa/ai_services.py'
]

fixed_count = 0
error_count = 0

for filepath_str in files_to_fix:
    filepath = BASE_DIR / filepath_str
    
    if not filepath.exists():
        print(f"[SKIP] File not found: {filepath_str}")
        continue
    
    print(f"\n[FIXING] {filepath_str}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Fix 1: Remove docstrings that look like code (lines starting with **)
        lines = content.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            # Skip lines that are just docstring markers with **
            stripped = line.strip()
            
            # Fix lines like: **Automated optimization...**
            if stripped.startswith('**') and stripped.endswith('**') and i < 5:
                # Convert to proper docstring
                fixed_lines.append(f'"""{stripped[2:-2].strip()}"""')
                print(f"  [FIXED] Line {i+1}: Converted **docstring** to proper format")
            else:
                fixed_lines.append(line)
        
        # Fix 2: Fix common indentation issues at line 354 in ai_services.py
        if 'ai_services.py' in filepath_str:
            # Check for mixed tabs and spaces
            content_fixed = '\n'.join(fixed_lines)
            # Replace tabs with 4 spaces
            content_fixed = content_fixed.replace('\t', '    ')
            fixed_lines = content_fixed.split('\n')
            print(f"  [FIXED] Replaced tabs with spaces")
        
        # Write fixed content back
        new_content = '\n'.join(fixed_lines)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  [OK] File fixed and saved")
            fixed_count += 1
        else:
            print(f"  [OK] No changes needed")
            
    except Exception as e:
        print(f"  [ERROR] Failed to fix {filepath_str}: {e}")
        error_count += 1

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"[RESULT] Files fixed: {fixed_count}")
print(f"[RESULT] Errors: {error_count}")
print("[DONE] Syntax error fixing complete")
print("=" * 80 + "\n")
