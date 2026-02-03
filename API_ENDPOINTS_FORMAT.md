# POST /scaleup2026/generate

```
https://conclave2026.vercel.app/scaleup2026/generate
```

**Method:** POST

**Request:** form-data
```
photo: [File]
name: string
email: string
phone_no: string
designation: string
edit_name: string (optional)
```

**Response (200):**
```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "designation": "Software Developer",
  "aws_key": "uploads/1738512000000/upload-1738512000000.jpg",
  "final_image_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/final/final-1738512000000.png"
}
```

**Response (400):**
```json
{
  "error": "Image size exceeds 2MB limit"
}
```

**Response (500):**
```json
{
  "error": "Failed to save to database",
  "details": "Error message"
}
```

---

# GET /scaleup2026/user/:userId

```
https://conclave2026.vercel.app/scaleup2026/user/{user_id}
```

**Method:** GET

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "+1234567890",
    "designation": "Software Developer",
    "final_image_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/generated-images/final/final-1738512000000.png",
    "created_at": "2026-02-02T10:30:45.123Z"
  }
}
```

**Response (404):**
```json
{
  "error": "User not found"
}
```

**Response (500):**
```json
{
  "error": "Database error",
  "details": "Error message"
}
```
