# OpenRouter API Setup Guide

## Problem
Your app needs a valid OpenRouter API key to generate AI images. Error: `User not found (401)`

## Solution: Get a Valid OpenRouter API Key

### Step 1: Create OpenRouter Account
1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Click **"Sign Up"** or **"Login"**
3. Create account with email/GitHub

### Step 2: Generate API Key
1. After logging in, go to **Dashboard** → **[Keys](https://openrouter.ai/keys)**
2. Click **"Create Key"**
3. Give it a name (e.g., "AI Image Generator")
4. Copy the key (starts with `sk-or-v1-...`)

### Step 3: Add to .env.local
```bash
# .env.local
OPENROUTER_API_KEY=sk-or-v1-your_actual_key_here
NODE_ENV=development
```

**Important:**
- ❌ Never commit `.env.local` to git
- ✅ Only `.env.example` should be in git
- ✅ Set variables in production via Railway/EC2 dashboard

### Step 4: Test
1. Restart dev server: `npm run dev`
2. Try uploading an image
3. Check console logs for `✓ OpenRouter API key found`

## Alternative: Other AI Providers

If OpenRouter doesn't work, you can use:

### Option A: OpenAI (DALL-E 3)
```bash
npm install openai
OPENAI_API_KEY=sk-proj-your-key
```

### Option B: Replicate (Stable Diffusion)
```bash
npm install replicate
REPLICATE_API_TOKEN=your-token
```

### Option C: Hugging Face
```bash
HF_API_TOKEN=your-token
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `User not found (401)` | API key is invalid. Get a new one from openrouter.ai/keys |
| `OPENROUTER_API_KEY not configured` | Add `OPENROUTER_API_KEY` to `.env.local` |
| `Failed to fetch` | Check internet connection, OpenRouter might be down |
| `Rate limited` | You've hit OpenRouter's rate limit, wait a bit |

## Production Deployment

### Railway
1. Go to Railway Dashboard → Your Project
2. Settings → Variables
3. Add: `OPENROUTER_API_KEY=your_key_here`
4. Deploy

### AWS EC2
```bash
# Add to systemd service or docker-compose
export OPENROUTER_API_KEY="your_key_here"
```

### Vercel
1. Dashboard → Settings → Environment Variables
2. Add `OPENROUTER_API_KEY`
3. Redeploy

## Security Notes
- ✅ Store keys in `.env.local` (git-ignored)
- ✅ Use service role keys for backend
- ✅ Never log full API keys
- ❌ Never commit `.env` files
- ❌ Never share keys in chat/PR/issues
