# Database Setup Instructions

## Choose the Right SQL File

### Option 1: Existing Database (MOST COMMON)

If you already have a `generations` table in Supabase:

**Use:** `supabase-alter-table.sql`

```bash
# In Supabase Dashboard > SQL Editor
# Copy and paste the entire contents of supabase-alter-table.sql
# Click RUN
```

This will:

- ✅ Add all new columns safely (checks if they exist first)
- ✅ Rename `image_url` to `generated_image_url` if needed
- ✅ Add validation constraints
- ✅ Create indexes
- ✅ Set up triggers

---

### Option 2: Fresh Database (NEW INSTALLATION)

If you're setting up from scratch:

**Use:** `supabase-setup.sql`

```bash
# In Supabase Dashboard > SQL Editor
# Copy and paste the entire contents of supabase-setup.sql
# Click RUN
```

This will:

- Create storage bucket
- Create `generations` table with all fields
- Set up RLS policies
- Create indexes and triggers

---

## Quick Test

After running the SQL:

1. **Verify columns exist:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generations'
ORDER BY ordinal_position;
```

Expected columns:

- `id` (uuid)
- `name` (text)
- `email` (text)
- `phone_no` (text)
- `designation` (text)
- `photo_url` (text)
- `generated_image_url` (text)
- `aws_key` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

2. **Test the API:**

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "photo=@test.jpg" \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "phone_no=1234567890" \
  -F "designation=Developer"
```

---

## Troubleshooting

### Error: "column already exists"

This is safe to ignore - it means the column was already added.

### Error: "relation does not exist"

You need to create the table first. Run section 4 from `supabase-setup.sql`.

### Error: "constraint already exists"

This is safe - the constraint was already added.

---

## Summary

**99% of users should run: `supabase-alter-table.sql`**

This file is safe to run multiple times - it checks before adding anything.
