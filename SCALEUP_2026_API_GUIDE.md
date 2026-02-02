# Quick Reference - Scaleup 2026 API

## 🚀 Generate AI Image

```bash
POST /scaleup2026/generate
```

### Request (multipart/form-data)

| Field         | Type   | Required | Validation              |
| ------------- | ------ | -------- | ----------------------- |
| `photo`       | File   | ✅       | JPEG/PNG/WEBP, max 2MB  |
| `name`        | string | ✅       | Non-empty               |
| `edit_name`   | string | ❌       | Optional                |
| `email`       | string | ✅       | Valid email format      |
| `phone_no`    | string | ✅       | 10-15 digits            |
| `designation` | string | ✅       | Non-empty               |

### cURL Example

```bash
curl -X POST http://localhost:3000/scaleup2026/generate \
  -F "photo=@image.jpg" \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone_no=1234567890" \
  -F "designation=Developer"
```

### Response

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "aws_key": "uploads/1234567890/file.jpg",
  "photo_url": "https://...",
  "generated_image_url": "https://...",
  "final_image_url": "https://..."
}
```

---

## 👤 Get User Details

```bash
GET /scaleup2026/user/:userId
```

### Request

```bash
GET /scaleup2026/user/550e8400-e29b-41d4-a716-446655440000
```

### cURL Example

```bash
curl http://localhost:3000/scaleup2026/user/550e8400-e29b-41d4-a716-446655440000
```

### Response

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "1234567890",
    "designation": "Developer",
    "aws_key": "uploads/1234567890/file.jpg",
    "photo_url": "https://...",
    "generated_image_url": "https://...",
    "created_at": "2026-02-02T..."
  }
}
```

---

## 🔒 Validations

| Field            | Rule            | Example                           |
| ---------------- | --------------- | --------------------------------- |
| **Image Format** | JPEG, PNG, WEBP | ✅ `.jpg` ❌ `.gif`               |
| **Image Size**   | Max 2MB         | ✅ `1MB` ❌ `5MB`                 |
| **Email**        | Valid format    | ✅ `user@domain.com` ❌ `invalid` |
| **Phone**        | 10-15 digits    | ✅ `+1234567890` ❌ `123`         |

---

## ⚡ Error Codes

| Status | Error                            | Meaning              |
| ------ | -------------------------------- | -------------------- |
| 400    | `Photo is required`              | Missing image file   |
| 400    | `Invalid image format`           | Wrong file type      |
| 400    | `Image size exceeds 2MB`         | File too large       |
| 400    | `Valid email is required`        | Email format invalid |
| 400    | `Valid phone number is required` | Phone format invalid |
| 404    | `User not found`                 | Invalid user_id      |
| 500    | `Failed to upload image`         | Storage error        |
| 500    | `Failed to save to database`     | Database error       |

---

## 📦 Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key

# 3. Run Supabase SQL
# Execute supabase-migration.sql in Supabase Dashboard

# 4. Start dev server
npm run dev

# 5. View API docs
# Visit http://localhost:3000
```

---

## 📚 API Endpoints

### POST /scaleup2026/generate
Generate AI superhero portrait from user photo

### GET /scaleup2026/user/:userId
Get user details and generated images by ID

---

## ⏱️ Processing Time

⚠️ Image generation takes **30-60 seconds**

Plan API timeouts accordingly!

---

## 🎯 Testing Checklist

- [ ] POST with valid data → Returns user_id
- [ ] POST without photo → Error 400
- [ ] POST with invalid email → Error 400
- [ ] POST with large file (>2MB) → Error 400
- [ ] GET with valid user_id → Returns user data
- [ ] GET with invalid user_id → Error 404
- [ ] Visit http://localhost:3000 → See API docs

---

## 🔗 Import Postman Collection

1. Open Postman
2. Click **Import**
3. Select `postman_collection.json`
4. Set variable `base_url = http://localhost:3000`
5. Test endpoints

---

## 📝 Example Integration (JavaScript)

```javascript
// Generate Image
const formData = new FormData();
formData.append('photo', fileInput.files[0]);
formData.append('name', 'John Doe');
formData.append('email', 'john@example.com');
formData.append('phone_no', '1234567890');
formData.append('designation', 'Developer');

const response = await fetch('http://localhost:3000/scaleup2026/generate', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.user_id); // Save this ID

// Get User Details
const userId = result.user_id;
const userResponse = await fetch(`http://localhost:3000/scaleup2026/user/${userId}`);
const userData = await userResponse.json();
console.log(userData.user);
```

---

## 📝 Example Integration (Python)

```python
import requests

# Generate Image
url = "http://localhost:3000/scaleup2026/generate"
files = {'photo': open('image.jpg', 'rb')}
data = {
    'name': 'John Doe',
    'email': 'john@example.com',
    'phone_no': '1234567890',
    'designation': 'Developer'
}

response = requests.post(url, files=files, data=data)
result = response.json()
user_id = result['user_id']

# Get User Details
user_url = f"http://localhost:3000/scaleup2026/user/{user_id}"
user_response = requests.get(user_url)
user_data = user_response.json()
print(user_data['user'])
```

---

**⚠️ Remember: DO NOT PUSH TO GITHUB**

This is a local development copy only!
