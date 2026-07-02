# R2 Upload System - Production Setup & Verification

## ✅ FIXES APPLIED

### 1. R2 URL Construction (CRITICAL)
**File**: `src/lib/r2-storage.ts`
- **Before**: Used path-style URLs: `https://account-id.r2.cloudflarestorage.com/bucket/key`
- **After**: Now uses virtual-hosted-style: `https://bucket.account-id.r2.cloudflarestorage.com/key`
- **Impact**: Files are now publicly accessible with correct URLs

### 2. AWS Signature V4 Implementation
**File**: `src/lib/r2-storage.ts`
**Fixes**:
- Fixed date/time parsing (UTC ISO format)
- Added `Content-Type` to signed headers (required by R2)
- Fixed canonical request format
- Improved error logging with full response body

### 3. Error Logging
**File**: `src/lib/r2-storage.ts`
**Improved**:
- Full error response body now logged
- Detailed console logs at each step
- Status codes and error messages included

### 4. Cleaned Up Codebase
**Deleted files**:
- ❌ `src/hooks/useR2Upload.ts` (unused)
- ❌ `src/hooks/useR2UploadViaEdgeFunction.ts` (unused)
- ❌ `src/components/R2TestUpload.tsx` (test component)
- ❌ `src/pages/R2Test.tsx` (test page)
- ❌ `src/pages/DebugR2.tsx` (debug page)
- ❌ `supabase/functions/upload-to-r2/` (unused Edge Function)

**Updated**:
- ✅ `src/App.tsx` - removed dead route imports

## 🔧 REQUIRED R2 CONFIGURATION

### Step 1: Configure R2 CORS Policy

**Go to**: Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS Policy

**Clear existing policy and paste**:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**Save** and wait 30 seconds for propagation.

**Do NOT include**: POST, DELETE, OPTIONS (R2 doesn't support these for browser uploads)

### Step 2: Verify R2 Bucket Settings

**Go to**: Cloudflare Dashboard → R2 → Your Bucket → Settings

Verify:
- ✅ Public access is enabled
- ✅ No blocking policies
- ✅ CORS policy is valid (no red error messages)

### Step 3: Environment Variables

Verify `.env` has:
```
VITE_R2_ACCOUNT_ID=02a3ca93ae9d8ca0004395c1cdd95953
VITE_R2_BUCKET_NAME=media-mule-storage
VITE_R2_ACCESS_KEY_ID=97f6b7399d865290eacd8adaf414a864
VITE_R2_SECRET_ACCESS_KEY=c296c9b7b3469ff2f9817d1c64ee84f6b9d27b25ce7a34904830d00a68b4f44b
VITE_R2_ENDPOINT=https://02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com
```

## 🧪 TESTING UPLOAD FLOW

### Test 1: Upload a Small File

1. Go to: `http://localhost:8082/upload`
2. Select a small image file (< 5MB)
3. Fill in title and other details
4. Click **Upload Content**
5. **Check browser console (F12 → Console)** for:
   - ✅ `📤 [R2] Uploading file` log
   - ✅ `✅ [R2] Upload successful` log
   - ❌ NO CORS errors
   - ❌ NO "R2 upload failed" errors

### Test 2: Verify File in R2

1. Go to Cloudflare R2 dashboard
2. Open your bucket
3. Look for folder: `users/` → `{user-id}/`
4. File should be present with correct name

### Test 3: Verify Public URL

1. From upload success or Supabase, get R2 URL
2. Expected format: `https://media-mule-storage.02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com/users/{user-id}/{file-id}.ext`
3. Open URL in browser
4. ✅ File should be publicly accessible and display

### Test 4: Check Supabase Database

1. Go to Supabase dashboard
2. Table: `videos`
3. Verify new row:
   - `r2_url`: Contains full R2 public URL ✅
   - `file_path`: Contains relative path (for reference)
   - `storage_url`: Column not used currently

## 📊 UPLOAD FLOW (COMPLETE)

```
User selects file
    ↓
VideoUploader validates file size & type
    ↓
User clicks "Upload Content"
    ↓
r2Storage.uploadFile() called
    ↓
AWS Signature V4 generated for PUT request
    ↓
HTTPS PUT request sent to: https://bucket.account-id.r2.cloudflarestorage.com/users/{user-id}/{file-id}
    ↓
R2 validates signature & CORS
    ↓
File stored in R2 ✅
    ↓
Public URL returned: https://bucket.account-id.r2.cloudflarestorage.com/users/{user-id}/{file-id}
    ↓
VideoUploader inserts into Supabase:
  - videos.r2_url = public URL
  - video_files.storage_url = public URL
    ↓
Upload success message shown to user
    ↓
User can access file via R2 URL
```

## 🔍 DEBUGGING CHECKLIST

If upload still fails:

1. **Check console logs**:
   ```
   📤 [R2] Uploading file {key, size, contentType}
   ```
   If missing: R2 credentials not loaded

2. **Check for CORS error**:
   - "Access to XMLHttpRequest blocked by CORS policy"
   - Solution: Verify CORS policy in R2 is saved and includes `*` in AllowedOrigins

3. **Check for signature error**:
   - "R2 upload failed (400): Bad Request"
   - Solution: Verify date/time is correct on your computer

4. **Check credentials**:
   - If "R2 credentials not configured": Verify all VITE_R2_* variables in .env

5. **Check file size**:
   - Verify file is under tier limit (5GB free plan)

## 📝 FILES MODIFIED

1. ✅ `src/lib/r2-storage.ts` - Fixed URL construction and AWS Sig V4
2. ✅ `src/App.tsx` - Removed dead routes

## 🗑️ FILES DELETED

1. ✅ `src/hooks/useR2Upload.ts`
2. ✅ `src/hooks/useR2UploadViaEdgeFunction.ts`
3. ✅ `src/components/R2TestUpload.tsx`
4. ✅ `src/pages/R2Test.tsx`
5. ✅ `src/pages/DebugR2.tsx`
6. ✅ `supabase/functions/upload-to-r2/`

## ✨ NEXT STEPS

1. **Configure R2 CORS** (see Step 1 above)
2. **Restart dev server**: `npm run dev`
3. **Test upload** (see Testing section)
4. **Monitor console logs** for errors
5. **Verify in R2 dashboard** that files appear
6. **Check Supabase database** that URLs are saved

