# AI Image Generator API Documentation

## Overview

This API handles user registration with avatar generation using AI. The system processes uploaded images through an AI model to create stylized avatars, which are then merged with backgrounds and returned to the user.

---

## Base URLs

- **ScaleUp 2026 Endpoint**: `/scaleup2026/generate` (POST) and `/scaleup2026/user/[userId]` (GET)
- **API Endpoint**: `/api/generate` (POST) and `/api/user/[userId]` (GET)
- **Flush Endpoint**: `/scaleup2026/flush` (POST)

> Both endpoints have identical functionality. Use whichever matches your routing preference.

---

## POST Endpoint: Generate Avatar

### Endpoint

```
POST /scaleup2026/generate
POST /api/generate
```

### Request Format

**Content-Type**: `multipart/form-data`

### Request Parameters

| Parameter      | Type   | Required | Description                                                         |
| -------------- | ------ | -------- | ------------------------------------------------------------------- |
| `name`         | string | ✅       | User's full name (cannot be empty)                                  |
| `email`        | string | ✅       | Valid email address (regex validated)                               |
| `phone_no`     | string | ✅       | Phone number (10-15 digits, with optional + prefix)                 |
| `district`     | string | ✅       | District/region name (cannot be empty)                              |
| `category`     | string | ✅       | User category (e.g., Students, Business Owners, etc.)               |
| `organization` | string | ✅       | Organization/company name (cannot be empty)                         |
| `prompt_type`  | string | ✅       | Avatar style type (must be one of: `prompt1`, `prompt2`, `prompt3`) |
| `gender`       | string | ❌       | One of `male`, `female`, `neutral` (defaults to `neutral`)         |
| `photo`        | File   | ✅       | User's photo for avatar generation                                  |

### Avatar Style Types

The `prompt_type` field defines which base AI prompt is used. The optional `gender` field further refines the prompt selection for that style.

| Value     | Style            | Description                                             |
| --------- | ---------------- | ------------------------------------------------------- |
| `prompt1` | **Superman**     | Cinematic superhero portrait with bold, heroic presence |
| `prompt2` | **Professional** | Corporate professional portrait with refined aesthetics |
| `prompt3` | **Warrior**      | Medieval warrior portrait with historical authenticity  |

When `gender` is provided, the backend combines `prompt_type` and `gender` into a key like `prompt1_male`, `prompt1_female`, or `prompt1_neutral`. If a gender-specific variant is not defined or an invalid combination is sent, the system safely falls back to a neutral superhero prompt (`prompt1_neutral`).

### File Upload Constraints

#### Image Format Requirements

**Allowed Formats**:

- `image/jpeg` (JPEG/JPG)
- `image/png` (PNG)

**Validation Error** (400):

```json
{
  "error": "Invalid image format",
  "details": "Only JPEG/JPG and PNG formats are allowed. Received: image/gif"
}
```

#### File Size Limit

**Maximum Size**: **5 MB**

**Validation Error** (400):

```json
{
  "error": "Image file too large",
  "details": "Maximum file size is 5MB. Current size: 3.45MB"
}
```

### Example Request (cURL)

```bash
curl -X POST http://localhost:3000/scaleup2026/generate \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone_no=+919876543210" \
  -F "district=Mumbai" \
  -F "category=Working Professionals" \
  -F "organization=Tech Corp" \
  -F "prompt_type=prompt2" \
  -F "photo=@/path/to/photo.jpg"
```

### Example Request (JavaScript/FormData)

```javascript
const formData = new FormData();
formData.append("name", "John Doe");
formData.append("email", "john@example.com");
formData.append("phone_no", "+919876543210");
formData.append("district", "Mumbai");
formData.append("category", "Working Professionals");
formData.append("organization", "Tech Corp");
formData.append("prompt_type", "prompt2");
formData.append("gender", "male"); // or "female" or "neutral"
formData.append("photo", fileInputElement.files[0]);

const response = await fetch("/scaleup2026/generate", {
  method: "POST",
  body: formData,
});

const data = await response.json();
```

