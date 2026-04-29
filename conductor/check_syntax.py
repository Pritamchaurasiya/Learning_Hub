import os
import py_compile

def check_syntax(start_path):
    print(f"Checking syntax in {start_path}...")
    error_count = 0
    for root, dirs, files in os.walk(start_path):
        if 'venv' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(".py"):
                full_path = os.path.join(root, file)
                try:
                    py_compile.compile(full_path, doraise=True)
                except py_compile.PyCompileError as e:
                    print(f"Syntax Error in {full_path}:")
                    print(e)
                    error_count += 1
                except Exception as e:
                    print(f"Error checking {full_path}: {e}")
                    error_count += 1
    
    if error_count == 0:
        print("No syntax errors found.")
    else:
        print(f"Found {error_count} files with syntax errors.")

if __name__ == "__main__":
    check_syntax(".")
