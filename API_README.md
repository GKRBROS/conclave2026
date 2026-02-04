# AI Image Generation API - Quick Start

⚠️ **IMPORTANT: DO NOT PUSH TO GITHUB - This is a local development copy**

## Overview

This is an API-only service for generating Arcane-style superhero portraits. The frontend has been removed - access via REST API only.

## Quick Start

### 1. Setup Environment

Create `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
```

### 2. Setup Supabase Database

Run all commands in `supabase-setup.sql` in your Supabase SQL Editor.

### 3. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for API documentation.

## API Endpoints

### POST /api/generate

Upload photo and generate AI image.

**Required Fields:**

- `photo` (File) - JPEG/PNG/WEBP, max 10MB
- `name` (string)
- `email` (string) - Valid email
- `phone_no` (string) - 10-15 digits
- `designation` (string)

**Optional:**

**Example:**

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "photo=@image.jpg" \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone_no=1234567890" \
  -F "designation=Developer"
```

**Response:**

```json
{
  "success": true,
  "user_id": "uuid",
  "name": "John Doe",
  "designation": "Developer",
  "aws_key": "uploads/.../file.jpg",
  "photo_url": "https://...",
  "generated_image_url": "https://...",
  "final_image_url": "https://..."
}
```

### GET /api/user/:userId

Get user details by ID.

**Example:**

```bash
curl http://localhost:3000/api/user/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "1234567890",
    "designation": "Developer",
    "aws_key": "uploads/.../file.jpg",
    "photo_url": "https://...",
    "generated_image_url": "https://...",
    "created_at": "2026-02-02T..."
  }
}
```

## Validations

✅ **Image Format:** JPEG, PNG, WEBP only  
✅ **Image Size:** Max 2MB  
✅ **Email:** Valid format required  
✅ **Phone:** 10-15 digits (optional + prefix)  
✅ **Required Fields:** photo, name, email, phone_no, designation

## Files Changed

### Modified:

- `app/api/generate/route.ts` - Added new fields, validations, AWS key storage
- `supabase-setup.sql` - New schema with all fields
- `app/page.tsx` - Converted to API documentation page

### Created:

- `app/api/user/[userId]/route.ts` - Get user details endpoint
- `API_DOCUMENTATION.md` - Complete API docs

### Removed:

- Frontend components (ImageGenerator, ImageUpload, ImagePreview) - No longer needed

## Database Schema

```sql
CREATE TABLE public.generations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  designation TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  aws_key TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Testing

```bash
# Test image generation
curl -X POST http://localhost:3000/api/generate \
  -F "photo=@test.jpg" \
  -F "name=Test User" \
  -F "email=test@test.com" \
  -F "phone_no=1234567890" \
  -F "designation=Tester"

# Test user retrieval (use ID from above response)
curl http://localhost:3000/api/user/YOUR_USER_ID
```

## Documentation

- Full API docs: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Supabase setup: [supabase-setup.sql](./supabase-setup.sql)
- Visit `http://localhost:3000` for interactive documentation

## Notes

- Processing time: 30-60 seconds per image
- No authentication required (add if needed)
- Frontend removed - API access only
- **DO NOT commit or push to GitHub**
