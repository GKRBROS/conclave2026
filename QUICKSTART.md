# Quick Start Guide

## Step 1: Configure Your API Key

1. Open the `.env.local` file
2. Replace `your_openai_api_key_here` with your actual OpenAI API key
3. Get your API key from: https://platform.openai.com/api-keys

## Step 2: Run the Development Server

```bash
npm run dev
```

## Step 3: Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Step 4: Upload and Transform

1. Upload an image (drag-and-drop or click to browse)
2. Wait for the AI to generate your Arcane-style transformation
3. Preview, download, or share your transformed image!

## Important Notes

- **API Key Required**: The OpenAI API key must be configured in `.env.local`
- **Image Size**: Maximum upload size is 10MB
- **Supported Formats**: JPG, PNG, WebP
- **Output**: Final images are saved as PNG files

## Customization

### Change Background

Place a custom `background.png` file in the `public` folder to use your own background instead of the default purple gradient.

### Modify Prompt

Edit the prompt in `app/api/generate/route.ts` (line 42) to change the AI transformation style.

## Troubleshooting

- **"No image provided" error**: Make sure you're uploading a valid image file
- **API errors**: Verify your OpenAI API key is correct and has credits
- **Build errors**: Run `npm install` to ensure all dependencies are installed
