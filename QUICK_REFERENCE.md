# Quick Reference Card

## 🎯 One-Minute Setup

```bash
# 1. Add API Key to .env.local
KIE_AI_API_KEY=your_key_here
KIE_AI_CALLBACK_URL=http://localhost:3000

# 2. Start
npm run dev

# 3. Open browser
http://localhost:3000

# 4. Upload image → Wait for Grok → Download result
```

## 📱 API Endpoints

```
POST /api/generate
├─ Request: FormData with image file
└─ Response: { jobId, taskId, message }

GET /api/callback?jobId=XXX
├─ Request: Query parameter
└─ Response: { status, generatedUrl, finalImageUrl }

POST /api/callback?jobId=XXX
├─ Request: Webhook from Kie.ai
└─ Response: { success, message }
```

## 🔧 Configuration

**Environment Variables** (`.env.local`):

```env
KIE_AI_API_KEY=...              # Required: Your Kie.ai API key
KIE_AI_CALLBACK_URL=...         # Required: Your domain/localhost
```

**Polling** (`components/ImageGenerator.tsx` line 28):

```typescript
}, 2000); // Check status every 2 seconds
```

**Prompt** (`app/api/generate/route.ts` line 55):

```typescript
const prompt = "your custom prompt";
```

## 📂 Key Files

| File                            | Purpose                  |
| ------------------------------- | ------------------------ |
| `app/api/generate/route.ts`     | Create Kie.ai task       |
| `app/api/callback/route.ts`     | Handle webhooks & status |
| `lib/jobStore.ts`               | Job state storage        |
| `components/ImageGenerator.tsx` | Polling & orchestration  |
| `.env.local`                    | API credentials          |
| `lib/imageProcessor.ts`         | Image merging            |

## 🚀 Deployment

### Local Dev

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

Update `.env.local`:

```env
KIE_AI_CALLBACK_URL=https://your-domain.com
```

## 🧪 Testing

### Test Generation

```
1. npm run dev
2. Upload image
3. Check browser console for job polling
4. Wait 10-30 seconds
5. View result
```

### Debug Polling

Open browser DevTools → Console
Should see job status updates every 2 seconds

### Test Callback

```bash
# Using curl to simulate Kie.ai callback
curl -X POST http://localhost:3000/api/callback?jobId=test-123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "output": {
      "image_url": "https://..."
    }
  }'
```

## 📊 Status Codes

| Status      | Meaning                   |
| ----------- | ------------------------- |
| `pending`   | Processing on Kie.ai      |
| `completed` | Done, image ready         |
| `error`     | Failed, check error field |

## 💾 Storage Locations

```
public/
├── uploads/     # Uploaded images
├── generated/   # Kie.ai results
└── final/       # Merged with background
```

## ⏱️ Typical Flow Times

| Step              | Time        |
| ----------------- | ----------- |
| Upload            | < 1 sec     |
| API call          | < 2 sec     |
| Kie.ai processing | 10-30 sec   |
| Image merge       | < 1 sec     |
| Display           | < 1 sec     |
| **Total**         | **~15 sec** |

## 🆘 Quick Fixes

| Problem          | Fix                                            |
| ---------------- | ---------------------------------------------- |
| "API key error"  | Check `.env.local`                             |
| "Job not found"  | Restart server (or use database in production) |
| "Callback fails" | Use ngrok for local: `ngrok http 3000`         |
| "Build fails"    | Run `npm install` then `npm run build`         |

## 📞 Useful Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build production
npm run build

# Start production
npm start

# Check for errors
npm run build

# Lint code
npm run lint

# Remove package
npm uninstall package-name

# Install package
npm install package-name
```

## 🎨 Customization Ideas

1. **Different Art Styles**: Modify prompt
2. **Custom Backgrounds**: Add `public/background.png`
3. **Database Storage**: Replace `lib/jobStore.ts`
4. **Authentication**: Add user login
5. **Image History**: Store URLs in database
6. **Rate Limiting**: Add per-user limits
7. **Web Sharing**: Implement share functionality

## 📚 Documentation Files

```
README.md              # Project overview
ARCHITECTURE.md        # How it works
KIE_AI_GUIDE.md       # API integration details
DEPLOYMENT.md         # Production setup
CHECKLIST.md          # Setup checklist
QUICKSTART.md         # Quick start
SETUP_COMPLETE.md     # Integration summary
```

## 🎯 Next Steps

1. ✅ Get Kie.ai API key
2. ✅ Configure `.env.local`
3. ✅ Run `npm run dev`
4. ✅ Test with an image
5. ✅ Customize prompt (optional)
6. ✅ Deploy to production

## 📝 Notes

- Uses Grok Imagine for image-to-image transformation
- Async job processing with polling
- Free Kie.ai credits available
- Production needs database for job storage
- Image merging done server-side with Sharp
- Support for custom backgrounds

---

**Everything is configured and ready! Just add your API key to `.env.local` and run `npm run dev`. 🚀**