### Success Response (200)

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Avatar generated successfully",
  "final_image_url": "https://supabase-bucket.supabase.co/storage/v1/object/public/generated-images/uploads/1707000123456/merged-final.png"
}
```

### Error Responses

#### Missing Required Field (400)

```json
{
  "error": "Name is required"
}
```

#### Invalid Email Format (400)

```json
{
  "error": "Valid email is required"
}
```

#### Invalid Phone Format (400)

```json
{
  "error": "Valid phone number is required (10-15 digits)"
}
```

#### Invalid Category (400)

```json
{
  "error": "Valid category is required"
}
```

#### Invalid Prompt Type (400)

```json
{
  "error": "Valid prompt_type is required (prompt1, prompt2, or prompt3)"
}
```

#### Missing Photo (400)

```json
{
  "error": "Photo is required"
}
```

#### Server Error (500)

```json
{
  "error": "Internal Server Error",
  "details": "Error message details (only in development mode)"
}
```

---

## GET Endpoint: Retrieve Final Image URL

### Endpoint

```
GET /scaleup2026/user/[userId]
GET /api/user/[userId]
```

### URL Parameters

| Parameter | Type   | Required | Description                                                                 |
| --------- | ------ | -------- | --------------------------------------------------------------------------- |
| `userId`  | string | ✅       | **Preferred: User's Phone Number** (e.g., `+919876543210`) or Record UUID. |

> **Note**: Using the phone number for polling is the most reliable method as it ensures you always get the latest generation for that specific user, even if session IDs (UUIDs) are lost or stale.

### Query Parameters

| Parameter   | Type   | Required | Description                                            |
| ----------- | ------ | -------- | ------------------------------------------------------ |
| `dial_code` | string | ❌       | Optional dial code (e.g., `+91`) if `userId` is phone. |

### Example Request (Polling by Phone)

```bash
# Recommended method
curl -X GET "http://localhost:3000/scaleup2026/user/+919876543210"
```

### Example Request (Polling by UUID)

```bash
curl -X GET "http://localhost:3000/scaleup2026/user/550e8400-e29b-41d4-a716-446655440000"
```

### Success Response (200)

```json
{
  "success": true,
  "final_image_url": "https://supabase-bucket.supabase.co/storage/v1/object/public/generated-images/uploads/1707000123456/merged-final.png"
}
```

**Note**: The response returns **ONLY** the final image URL. The `final_image_url` is the completely processed avatar image after:

1. AI generation from the original photo
2. Background/layer merging
3. Text overlay application
4. PNG export with transparency

### Error Responses

#### Invalid UUID Format (400)

```json
{
  "error": "Invalid user ID format"
}
```

#### User Not Found (404)

```json
{
  "error": "User not found"
}
```

#### Database Error (500)

```json
{
  "error": "Database error",
  "details": "Error message from Supabase"
}
```

---

## GET Endpoint: Retrieve Final Image by Email

### Endpoint

```
GET /scaleup2026/user/by-email
```

### Query Parameters

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| `email`   | string | ✅       | User email used in the generations table |

### Example Request

```bash
curl -X GET "http://localhost:3000/scaleup2026/user/by-email?email=user@example.com"
```

### Success Response (200)

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "final_image_url": "https://supabase-bucket.supabase.co/storage/v1/object/public/generated-images/uploads/1707000123456/merged-final.png",
  "raw_ai_image_url": "https://supabase-bucket.supabase.co/storage/v1/object/public/generated-images/generated/generated-1707000123456.png",
  "download_url": "https://supabase-bucket.supabase.co/storage/v1/object/public/generated-images/uploads/1707000123456/merged-final.png",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "User Name",
    "phone_no": "+919876543210"
  }
}
```

### Error Responses

#### Missing Email (400)

