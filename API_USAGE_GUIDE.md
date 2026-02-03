# API Usage Guide - Image Generation & Retrieval

## Overview
This guide explains how to use the two main API endpoints:
1. **POST /scaleup2026/generate** - Generate superhero image from a photo
2. **GET /scaleup2026/user/:userId** - Retrieve generated image and user details

---

## 1. IMAGE INSERTION (POST /scaleup2026/generate)

### Base URL
```
https://conclave2026.vercel.app/scaleup2026/generate
```

### Using Postman (Step-by-Step)

#### Step 1: Create New Request
- Open Postman
- Click **"+"** to create new request
- Set Method to **POST**
- Enter URL: `https://conclave2026.vercel.app/scaleup2026/generate`

#### Step 2: Configure Body (Form Data)
1. Click **"Body"** tab
2. Select **"form-data"** radio button (NOT raw, JSON, or x-www-form-urlencoded)
3. Add the following fields:

| KEY | TYPE | VALUE |
|-----|------|-------|
| `photo` | **File** | Select your image file (JPG/PNG, max 2MB) |
| `name` | Text | John Doe |
| `email` | Text | john@example.com |
| `phone_no` | Text | +1234567890 |
| `designation` | Text | Software Engineer |
| `edit_name` | Text | Johnny (optional) |

**Important:** For the `photo` field, change dropdown from "Text" to **"File"**

#### Step 3: Send Request
- Click **"Send"** button
- Wait for response (30-60 seconds for AI processing)

#### Step 4: View Response
```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "designation": "Software Engineer",
  "aws_key": "uploads/1706828400000/upload-1706828400000.jpg",
  "final_image_url": "https://supabase-url.com/storage/v1/object/public/..."
}
```

**Save the `user_id`** - you'll need it to retrieve the image later!

---

### Using cURL (Command Line)

```bash
curl -X POST https://conclave2026.vercel.app/scaleup2026/generate \
  -F "photo=@/path/to/image.jpg" \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone_no=+1234567890" \
  -F "designation=Software Engineer" \
  -F "edit_name=Johnny"
```

---

### Using JavaScript/Node.js

```javascript
const formData = new FormData();
formData.append('photo', fileInput.files[0]); // From HTML file input
formData.append('name', 'John Doe');
formData.append('email', 'john@example.com');
formData.append('phone_no', '+1234567890');
formData.append('designation', 'Software Engineer');
formData.append('edit_name', 'Johnny');

const response = await fetch('https://conclave2026.vercel.app/scaleup2026/generate', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('User ID:', data.user_id);
console.log('Final Image URL:', data.final_image_url);
```

---

### Using Python

```python
import requests

url = 'https://conclave2026.vercel.app/scaleup2026/generate'

with open('image.jpg', 'rb') as f:
    files = {
        'photo': f,
        'name': (None, 'John Doe'),
        'email': (None, 'john@example.com'),
        'phone_no': (None, '+1234567890'),
        'designation': (None, 'Software Engineer'),
        'edit_name': (None, 'Johnny')
    }
    
    response = requests.post(url, files=files)
    data = response.json()
    
    print('User ID:', data['user_id'])
    print('Final Image URL:', data['final_image_url'])
```

---

### Validation Rules

| Field | Rules |
|-------|-------|
| `photo` | Required, max 2MB, formats: JPG/PNG/WEBP |
| `name` | Required, non-empty string |
| `email` | Required, valid email format (name@domain.com) |
| `phone_no` | Required, 10-15 digits (can start with +) |
| `designation` | Required, non-empty string |
| `edit_name` | Optional, any string |

### Error Responses

**400 - Bad Request (Validation Error)**
```json
{
  "error": "Image size exceeds 2MB limit"
}
```

**500 - Server Error**
```json
{
  "error": "Failed to save to database",
  "details": "Database error message"
}
```

---

## 2. GET IMAGES (GET /scaleup2026/user/:userId)

