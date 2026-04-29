# 🔀 GIT & VERSION CONTROL MASTERY

## From Basics to Advanced Workflows

---

## 📋 TABLE OF CONTENTS

1. [Git Fundamentals](#-git-fundamentals)
2. [Branching Strategies](#-branching-strategies)
3. [Commit Best Practices](#-commit-best-practices)
4. [Advanced Git Commands](#-advanced-git-commands)
5. [Code Review](#-code-review)
6. [Merge vs Rebase](#-merge-vs-rebase)
7. [Git Hooks](#-git-hooks)
8. [Troubleshooting](#-troubleshooting)

---

## 📚 GIT FUNDAMENTALS

### The Three Trees

```
┌────────────────────────────────────────────────────────────┐
│                    Working Directory                        │
│                    (Your files)                             │
└───────────────────────────┬────────────────────────────────┘
                            │ git add
                            ▼
┌────────────────────────────────────────────────────────────┐
│                    Staging Area (Index)                     │
│                    (Next commit preview)                    │
└───────────────────────────┬────────────────────────────────┘
                            │ git commit
                            ▼
┌────────────────────────────────────────────────────────────┐
│                    Repository (HEAD)                        │
│                    (Commit history)                         │
└────────────────────────────────────────────────────────────┘
```

### Essential Commands

```bash
# Initialize
git init
git clone <url>

# Basic workflow
git status
git add <file>        # Stage specific file
git add .             # Stage all changes
git commit -m "msg"   # Commit staged changes
git push              # Push to remote

# Viewing history
git log               # Full history
git log --oneline     # Compact view
git log --graph       # Visual branch graph
git show <commit>     # Show commit details

# Undoing changes
git checkout -- <file>  # Discard working changes
git reset HEAD <file>   # Unstage file
git reset --soft HEAD~1 # Undo commit, keep changes staged
git reset --hard HEAD~1 # Undo commit, discard changes
```

---

## 🌿 BRANCHING STRATEGIES

### Git Flow

```
main ─────────●───────────────●─────────────────●────────────
              │               │                 │
              │   release/1.0 ◆─────◆           │
              │              /       \          │
develop ──────●─────●───────●─────────●─────────●────●───────
                    │       │                   │
                    │       │                   │
                  feature/A feature/B       feature/C

● = commit
◆ = release branch commit
```

### GitHub Flow (Simpler)

```
main ─────●─────●─────●─────●─────●─────●─────●─────
          │     ↑     │     ↑     │     ↑
          │     │     │     │     │     │
          └─●─●─┘     └─●─●─┘     └─●─●─┘
           feature    feature    feature

1. Create branch from main
2. Make commits
3. Open Pull Request
4. Review & merge
5. Delete branch
```

### Trunk-Based Development

```
main ─────●─────●─────●─────●─────●─────●─────●─────
          │     ↑     │     ↑
          │     │     │     │
          └─●──┘      └─●──┘
           short       short
           branch     branch
           (<1 day)   (<1 day)

- Very short-lived branches
- Feature flags for incomplete features
- Continuous integration
```

### Branch Naming Conventions

```bash
# Feature branches
feature/user-authentication
feature/payment-integration

# Bug fixes
fix/login-validation
bugfix/course-enrollment

# Hotfixes
hotfix/security-patch

# Releases
release/1.2.0

# Other
docs/api-documentation
refactor/database-queries
test/user-service-tests
```

---

## 📝 COMMIT BEST PRACTICES

### Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `style`    | Formatting (no code change) |
| `refactor` | Code restructuring          |
| `perf`     | Performance improvement     |
| `test`     | Adding tests                |
| `chore`    | Maintenance tasks           |
| `ci`       | CI/CD changes               |

### Examples

```bash
# Good commits
feat(auth): add JWT refresh token support
fix(payments): handle currency conversion edge case
docs(api): update course endpoints documentation
refactor(users): extract validation to separate module
perf(queries): add database index for enrollment lookup
test(gamification): add XP calculation unit tests

# With body
feat(courses): implement course search

- Add full-text search using PostgreSQL
- Support filtering by category and difficulty
- Add pagination to results

Closes #123

# Breaking change
feat(api)!: change response format to JSON:API

BREAKING CHANGE: API responses now follow JSON:API spec.
Previous format is no longer supported.
```

### Commit Rules

```
✅ DO:
- Use imperative mood ("Add feature" not "Added feature")
- Keep subject line under 50 characters
- Separate subject from body with blank line
- Reference issues/tickets
- Make atomic commits (one logical change)

❌ DON'T:
- "WIP"
- "Fix"
- "Updates"
- "Misc changes"
- Giant commits with unrelated changes
```

---

## 🔧 ADVANCED GIT COMMANDS

### Interactive Rebase

```bash
# Rebase last 3 commits interactively
git rebase -i HEAD~3

# Editor opens with:
pick abc123 First commit
pick def456 Second commit
pick ghi789 Third commit

# Commands:
# p, pick = use commit
# r, reword = use commit, edit message
# e, edit = use commit, stop for amending
# s, squash = meld into previous commit
# f, fixup = like squash, discard message
# d, drop = remove commit
```

### Cherry Pick

```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry-pick range
git cherry-pick A..B

# Cherry-pick without committing
git cherry-pick --no-commit <hash>
```

### Stash

```bash
# Save work in progress
git stash
git stash push -m "WIP: feature login"

# List stashes
git stash list

# Apply and keep stash
git stash apply stash@{0}

# Apply and remove stash
git stash pop

# Apply to different branch
git stash branch new-branch stash@{0}
```

### Bisect (Find Bug)

```bash
# Start bisect
git bisect start

# Mark current as bad
git bisect bad

# Mark known good commit
git bisect good <commit>

# Git checks out middle commit
# Test and mark as good or bad
git bisect good  # or
git bisect bad

# Repeat until Git finds the bad commit
# Reset when done
git bisect reset
```

### Reflog (Recovery)

```bash
# View all ref changes
git reflog

# Output:
# abc123 HEAD@{0}: commit: Add feature
# def456 HEAD@{1}: checkout: moving from main to feature
# ghi789 HEAD@{2}: reset: moving to HEAD~1

# Recover "lost" commit
git checkout HEAD@{2}
git branch recovered-work
```

---

## 👀 CODE REVIEW

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Tests pass locally
- [ ] Added/updated tests
- [ ] Documentation updated
- [ ] Follows code style

## Related Issues

Closes #123

## Screenshots (if UI change)

## Testing Instructions

1. Step 1
2. Step 2
```

### Review Guidelines

```
Reviewer Checklist:
✅ Code works as intended
✅ No obvious bugs
✅ Test coverage adequate
✅ No security vulnerabilities
✅ Follows project conventions
✅ Documentation updated
✅ No unnecessary complexity
✅ Error handling present
```

### Review Comments

````python
# ❌ Bad review comment
"This is wrong"

# ✅ Good review comment
"Consider using `get_or_create()` here instead of
separate `get()` and `create()` calls to avoid race
conditions. Example:
```python
user, created = User.objects.get_or_create(email=email)
```"
````

---

## 🔀 MERGE VS REBASE

### Merge

```
Before:
main:    A ─── B ─── C
              \
feature:       D ─── E

After merge:
main:    A ─── B ─── C ─── M
              \           /
feature:       D ─── E ───

+ Preserves complete history
+ Non-destructive
- Creates merge commits
- Messy history for large projects
```

### Rebase

```
Before:
main:    A ─── B ─── C
              \
feature:       D ─── E

After rebase:
main:    A ─── B ─── C
                      \
feature:               D' ─── E'

+ Linear history
+ Cleaner logs
- Rewrites history (danger!)
- Avoid on shared branches
```

### When to Use What

```
Use MERGE when:
- Working on shared branches
- Preserving exact history matters
- Pull requests

Use REBASE when:
- Updating feature branch with main
- Before opening PR (local branch)
- Squashing commits
- LINEAR HISTORY is preference

Golden Rule:
Never rebase public/shared branches!
```

### Workflow Example

```bash
# Update feature branch with latest main
git checkout feature/my-feature
git fetch origin
git rebase origin/main

# Resolve conflicts if any
# ... fix files ...
git add .
git rebase --continue

# Force push (because history changed)
git push --force-with-lease
```

---

## 🪝 GIT HOOKS

### Available Hooks

```
pre-commit       → Run before commit is created
prepare-commit-msg → Modify commit message template
commit-msg       → Validate commit message
post-commit      → Run after commit (notifications)
pre-push         → Run before push
pre-rebase       → Run before rebase
```

### Pre-commit Hook Example

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter
echo "Running linter..."
flake8 apps/
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Fix errors before committing."
    exit 1
fi

# Run tests
echo "Running tests..."
pytest apps/
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Fix tests before committing."
    exit 1
fi

echo "✅ Pre-commit checks passed!"
exit 0
```

### Using pre-commit Framework

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

# Install
pip install pre-commit
pre-commit install
```

---

## 🔧 TROUBLESHOOTING

### Common Problems

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo commit AND changes
git reset --hard HEAD~1

# Remove file from staging
git reset HEAD <file>

# Discard local changes to file
git checkout -- <file>

# Fix commit message
git commit --amend -m "New message"

# Add file to last commit
git add forgotten_file
git commit --amend --no-edit

# Undo a pushed commit (creates new commit)
git revert <commit>

# Remove untracked files
git clean -fd

# Force pull (discard local)
git fetch origin
git reset --hard origin/main
```

### Conflict Resolution

```bash
# View conflicts
git status

# In file:
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> feature-branch

# After resolving:
git add <resolved-file>
git commit
# or
git rebase --continue
```

### Recovering Lost Work

```bash
# Find lost commits
git reflog

# Recover specific commit
git checkout <hash>
git branch recovery-branch

# Recover deleted branch
git reflog | grep "branch-name"
git checkout -b branch-name <hash>
```

---

## 💎 GIT GOLDEN RULES

1. **Commit often** - Small, atomic commits
2. **Write good messages** - Future you will thank you
3. **Pull before push** - Avoid conflicts
4. **Never force push shared branches** - Breaks others' work
5. **Use branches** - Never commit directly to main
6. **Review before merge** - Code review is essential
7. **Keep main deployable** - Always working state

---

**SINGULARITY ENGINE v16.0**  
_"Git is a time machine. Learn to use it."_