```json
{
  "error": "Email is required"
}
```

#### Invalid Email Format (400)

```json
{
  "error": "Invalid email format"
}
```

#### User Not Found (404)

```json
{
  "error": "User not found for provided email"
}
```

#### Image Not Generated (404)

```json
{
  "error": "Image not generated",
  "details": "No generated image is available for this user yet."
}
```

#### Database Error (500)

```json
{
  "error": "Database error",
  "details": "Error message from Supabase"
}
```

---

## Database Schema

### `generations` Table

| Column                | Type      | Constraints   | Notes                             |
| --------------------- | --------- | ------------- | --------------------------------- |
| `id`                  | UUID      | PRIMARY KEY   | Auto-generated                    |
| `name`                | TEXT      | NOT NULL      | User's full name                  |
| `email`               | TEXT      | NOT NULL      | Valid email format                |
| `phone_no`            | TEXT      | NOT NULL      | 10-15 digits with optional +      |
| `district`            | TEXT      | NOT NULL      | User's district/region            |
| `category`            | TEXT      | NOT NULL      | One of 6 predefined categories    |
| `organization`        | TEXT      | NOT NULL      | Organization/company name         |
| `photo_url`           | TEXT      | NOT NULL      | URL of original uploaded photo    |
| `generated_image_url` | TEXT      | NOT NULL      | **FINAL MERGED IMAGE URL**        |
| `aws_key`             | TEXT      | Nullable      | S3 key for uploaded photo         |
| `prompt_type`         | TEXT      | NOT NULL      | One of: prompt1, prompt2, prompt3 |
| `created_at`          | TIMESTAMP | DEFAULT NOW() | Creation timestamp                |
| `updated_at`          | TIMESTAMP | DEFAULT NOW() | Last update timestamp             |

---

## Image Processing Pipeline

### Step-by-Step Flow

```
1. User uploads photo
   ↓
2. Validation
  ├─ Format check (JPEG/JPG/PNG only)
   └─ Size check (≤ 2MB)
   ↓
3. AI Processing
   ├─ Resize image to 1024x1024
   ├─ Convert to base64
   └─ Send to OpenRouter API with selected prompt
   ↓
4. Image Merging
   ├─ Receive AI-generated avatar
   ├─ Merge with background/layers
   ├─ Add text overlay (organization name)
   └─ Export as PNG with transparency
   ↓
5. Storage & Database
   ├─ Upload final image to Supabase Storage
   ├─ Save metadata to generations table
   └─ Return final_image_url to client
```

### Final Image (`generated_image_url`)

The `final_image_url` contains the completely processed avatar after all transformations:

- ✅ AI-styled avatar (Superman/Professional/Warrior)
- ✅ Merged with background/design layers
- ✅ Text overlay applied (organization name at bottom)
- ✅ PNG format with transparent background
- ✅ 4K quality output

---

## Environment Variables Required

