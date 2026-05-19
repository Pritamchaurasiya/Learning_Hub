# OpenCode CLI Setup Guide

**Status**: Installed (v1.14.28) ✅  
**Auth Status**: 0 providers configured ⚠️

---

## Current Status

```powershell
# Verify installation
opencode --version
# Output: 1.14.28

# Check auth status
opencode auth list
# Output: 0 credentials
```

---

## Step 1: Configure API Provider

### Option A: OpenAI (Recommended)

```powershell
opencode auth login
# Select: openai
# Enter API key: sk-...
```

### Option B: Anthropic (Claude)

```powershell
opencode auth login
# Select: anthropic
# Enter API key: sk-ant-...
```

### Option C: Google (Gemini)

```powershell
opencode auth login
# Select: gemini
# Enter API key: AIza...
```

### Option D: Ollama (Local)

```powershell
opencode auth login
# Select: ollama
# Enter base URL: http://localhost:11434
```

---

## Step 2: Available Commands

### Core Commands

```bash
opencode --help              # Show all commands
opencode auth list           # List configured providers
opencode auth login          # Add new provider
opencode auth logout         # Remove provider
```

### Agent Commands

```bash
opencode agent create        # Create custom agent
opencode agent list          # List all agents
```

### GitHub Integration

```bash
opencode github install      # Setup GitHub Actions
opencode github run          # Run GitHub agent
```

### Server Mode

```bash
opencode serve               # Start TUI mode
opencode web                 # Start web interface
opencode attach <url>        # Attach to remote
```

---

## Step 3: Environment Variables

Create `.env` file in project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Gemini
GEMINI_API_KEY=AIza...

# Ollama
OLLAMA_HOST=http://localhost:11434
```

---

## Step 4: Configuration File

Location: `%USERPROFILE%\.local\share\opencode\auth.json`

Example structure:

```json
{
  "openai": {
    "api_key": "sk-...",
    "base_url": "https://api.openai.com/v1"
  },
  "anthropic": {
    "api_key": "sk-ant-..."
  }
}
```

---

## Step 5: Usage Examples

### Start Interactive Mode

```bash
# Navigate to project
cd c:\Users\shiva\Desktop\windows_app\learninghub

# Start OpenCode TUI
opencode serve
```

### Run with Specific Model

```bash
opencode serve --model openai/gpt-4
opencode serve --model anthropic/claude-3-opus
opencode serve --model gemini/gemini-pro
```

### Web Interface

```bash
opencode web --port 3000
# Open: http://localhost:3000
```

---

## Troubleshooting

### Issue: "No credentials found"

**Solution**: Run `opencode auth login` and add at least one provider

### Issue: API key not working

**Solution**:

1. Verify key at provider's dashboard
2. Check key has necessary permissions
3. Ensure key is not expired

### Issue: Command not found

**Solution**:

```powershell
# Add to PATH
$env:PATH += ";$(npm config get prefix)\bin"
# Or restart terminal
```

---

## Recommended Provider Setup

1. **OpenAI** - Best for general coding tasks
   - Get API key: https://platform.openai.com/api-keys
   - Model: gpt-4, gpt-4-turbo, gpt-3.5-turbo

2. **Anthropic** - Best for complex reasoning
   - Get API key: https://console.anthropic.com/
   - Model: claude-3-opus, claude-3-sonnet

3. **Ollama** - Free local option
   - Download: https://ollama.ai/
   - Models: codellama, llama2, mistral

---

## Next Steps

1. ✅ Run `opencode auth login` to add provider
2. ✅ Test with `opencode serve` in project directory
3. ✅ Create custom agents with `opencode agent create`
4. ✅ Setup GitHub integration for CI/CD

---

## Quick Start

```powershell
# 1. Add provider (interactive)
opencode auth login

# 2. Start TUI in project
cd c:\Users\shiva\Desktop\windows_app\learninghub
opencode serve

# 3. Or start web interface
opencode web --port 3000
```

**Status**: Ready to use after provider configuration! 🚀
