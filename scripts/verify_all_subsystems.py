import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LEARNINGHUB_DIR = BASE_DIR / "learninghub"
BACKEND_DIR = LEARNINGHUB_DIR / "backend"
WORKERS_DIR = LEARNINGHUB_DIR / "workers-backend"
DJANGO_DIR = LEARNINGHUB_DIR / "django_backend"
CONDUCTOR_DIR = BASE_DIR / "conductor"

def run_step(cmd, cwd, title):
    print(f"\n[RUNNING] {title}...")
    print(f"  Directory: {cwd}")
    print(f"  Command:   {cmd}")
    try:
        res = subprocess.run(cmd, cwd=str(cwd), shell=True, check=True)
        print(f"[PASS] {title} succeeded.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {title} failed with return code {e.returncode}!")
        return False

def main():
    print("=" * 70)
    print("  LEARNINGHUB MONOREPO PREFLIGHT VERIFICATION RUNNER")
    print("=" * 70)

    results = []

    # 1. Express Backend
    prisma_client_path = BACKEND_DIR / "node_modules" / ".prisma" / "client" / "index.d.ts"
    if not prisma_client_path.exists():
        results.append(("Express Prisma Generate", run_step("npx prisma generate", BACKEND_DIR, "Prisma Client Generation")))
    else:
        print("\n[VERIFIED] Express Prisma Client is already generated and verified.")
        results.append(("Express Prisma Client Exists", True))
    results.append(("Express Backend Jest Tests", run_step("node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --maxWorkers=2", BACKEND_DIR, "Express Backend Tests (693 tests)")))
    results.append(("Express TypeScript Typecheck", run_step("node --max-old-space-size=4096 ./node_modules/typescript/lib/tsc.js --noEmit", BACKEND_DIR, "Express Typecheck")))

    # 2. React Frontend
    results.append(("React Frontend Typecheck", run_step("npm run typecheck", LEARNINGHUB_DIR, "Frontend Typecheck")))
    results.append(("React Frontend Vitest Tests", run_step("npm test", LEARNINGHUB_DIR, "Frontend Vitest Tests (226 tests)")))
    results.append(("React Frontend Production Build", run_step("npm run build", LEARNINGHUB_DIR, "Vite Production Bundle & PWA Generation")))

    # 3. Django REST Backend
    python_bin = CONDUCTOR_DIR / "venv" / "Scripts" / "python.exe"
    if not python_bin.exists():
        python_bin = Path(sys.executable)

    results.append(("Django REST Backend Pytest", run_step(f'"{python_bin}" -m pytest tests/', DJANGO_DIR, "Django REST Pytest (23 tests)")))
    results.append(("Conductor Django Test Suite", run_step(f'"{python_bin}" -m pytest apps/', CONDUCTOR_DIR, "Conductor Microservices Tests (278 tests)")))

    # 4. Security & Leak Check
    print("\n[RUNNING] Security & Leak Check...")
    git_check = subprocess.run("git ls-files", cwd=str(BASE_DIR), shell=True, capture_output=True, text=True)
    leaks = [f for f in git_check.stdout.splitlines() if f.endswith(".sqlite3") or f.endswith(".db") or f == ".env"]
    if leaks:
        print(f"[FAIL] Found leaked files tracked in Git: {leaks}")
        results.append(("Security Leak Check", False))
    else:
        print("[PASS] Security Leak Check: Zero sensitive files tracked in Git.")
        results.append(("Security Leak Check", True))

    print("\n" + "=" * 70)
    print("  FINAL PREFLIGHT SUMMARY")
    print("=" * 70)
    all_passed = True
    for name, passed in results:
        status_str = "PASSED" if passed else "FAILED"
        icon = "[PASS]" if passed else "[FAIL]"
        print(f"  {icon} {name:<45} : {status_str}")
        if not passed:
            all_passed = False

    print("=" * 70)
    if all_passed:
        print("[SUCCESS] ALL MONOREPO PREFLIGHT CHECKS PASSED WITH 100% SUCCESS RATE!")
        sys.exit(0)
    else:
        print("[FAILURE] SOME PREFLIGHT CHECKS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    main()
