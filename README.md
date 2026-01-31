# Arcane AI Image Generator

Transform your photos into stunning Arcane-style illustrations using AI!

## Features

- 📸 **Easy Upload**: Drag-and-drop or click to upload your image
- 🎨 **AI Transformation**: Uses OpenAI's DALL-E to reimagine images in Arcane style
- 🖼️ **Custom Background**: Merges generated image with a fixed background
- 💾 **Download**: Save your transformed image as PNG
- 🔗 **Share**: Share your creation with others

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

3. **Add a background image (optional):**
   - Place a `background.png` file in the `public` folder
   - If not provided, a default purple gradient will be used

## Running the App

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How It Works

1. **Upload**: User uploads an image through the web interface
2. **AI Generation**: The image is sent to OpenAI's API with the prompt: _"reimagine this person in an Arcane-style illustration with a cool, professional pose and a confident smile on a plain black background"_
3. **Image Merging**: The AI-generated image is merged with a background using Sharp (server-side image processing)
4. **Preview & Download**: User can preview the final result and download or share it

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI API**: OpenAI (DALL-E)
- **Image Processing**: Sharp
- **Deployment Ready**: Vercel, Netlify, or any Node.js hosting

## Project Structure

```
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # API endpoint for image generation
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/
│   ├── ImageGenerator.tsx        # Main component
│   ├── ImageUpload.tsx           # Upload interface
│   └── ImagePreview.tsx          # Preview and actions
├── lib/
│   └── imageProcessor.ts         # Image merging logic
├── public/
│   ├── background.png            # Background image (optional)
│   ├── uploads/                  # Temporary uploaded images
│   ├── generated/                # AI-generated images
│   └── final/                    # Final merged images
└── package.json
```

## API Requirements

You need an OpenAI API key with access to the Images API (DALL-E). Get one at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).

## Notes

- Maximum upload size: 10MB
- Supported formats: JPG, PNG, WebP
- Generated images are 1024x1024 pixels
- Temporary files are stored in `public/uploads`, `public/generated`, and `public/final`

## License

MIT
