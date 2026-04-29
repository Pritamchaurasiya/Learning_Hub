
import os
import re

def fix_deprecation(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Debug find
    if 'withOpacity' in content:
        print(f"File has withOpacity: {os.path.basename(file_path)}")

    new_content = re.sub(
        r'\.withOpacity\(([^)]+)\)',
        r'.withValues(alpha: \1)',
        content
    )

    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed: {file_path}")
        return 1
    elif 'withOpacity' in content:
        print(f"Failed to fix: {file_path} - Regex mismatch?")
    
    return 0

def main():
    root_dir = r"c:\Users\shiva\Desktop\windows_app\my_flutter_app\lib"
    print(f"Scanning directory: {root_dir}")
    count = 0
    scanned = 0
    for subdir, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".dart"):
                scanned += 1
                try:
                    count += fix_deprecation(os.path.join(subdir, file))
                except Exception as e:
                    print(f"Error reading {file}: {e}")
    
    print(f"Total dart files scanned: {scanned}")
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