### Base URL
```
https://conclave2026.vercel.app/scaleup2026/user/{user_id}
```

Replace `{user_id}` with the UUID from the POST response.

### Using Postman (Step-by-Step)

#### Step 1: Create New Request
- Click **"+"** for new request
- Set Method to **GET**
- Enter URL: `https://conclave2026.vercel.app/scaleup2026/user/550e8400-e29b-41d4-a716-446655440000`

#### Step 2: Send Request
- Click **"Send"**
- Response returns immediately

#### Step 3: View Response
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "edit_name": "Johnny",
    "email": "john@example.com",
    "phone_no": "+1234567890",
    "designation": "Software Engineer",
    "aws_key": "uploads/1706828400000/upload-1706828400000.jpg",
    "photo_url": "https://...",
    "generated_image_url": "https://...",
    "created_at": "2026-02-02T10:30:45.123Z"
  }
}
```

---

### Using cURL

```bash
curl -X GET https://conclave2026.vercel.app/scaleup2026/user/550e8400-e29b-41d4-a716-446655440000
```

---

### Using JavaScript/Node.js

```javascript
const userId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(
  `https://conclave2026.vercel.app/scaleup2026/user/${userId}`
);

const data = await response.json();

if (data.success) {
  console.log('User Name:', data.user.name);
  console.log('Generated Image:', data.user.generated_image_url);
  console.log('Created At:', data.user.created_at);
} else {
  console.log('Error:', data.error);
}
```

---

### Using Python

```python
import requests

user_id = '550e8400-e29b-41d4-a716-446655440000'
url = f'https://conclave2026.vercel.app/scaleup2026/user/{user_id}'

response = requests.get(url)
data = response.json()

if data['success']:
    user = data['user']
    print('User Name:', user['name'])
    print('Email:', user['email'])
    print('Generated Image URL:', user['generated_image_url'])
else:
    print('Error:', data['error'])
```

---

## Complete Workflow Example

### Step 1: Generate Image
```javascript
// User uploads image and fills form
const formData = new FormData();
formData.append('photo', imageFile);
formData.append('name', 'Alice Smith');
formData.append('email', 'alice@company.com');
formData.append('phone_no', '+919876543210');
formData.append('designation', 'Product Manager');

const generateResponse = await fetch(
  'https://conclave2026.vercel.app/scaleup2026/generate',
  { method: 'POST', body: formData }
);

const generateData = await generateResponse.json();
const userId = generateData.user_id; // Save this!
```

### Step 2: Retrieve Later
```javascript
// Get the generated image and details
const getResponse = await fetch(
  `https://conclave2026.vercel.app/scaleup2026/user/${userId}`
);

const userData = await getResponse.json();
console.log('Final Image:', userData.user.generated_image_url);
```

---

## Tips & Troubleshooting

### Image Not Uploading?
- ✅ Ensure image is under 2MB
- ✅ Use JPG, PNG, or WEBP format only
- ✅ In Postman, set field type to "File" not "Text"

### Invalid Email?
- ✅ Must contain `@` and valid domain (e.g., name@company.com)

### Invalid Phone?
- ✅ Must be 10-15 digits
- ✅ Can start with `+` for country code
- ✅ Examples: `9876543210`, `+919876543210`, `+12125551234`

### Getting 404 Error on GET?
- ✅ Check user_id is correct (copy from POST response)
- ✅ Make sure it's a valid UUID format

### Timeout Error?
- ✅ AI image generation takes 30-60 seconds
- ✅ Wait longer before assuming timeout
- ✅ Check Vercel logs for details

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation failed) |
| 404 | User not found (GET only) |
| 500 | Server error |

---

## Sample Data for Testing

```
Name: Test User
Email: test@example.com
Phone: +1234567890
Designation: Test Engineer
Edit Name: Tester
Image: Any JPG/PNG under 2MB
```

Save this file and share with your team! All examples are ready to use.
