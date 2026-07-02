# R2 Upload Audit - Critical Findings

## ROOT CAUSE ANALYSIS

### CRITICAL BUG #1: Incorrect R2 URL Construction
**Location**: `src/lib/r2-storage.ts:152`
**Issue**: URL is constructed incorrectly using path-style when virtual-hosted-style is needed
**Current**: `https://02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com/media-mule-storage/users/...`
**Should be**: `https://media-mule-storage.02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com/users/...`
**Impact**: Files are uploaded but public URLs are incorrect, making files inaccessible

### CRITICAL BUG #2: AWS Signature V4 Implementation Issues
**Location**: `src/lib/r2-storage.ts` (entire signing logic)
**Issue**: Multiple signature generation bugs:
- Line 56: dateStamp calculation truncates milliseconds incorrectly
- Line 74: Region hardcoded to "auto" (correct for R2)
- Missing Content-Type header in signed headers list (should be in canonical headers)
- Path encoding not URL-encoded in canonical request

**Impact**: R2 rejects requests with 403 Forbidden or 400 Bad Request due to signature mismatch

### CRITICAL BUG #3: CORS Configuration Incomplete
**Location**: Cloudflare R2 bucket settings
**Issue**: CORS policy either missing or has invalid methods (OPTIONS not supported)
**Impact**: Browser preflight requests fail

### BUG #4: Dead Code - Multiple Unused Upload Implementations
**Files**:
- `src/hooks/useR2Upload.ts` - unused hook
- `src/hooks/useR2UploadViaEdgeFunction.ts` - unused hook  
- `src/components/R2TestUpload.tsx` - test component
- `src/pages/R2Test.tsx` - test page
- `src/pages/DebugR2.tsx` - debug page
- `supabase/functions/upload-to-r2/index.ts` - unused Edge Function

**Impact**: Code bloat, confusion about which implementation is active

### BUG #5: Database Schema Mismatch
**Location**: VideoUploader.tsx lines 155, 171
**Issue**: Storing both `file_path` AND `r2_url` in database
- `file_path`: Should only contain R2 path for reference
- `r2_url`: Should contain full R2 public URL
**Problem**: Database doesn't have `storage_url` column in `video_files` table

### BUG #6: Error Handling Missing Critical Details
**Location**: `src/lib/r2-storage.ts:146-148`
**Issue**: Error response body not logged, making debugging impossible
```typescript
const errorText = await response.text();
console.error("R2 Error:", response.status, errorText); // errorText not included in message
```

## ENVIRONMENT VARIABLES

✅ All R2 credentials configured correctly
✅ VITE_R2_ENDPOINT correct: `https://02a3ca93ae9d8ca0004395c1cdd95953.r2.cloudflarestorage.com`

## VERIFICATION CHECKLIST

- [ ] Fix R2 URL construction (virtual-hosted-style)
- [ ] Fix AWS Signature V4 implementation
- [ ] Fix CORS configuration in R2 bucket
- [ ] Remove all dead code files
- [ ] Add proper error logging with response body
- [ ] Verify database schema matches code
- [ ] Test end-to-end upload flow
- [ ] Verify R2 URLs are publicly accessible
- [ ] Ensure only R2 URL is returned to database

## FILES TO MODIFY

1. `src/lib/r2-storage.ts` - Fix URL construction and signature logic
2. `src/components/upload/VideoUploader.tsx` - Remove dead code references
3. Delete unused files (R2Test, DebugR2, hooks, Edge Function)

