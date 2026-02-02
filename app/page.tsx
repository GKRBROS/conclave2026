export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          AI Image Generation API
        </h1>
        <p className="text-gray-600 mb-8">
          Arcane-style superhero portrait generator
        </p>

        <div className="space-y-8">
          {/* API Endpoint 1 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-green-500 text-white px-3 py-1 rounded font-mono text-sm">
                POST
              </span>
              <code className="text-lg font-mono text-gray-800">
                /scaleup2026/generate
              </code>
            </div>

            <h3 className="font-semibold text-lg mb-3">Generate AI Image</h3>
            <p className="text-gray-600 mb-4">
              Upload a photo and generate an Arcane-style superhero portrait.
            </p>

            <div className="bg-gray-50 p-4 rounded mb-4">
              <h4 className="font-semibold mb-2">
                Request (multipart/form-data):
              </h4>
              <ul className="space-y-2 text-sm font-mono">
                <li>
                  <span className="text-red-600">*</span> <strong>photo</strong>
                  : File (JPEG, PNG, WEBP, max 2MB)
                </li>
                <li>
                  <span className="text-red-600">*</span> <strong>name</strong>:
                  string
                </li>
                <li className="ml-4">
                  <strong>edit_name</strong>: string (optional)
                </li>
                <li>
                  <span className="text-red-600">*</span> <strong>email</strong>
                  : string (valid email format)
                </li>
                <li>
                  <span className="text-red-600">*</span>{" "}
                  <strong>phone_no</strong>: string (10-15 digits)
                </li>
                <li>
                  <span className="text-red-600">*</span>{" "}
                  <strong>designation</strong>: string
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Response (200 OK):</h4>
              <pre className="text-xs overflow-x-auto">
                {`{
  "success": true,
  "user_id": "uuid",
  "name": "John Doe",
  "designation": "Developer",
  "aws_key": "uploads/1234567890/upload-1234567890.jpg",
  "photo_url": "https://...",
  "generated_image_url": "https://...",
  "final_image_url": "https://..."
}`}
              </pre>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Processing takes 30-60 seconds
              </p>
            </div>
          </div>

          {/* API Endpoint 2 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-500 text-white px-3 py-1 rounded font-mono text-sm">
                GET
              </span>
              <code className="text-lg font-mono text-gray-800">
                /scaleup2026/user/:userId
              </code>
            </div>

            <h3 className="font-semibold text-lg mb-3">Get User Details</h3>
            <p className="text-gray-600 mb-4">
              Retrieve user information by user ID.
            </p>

            <div className="bg-gray-50 p-4 rounded mb-4">
              <h4 className="font-semibold mb-2">Request:</h4>
              <p className="text-sm font-mono">
                GET /api/user/&#123;uuid&#125;
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Response (200 OK):</h4>
              <pre className="text-xs overflow-x-auto">
                {`{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "edit_name": "J. Doe",
    "email": "john@example.com",
    "phone_no": "+1234567890",
    "designation": "Developer",
    "aws_key": "uploads/1234567890/upload-1234567890.jpg",
    "photo_url": "https://...",
    "generated_image_url": "https://...",
    "created_at": "2026-02-02T..."
  }
}`}
              </pre>
            </div>
          </div>

          {/* cURL Examples */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-900 text-white">
            <h3 className="font-semibold text-lg mb-4">
              Example cURL Commands
            </h3>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Generate Image:</p>
              <pre className="text-xs overflow-x-auto bg-black p-3 rounded">
                {`curl -X POST http://localhost:3000/api/generate \\
  -F "photo=@/path/to/image.jpg" \\
  -F "name=John Doe" \\
  -F "edit_name=J. Doe" \\
  -F "email=john@example.com" \\
  -F "phone_no=+1234567890" \\
  -F "designation=Developer"`}
              </pre>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Get User Details:</p>
              <pre className="text-xs overflow-x-auto bg-black p-3 rounded">
                {`curl -X GET http://localhost:3000/api/user/YOUR_USER_ID`}
              </pre>
            </div>
          </div>

          {/* Validations */}
          <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
            <h3 className="font-semibold text-lg mb-3">📋 Validations</h3>
            <ul className="space-y-2 text-sm">
              <li>
                ✓ <strong>Image Format:</strong> JPEG, PNG, WEBP only
              </li>
              <li>
                ✓ <strong>Image Size:</strong> Maximum 10MB
              </li>
              <li>
                ✓ <strong>Email:</strong> Valid email format required
              </li>
              <li>
                ✓ <strong>Phone:</strong> 10-15 digits (optional + prefix)
              </li>
              <li>
                ✓ <strong>Required Fields:</strong> photo, name, email,
                phone_no, designation
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