```env
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Rate Limiting & Timeouts

- **Request Timeout**: 60 seconds (enough for AI generation)
- **Max Upload Size**: 2 MB per image
- **Concurrent Requests**: No explicit limit (Vercel/Server dependent)

---

## Error Handling Guide

### Common Errors & Solutions

| Error                            | Cause                     | Solution                                |
| -------------------------------- | ------------------------- | --------------------------------------- |
| `Invalid image format`           | Wrong file type uploaded  | Use JPEG/JPG or PNG format              |
| `Image file too large`           | File exceeds 2MB          | Compress image before uploading         |
| `Valid email is required`        | Email doesn't match regex | Ensure email format: user@domain.com    |
| `Valid phone number is required` | Phone has invalid digits  | Use 10-15 digits with optional + prefix |
| `User not found`                 | Wrong userId provided     | Verify userId from POST response        |
| `Database error`                 | Supabase connection issue | Check SUPABASE_URL and API keys         |

---

## Testing the API

### Using Postman

1. Create new POST request to `/scaleup2026/generate`
2. Set Body to `form-data`
3. Add all required parameters
4. Attach image file to `photo` field
5. Click Send

### Using Thunder Client / VS Code

```javascript
// Pre-request Script to prepare form data
const form = new FormData();
form.append("name", "Test User");
form.append("email", "test@example.com");
form.append("phone_no", "9876543210");
form.append("district", "Test District");
form.append("category", "Working Professionals");
form.append("organization", "Test Org");
form.append("prompt_type", "prompt2");
form.append("photo" /* file blob */);
```

---

## Flush Endpoint: Clear User Image Generation Data

### Endpoint

```
POST /scaleup2026/flush
```

### Request Format

**Content-Type**:
- `application/json` **or**
- `multipart/form-data`

### Request Body

| Field      | Type    | Required | Description                                                                 |
|----------- | ------- | -------- | --------------------------------------------------------------------------- |
| `email`    | string  | ✅       | User email used in the generations table                                   |
| `confirm`  | boolean | ❌       | When `true`, actually clears image data. When omitted/false, only previews |

The flush flow is **two-step**:

1. **Preview step (no deletion)**  
   - Send only `email` (no `confirm` field).  
   - The backend looks up the most recent record in the `generations` table for the given email (case-insensitive) and returns user details for confirmation.  
   - Example request:

   ```json
   {
     "email": "user@example.com"
   }
   ```

   **Preview response (200):**

   ```json
   {
     "success": true,
     "requires_confirmation": true,
     "message": "User found. Confirm to flush image data.",
     "user": {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "email": "user@example.com",
       "name": "User Name",
       "phone_no": "+919876543210",
       "photo_url": "https://...",
       "generated_image_url": "https://...",
       "aws_key": "uploads/..."
     }
   }
   ```

2. **Confirm + delete step**  
   - After the user confirms the previewed details are correct, send the same `email` with `confirm: true`.  
   - The backend clears `photo_url`, `generated_image_url`, `ai_image_key`, and `aws_key` for that record and deletes any related OTP verification rows for that email.

   Example request:

   ```json
   {
     "email": "user@example.com",
     "confirm": true
   }
   ```

   **Success response (200):**

   ```json
   {
     "success": true,
     "message": "User image generation data flushed successfully",
     "user_id": "550e8400-e29b-41d4-a716-446655440000",
     "email": "user@example.com"
   }
   ```

### Error Responses

#### Missing or Invalid Email (400)

```json
{
  "error": "Email is required"
}
```

or

```json
{
  "error": "Invalid email format"
}
```

#### User Not Found (404)

```json
{
  "error": "User not found for provided email"
}
```

#### Invalid JSON Body (400)

```json
{
  "error": "Invalid JSON body",
  "details": "Send a valid JSON object like {\"email\":\"user@example.com\"}."
}
```

#### Server Error (500)

```json
{
  "error": "Failed to flush user image data",
  "details": "Error message from Supabase"
}
```

---

## Important Notes

1. **Final Image URL**: The `generated_image_url` (returned as `final_image_url`) is the COMPLETE avatar after all processing, merging, and styling applied.

2. **File Validation**: Only JPEG/JPG and PNG formats are accepted. No dimension validation is applied—the system handles images of any size.

3. **Name Edits in Modal**: The API always stores the current `name` value from the form. Any edits in the modal or registration form replace the previous name up until the user exits the modal or submits the registration.

4. **UUID Format**: Always validate UUID format in GET requests. Must be standard UUID v4 format.

5. **Supabase Storage**: Final images are publicly accessible via the returned URL. Ensure bucket permissions are set to PUBLIC.

6. **Error Details**: In production, error details are hidden for security. In development mode, full stack traces are provided.

---

## Support

For issues or questions about the API:

- Check the error response `details` field
- Verify all required fields are present in requests
- Ensure image file meets format and size constraints
- Validate category and prompt_type values against allowed options
