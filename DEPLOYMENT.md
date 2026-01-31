# Deployment Guide

## Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

### Steps:

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variable:
     - Key: `OPENAI_API_KEY`
     - Value: Your OpenAI API key
   - Click "Deploy"

3. **Done!** Your app will be live at `your-project.vercel.app`

## Deploy to Netlify

### Steps:

1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Environment Variables**: Add `OPENAI_API_KEY`

## Deploy to Other Platforms

### Requirements:

- Node.js 18+ runtime
- Environment variable: `OPENAI_API_KEY`
- Build command: `npm run build`
- Start command: `npm start`
- Port: 3000 (default)

## Environment Variables

Make sure to set these environment variables on your deployment platform:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Important Notes

### File Storage

The app stores temporary files in:

- `public/uploads/` - Uploaded images
- `public/generated/` - AI-generated images
- `public/final/` - Final merged images

**Note**: On serverless platforms like Vercel, the file system is ephemeral. Files will be deleted after each request. For production, consider:

- Using cloud storage (AWS S3, Cloudflare R2, etc.)
- Implementing a cleanup job
- Storing files temporarily and serving via CDN

### API Costs

Each image generation uses the OpenAI API, which incurs costs. Monitor your usage at [platform.openai.com](https://platform.openai.com).

### Rate Limiting

Consider implementing rate limiting to prevent abuse:

- Use Vercel Edge Config
- Implement IP-based throttling
- Add authentication

## Custom Domain

After deployment, you can add a custom domain in your hosting platform's settings.

## Monitoring

- **Vercel**: Built-in analytics and logs
- **Error Tracking**: Consider adding Sentry or similar
- **Performance**: Use Vercel Analytics or Google Analytics

## Troubleshooting

### Build Fails

- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility
- Verify environment variables are set

### API Errors

- Verify OpenAI API key is correct
- Check API quota and billing
- Review API error logs

### Image Upload Issues

- Check file size limits on your platform
- Verify MIME types are allowed
- Review server logs for errors
