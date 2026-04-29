import os

def check_encoding(path):
    for root, dirs, files in os.walk(path):
        if 'venv' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(('.py', '.html', '.css', '.js', '.txt', '.md')):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        f.read()
                except UnicodeDecodeError:
                    print(f"Non-UTF8 file found: {full_path}")

if __name__ == "__main__":
    print("Scanning for non-UTF8 files...")
    check_encoding('.')
