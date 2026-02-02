# API Documentation

## Base URL

```
http://localhost:3000  (Development)
https://your-domain.com (Production)
```

## Authentication

Currently, no authentication is required. API is open for testing.

---

## Endpoints

### 1. Generate AI Image

**Endpoint:** `POST /api/generate`

**Description:** Upload a photo and generate an Arcane-style superhero portrait with custom text overlay.

**Content-Type:** `multipart/form-data`

**Request Parameters:**

| Field         | Type   | Required | Description              | Validation                      |
| ------------- | ------ | -------- | ------------------------ | ------------------------------- |
| `photo`       | File   | Yes      | Image file to transform  | JPEG, PNG, WEBP; Max 2MB        |
| `name`        | string | Yes      | User's full name         | Non-empty string                |
| `edit_name`   | string | No       | Alternative display name | Optional                        |
| `email`       | string | Yes      | User's email address     | Valid email format              |
| `phone_no`    | string | Yes      | Phone number             | 10-15 digits, optional + prefix |
| `designation` | string | Yes      | Job title or role        | Non-empty string                |

**Validations:**

- **Image Format:** Only JPEG, PNG, WEBP allowed
- **Image Size:** Maximum 2MB
- **Email:** Must match pattern: `user@domain.com`
- **Phone:** Must match pattern: `+1234567890` (10-15 digits)

**Response (200 OK):**

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "designation": "Software Developer",
  "aws_key": "uploads/1738512000000/upload-1738512000000.jpg",
  "photo_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/uploads/1738512000000/upload-1738512000000.jpg",
  "generated_image_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/generated/generated-1738512000000.png",
  "final_image_url": "/final/final-1738512000000.png"
}
```

**Error Responses:**

| Status | Error                               | Description             |
| ------ | ----------------------------------- | ----------------------- |
| 400    | `Photo is required`                 | No image file uploaded  |
| 400    | `Name is required`                  | Name field is empty     |
| 400    | `Valid email is required`           | Email format invalid    |
| 400    | `Valid phone number is required`    | Phone format invalid    |
| 400    | `Designation is required`           | Designation field empty |
| 400    | `Invalid image format`              | File type not supported |
| 400    | `Image size exceeds 2MB limit`   | File too large          |
| 500    | `Failed to upload image to storage` | Storage error           |
| 500    | `Failed to save to database`        | Database error          |

**Example cURL:**

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "photo=@/path/to/image.jpg" \
  -F "name=John Doe" \
  -F "edit_name=J. Doe" \
  -F "email=john@example.com" \
  -F "phone_no=+1234567890" \
  -F "designation=Software Developer"
```

**Example JavaScript (Fetch API):**

```javascript
const formData = new FormData();
formData.append("photo", fileInput.files[0]);
formData.append("name", "John Doe");
formData.append("edit_name", "J. Doe");
formData.append("email", "john@example.com");
formData.append("phone_no", "+1234567890");
formData.append("designation", "Software Developer");

const response = await fetch("http://localhost:3000/api/generate", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log(data);
```

**Processing Time:** 30-60 seconds (AI generation + image processing)

---

### 2. Get User Details

**Endpoint:** `GET /api/user/:userId`

**Description:** Retrieve user information and generated images by user ID.

**Request Parameters:**

| Parameter | Type | Location | Required | Description              |
| --------- | ---- | -------- | -------- | ------------------------ |
| `userId`  | UUID | Path     | Yes      | User's unique identifier |

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "edit_name": "J. Doe",
    "email": "john@example.com",
    "phone_no": "+1234567890",
    "designation": "Software Developer",
    "aws_key": "uploads/1738512000000/upload-1738512000000.jpg",
    "photo_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/uploads/1738512000000/upload-1738512000000.jpg",
    "generated_image_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/generated/generated-1738512000000.png",
    "created_at": "2026-02-02T12:34:56.789Z"
  }
}
```

**Error Responses:**

| Status | Error                    | Description                 |
| ------ | ------------------------ | --------------------------- |
| 400    | `Invalid user ID format` | UUID format is invalid      |
| 404    | `User not found`         | No user exists with that ID |
| 500    | `Database error`         | Database query failed       |

**Example cURL:**

```bash
curl -X GET http://localhost:3000/api/user/550e8400-e29b-41d4-a716-446655440000
```

**Example JavaScript (Fetch API):**

```javascript
const userId = "550e8400-e29b-41d4-a716-446655440000";
const response = await fetch(`http://localhost:3000/api/user/${userId}`);
const data = await response.json();
console.log(data.user);
```

---

## Database Schema

### Table: `generations`

```sql
CREATE TABLE public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  edit_name TEXT,
  email TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  designation TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  aws_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone_no ~* '^\+?[0-9]{10,15}$')
);
```

---

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenRouter (AI Image Generation)
OPENROUTER_API_KEY=your-openrouter-key

# Node Environment
NODE_ENV=development
```

### 2. Supabase Setup

Run the SQL commands in `supabase-setup.sql`:

```bash
# In Supabase Dashboard > SQL Editor, run:
```

1. Create storage bucket: `generated-images`
2. Set bucket to public
3. Create `generations` table
4. Enable Row Level Security (RLS)
5. Create access policies

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see API documentation.

---

## Testing

### Test Image Upload

```bash
# Linux/Mac
curl -X POST http://localhost:3000/api/generate \
  -F "photo=@test-image.jpg" \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "phone_no=1234567890" \
  -F "designation=Tester"

# Windows PowerShell
$form = @{
    photo = Get-Item -Path "test-image.jpg"
    name = "Test User"
    email = "test@example.com"
    phone_no = "1234567890"
    designation = "Tester"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/generate" -Method Post -Form $form
```

### Test User Retrieval

```bash
curl -X GET http://localhost:3000/api/user/YOUR_USER_ID_HERE
```

---

## Rate Limiting & Costs

- **Processing Time:** 30-60 seconds per image
- **OpenRouter Cost:** ~$0.01-0.05 per generation
- **Concurrent Requests:** Limited by Vercel/hosting provider
- **Supabase Storage:** 1GB free, then paid

---

## Support

For issues or questions, contact your development team.
