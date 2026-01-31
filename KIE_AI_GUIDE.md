# Kie.ai Integration Guide

Your Arcane AI Image Generator now uses **xAI's Grok Imagine** through **Kie.ai** API!

## Setup Instructions

### 1. Get Your Kie.ai API Key

1. Visit [kie.ai](https://kie.ai)
2. Sign up or log in to your account
3. Navigate to API Settings
4. Copy your API key

### 2. Configure Environment Variables

Edit `.env.local` and add:

```env
KIE_AI_API_KEY=your_kie_ai_api_key_here
KIE_AI_CALLBACK_URL=http://localhost:3000
```

For production deployment, update `KIE_AI_CALLBACK_URL` to your actual domain:

```env
KIE_AI_CALLBACK_URL=https://your-domain.com
```

### 3. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Flow Diagram

```
1. User uploads image
   ↓
2. Image extracted and processed
   ↓
3. Create text-to-image task in Kie.ai (Grok Imagine)
   ↓
4. Returns taskId and waits for callback
   ↓
5. Frontend polls /api/callback?jobId=XXX every 2 seconds
   ↓
6. When Kie.ai completes, sends POST to /api/callback
   ↓
7. Generated image merged with background
   ↓
8. Final image displayed to user
```

## Key Features

✨ **Text-to-Image**: Uses Kie.ai's text-to-image model for Arcane-style generation

🖼️ **Custom Prompt**: Transforms the user's image intent into an Arcane illustration

## API Integration

### Generate Endpoint

- **URL**: `/api/generate`
- **Method**: `POST`
- **Body**: FormData with image file
- **Response**:
  ```json
  {
    "success": true,
    "jobId": "job-1234567890-abc123",
    "taskId": "task-id-from-kie",
    "message": "Image generation task created..."
  }
  ```

### Callback/Status Endpoint

- **URL**: `/api/callback?jobId=XXX`
- **GET Method**: Check job status
- **POST Method**: Receive callback from Kie.ai
- **Response**:
  ```json
  {
    "success": true,
    "jobId": "job-1234567890-abc123",
    "status": "completed|pending|error",
    "generatedUrl": "/generated/generated-1234567890.png",
    "finalImageUrl": "/final/final-1234567890.png",
    "error": null
  }
  ```

## Development vs Production

### Development

- In-memory job storage (Map data structure)
- Polling every 2 seconds
- Jobs lost on server restart

### Production Recommendations

- Use a database (MongoDB, PostgreSQL, etc.) for job storage
- Use callbacks instead of polling (webhooks from Kie.ai)
- Add authentication for callback endpoint
- Implement timeout handling for long-running jobs
- Monitor task processing

## Customizing the Prompt

Edit the prompt in `app/api/generate/route.ts` (line 55):

```typescript
const prompt = "your custom prompt here";
```

Example prompts:

- `"Transform into a superhero with glowing effects"`
- `"Make it a cyberpunk character with neon lights"`
- `"Reimagine as a fantasy character from a RPG game"`

## Troubleshooting

### "Failed to start image generation task"

- Verify `KIE_AI_API_KEY` is set correctly in `.env.local`
- Check Kie.ai API status
- Review API error in browser console

### "Job not found" error

- Job may have expired (cleanup happens after ~24 hours)
- Server was restarted (in-memory storage lost)
- Callback URL might be inaccessible from Kie.ai

### Generation takes too long

- Kie.ai service may be busy
- Increase polling timeout (edit interval in ImageGenerator.tsx)
- Check Kie.ai queue status

### Callback never arrives

- Ensure `KIE_AI_CALLBACK_URL` is publicly accessible
- For local dev, use ngrok to expose localhost:
  ```bash
  ngrok http 3000
  # Then set KIE_AI_CALLBACK_URL=https://your-ngrok-url.ngrok.io
  ```

## Monitoring

Monitor job processing in the browser console:

- Pending status shows every 2 seconds
- Completed when image is ready
- Error details if something fails

## Free Credits

Kie.ai offers free credits for image generation! Check your account dashboard for current balance.

## Next Steps

1. Test with a sample image
2. Customize the prompt for your use case
3. Prepare for production deployment
4. Set up database for persistent job storage
5. Implement error handling and retry logic
