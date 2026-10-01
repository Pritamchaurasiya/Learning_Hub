# LearningHub V15 — DSA Practice, AST & Sandbox Security Report (Phase 8)

**Generated:** 2026-09-28  
**Component:** `learninghub/django_backend/apps/problems` & `learninghub/src/pages/ProblemWorkspacePage.tsx`

---

## 1. Sandbox Isolation & Remote Code Execution Defense

The code execution service (`CodeSandboxService`) isolates student submissions across Python and JavaScript runtimes:

### Python Isolation
- Execution command: `[python, '-I', '-S', temp_path]` (Isolated mode: ignores `PYTHONPATH`, user site-packages, and user environment).
- Disallowed Modules: `os`, `sys`, `subprocess`, `socket`, `ctypes`, `builtins`, `importlib`, `pathlib`, `shutil`, `pty`, `threading`, `multiprocessing`.
- Disallowed Calls: `eval`, `exec`, `open`, `compile`, `breakpoint`, `globals`, `locals`.
- Disallowed Attributes: `__subclasses__`, `__globals__`, `__builtins__`, `__code__`, `__dict__`.

### Node.js Hardening
- Execution command: `['node', '--no-addons', '--disallow-code-generation-from-strings', temp_path]`.
- Static AST/Regex Analysis: Strict rejection if code contains imports or require calls for:
  `child_process`, `fs`, `net`, `http`, `https`, `process`, `vm`, `cluster`, `worker_threads`, `tls`, `dgram`, `dns`.
- Resource Bounds: Hard timeout enforced via `subprocess.Popen.communicate(timeout=2.0s)`, output capped at 20KB.

---

## 2. Accurate Output Verification

- Test case matching:
  Replaced loose substring matching (`expected_out in actual_out`) with exact token equality:
  ```python
  if actual_out == expected_out or actual_out.split() == expected_out.split():
      passed_cases += 1
  ```
  Guarantees whitespace variance tolerance without permitting false passes.

---

## 3. Algorithm Visualizer

- Interactive graphical visualizer for:
  - Bubble Sort, Merge Sort, Quick Sort.
  - Dijkstra & A* pathfinding grid.
  - Binary Search Tree insertion and balancing.
- Sliders for array size (5 to 50 items) and animation speed (10ms to 500ms).
