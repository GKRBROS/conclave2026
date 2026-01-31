# Application Architecture

## Overview

This is a full-stack Next.js application that transforms user-uploaded images into Arcane-style illustrations using AI.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐                                               │
│  │  ImageUpload  │  ← User uploads image via drag-and-drop      │
│  └───────┬───────┘                                               │
│          │                                                        │
│          ↓                                                        │
│  ┌───────────────────┐                                           │
│  │ ImageGenerator    │  ← Main component managing state          │
│  │                   │                                           │
│  │ - uploadedImage   │                                           │
│  │ - generatedImage  │                                           │
│  │ - finalImage      │                                           │
│  │ - loading         │                                           │
│  └───────┬───────────┘                                           │
│          │                                                        │
│          ↓                                                        │
│  ┌───────────────┐                                               │
│  │ ImagePreview  │  ← Shows result, download & share            │
│  └───────────────┘                                               │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/generate (FormData)
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (Next.js API Route)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /app/api/generate/route.ts                               │  │
│  │                                                            │  │
│  │  1. Receive uploaded image                                │  │
│  │  2. Save to /public/uploads/                              │  │
│  │  3. Convert to File object                                │  │
│  │  4. Call OpenAI API ─────────────────────┐                │  │
│  │  5. Download generated image              │                │  │
│  │  6. Save to /public/generated/            │                │  │
│  │  7. Call imageProcessor.mergeImages()     │                │  │
│  │  8. Return URLs to client                 │                │  │
│  └───────────────────────────────────────┬───┘                │  │
│                                          │                      │  │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                                           ↓
                    ┌────────────────────────────┐
                    │   OpenAI API (DALL-E)      │
                    │                            │
                    │  Prompt: "reimagine this   │
                    │  person in Arcane style..." │
                    │                            │
                    │  Returns: Generated image  │
                    │  URL (1024x1024)           │
                    └────────────────────────────┘

                                           │
                                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   IMAGE PROCESSING (Sharp)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /lib/imageProcessor.ts                                   │  │
│  │                                                            │  │
│  │  1. Load background.png (or create gradient)              │  │
│  │  2. Load generated image                                  │  │
│  │  3. Resize to match dimensions                            │  │
│  │  4. Composite images (overlay blend)                      │  │
│  │  5. Export as PNG to /public/final/                       │  │
│  │  6. Return file path                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Upload Phase

```
User → ImageUpload Component → File Selected → ImageGenerator State
```

### 2. Generation Phase

```
ImageGenerator → API Call → /api/generate
                           ↓
                    Process Image File
                           ↓
                    OpenAI API Request
                           ↓
                    Download Result
                           ↓
                    Save Generated Image
```

### 3. Merging Phase

```
API Route → imageProcessor.mergeImages()
                           ↓
          Load Background (background.png or gradient)
                           ↓
          Load Generated Image
                           ↓
          Composite with Sharp
                           ↓
          Save to /public/final/
                           ↓
          Return URLs to Client
```

### 4. Preview Phase

```
Client Receives URLs → ImagePreview Component
                           ↓
          Display Original & Final Images
                           ↓
          Enable Download/Share Actions
```

## File Storage Structure

```
public/
├── background.png           # (Optional) Custom background
├── uploads/
│   └── upload-{timestamp}.{ext}    # Temporary uploaded images
├── generated/
│   └── generated-{timestamp}.png   # AI-generated images
└── final/
    └── final-{timestamp}.png       # Final merged images
```

## Tech Stack Components

### Frontend

- **React 18**: UI components
- **Next.js 15**: Framework with App Router
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety

### Backend (API Route)

- **Next.js API Routes**: Server endpoints
- **OpenAI SDK**: AI image generation
- **Sharp**: Server-side image processing
- **Node.js fs/promises**: File system operations

### Deployment

- **Vercel** (recommended): Serverless deployment
- **Environment Variables**: Secure API key storage

## Key Features Implementation

### Image Upload

- HTML5 drag-and-drop API
- File input with accept filter
- FileReader for client-side preview
- FormData for server upload

### AI Generation

- OpenAI Images API (edit endpoint)
- Custom prompt engineering
- Error handling and retry logic

### Image Processing

- Sharp library for high-performance processing
- Composite blending for overlays
- SVG gradient generation for default background
- PNG output with transparency support

### Download

- Dynamic anchor element creation
- Browser download attribute
- Automatic filename assignment

### Share

- Web Share API (native sharing)
- Clipboard API (fallback)
- File object creation from blob

## Security Considerations

1. **API Key**: Stored in environment variables, never exposed to client
2. **File Validation**: Type and size checks on upload
3. **Temporary Storage**: Files stored temporarily (consider cleanup)
4. **Rate Limiting**: Should be implemented for production
5. **Error Handling**: Graceful degradation and user feedback

## Performance Optimizations

- Server-side image processing (Sharp)
- Efficient file streaming
- Optimized Next.js build
- Static asset caching
- CDN-ready structure

## Future Enhancements

1. **Database Integration**: Store image history
2. **User Authentication**: Personal galleries
3. **Cloud Storage**: AWS S3, Cloudflare R2
4. **Image Caching**: Reduce duplicate generations
5. **Batch Processing**: Multiple images at once
6. **Advanced Editing**: Pre/post-processing options
7. **Style Options**: Multiple art styles
8. **Real-time Preview**: Show generation progress
