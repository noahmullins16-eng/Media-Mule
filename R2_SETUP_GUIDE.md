# Cloudflare R2 Setup Guide

This guide walks you through setting up Cloudflare R2 storage and connecting it to your Media Mule application.

## Prerequisites

- Cloudflare account ([Sign up here](https://dash.cloudflare.com))
- Media Mule project set up and running
- Node.js and npm installed

## Step 1: Create an R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the left sidebar
3. Click **Create Bucket**
4. Enter a bucket name (e.g., `media-mule-storage`)
5. Select a region (recommend the closest to your users)
6. Click **Create Bucket**

## Step 2: Get Your R2 Credentials

### Account ID
1. Go to R2 → Your bucket
2. Look for "Account ID" in the bucket overview (it's a long alphanumeric string)
3. Copy and save it

### API Token (Access Key & Secret)
1. In Cloudflare Dashboard, go to **Account Settings** → **API Tokens**
2. Click **Create Token** → Use template "Edit Cloudflare Workers"
3. Or create custom token with these permissions:
   - **Permissions**: 
     - `Account` → `R2` → `Edit`
     - `Zone` → `Zone Settings` → `Read` (optional)
4. Set expiration (recommended: 1 year or custom)
5. Create and copy the token
6. You'll also need:
   - **Access Key ID**: Shown when creating the token
   - **Secret Access Key**: Shown once, save it immediately!

## Step 3: Update Your Environment Variables

Edit `.env` file in your `Media-Mule` directory and fill in the R2 credentials:

```env
# Cloudflare R2 Configuration
VITE_R2_ACCOUNT_ID="your_account_id_here"
VITE_R2_BUCKET_NAME="media-mule-storage"
VITE_R2_ACCESS_KEY_ID="your_access_key_id"
VITE_R2_SECRET_ACCESS_KEY="your_secret_access_key"
VITE_R2_ENDPOINT="https://your_account_id.r2.cloudflarestorage.com"
```

### Example:
```env
VITE_R2_ACCOUNT_ID="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
VITE_R2_BUCKET_NAME="media-mule-storage"
VITE_R2_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
VITE_R2_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
VITE_R2_ENDPOINT="https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.r2.cloudflarestorage.com"
```

## Step 4: Verify Installation

The following packages should be installed:
- `@aws-sdk/client-s3` - AWS S3 SDK (compatible with R2)
- `@aws-sdk/s3-request-presigner` - For generating signed URLs

Check by running:
```bash
npm list @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Step 5: Using R2 in Your Application

### Using the R2 Storage Utility

```typescript
import { r2Storage } from "@/lib/r2-storage";

// Upload a file
const url = await r2Storage.uploadFile(file, "filename.mp4", "videos");

// Get public URL
const publicUrl = r2Storage.getPublicUrl("filename.mp4", "videos");

// Get signed URL (for private files)
const signedUrl = await r2Storage.getSignedUrl("filename.mp4", "videos", 3600);

// Delete a file
await r2Storage.deleteFile("filename.mp4", "videos");

// List files in folder
const files = await r2Storage.listFiles("videos");
```

### Using the useR2Upload Hook

```typescript
import { useR2Upload } from "@/hooks/useR2Upload";

export const MyComponent = () => {
  const { uploadFile, isUploading, uploadProgress } = useR2Upload();

  const handleUpload = async (file: File) => {
    const url = await uploadFile(file, file.name, {
      folder: "videos",
      onProgress: (progress) => console.log(`Uploaded: ${progress}%`),
    });

    if (url) {
      console.log("File uploaded to:", url);
    }
  };

  return (
    <div>
      {isUploading && <p>Uploading: {uploadProgress}%</p>}
      <button onClick={() => handleUpload(new File([], ""))}>
        Upload
      </button>
    </div>
  );
};
```

## Integration with Supabase

You can use R2 for file storage while keeping Supabase for database/auth:

```typescript
import { r2Storage } from "@/lib/r2-storage";
import { supabase } from "@/integrations/supabase/client";

export const uploadMediaToR2 = async (
  userId: string,
  file: File,
  metadata: { title: string; description: string }
) => {
  // Upload to R2
  const r2Url = await r2Storage.uploadFile(
    file,
    `${userId}/${file.name}`,
    "media"
  );

  // Store metadata in Supabase
  await supabase.from("media").insert({
    user_id: userId,
    title: metadata.title,
    description: metadata.description,
    r2_url: r2Url,
    file_size: file.size,
  });

  return r2Url;
};
```

## Best Practices

### Folder Organization
Use folders to organize your files:
```
media-mule-storage/
├── users/
│   ├── user-123/
│   │   ├── videos/
│   │   ├── images/
│   │   └── watermarks/
│   └── user-456/
├── backups/
└── thumbnails/
```

### Security
1. **Use signed URLs** for private content (expires after set time)
2. **Never expose secret keys** in frontend code
3. **Set CORS policies** on R2 bucket for your domain
4. **Use IAM roles** for backend uploads (not browser-based)

### Performance
1. **Optimize file sizes** before uploading
2. **Use appropriate formats** (WebP for images, MP4 for videos)
3. **Leverage R2 CDN** for public files
4. **Batch uploads** for multiple files

### Cost Optimization
- R2 offers **free egress** from Cloudflare CDN
- **Class B transactions** are cheaper for high-volume operations
- Monitor your bucket for unused files

## Troubleshooting

### "R2 credentials not configured"
- Check `.env` file has all R2 variables
- Restart dev server: `npm run dev`
- Verify env variables are loaded: `console.log(import.meta.env.VITE_R2_BUCKET_NAME)`

### "Access Denied" errors
- Verify API token has correct permissions
- Check Account ID is correct
- Ensure bucket name matches `.env`
- API token may have expired (create new one)

### Slow uploads
- Check file size (R2 handles large files well)
- Verify network connection
- Use CDN for downloads
- Consider pre-processing files

### "404 Not Found" for URLs
- Ensure bucket name is correct in URL
- Check file path is correct
- Verify file was actually uploaded
- Use signed URLs if file is private

## Next Steps

1. ✅ Set up R2 bucket and credentials
2. ✅ Configure environment variables
3. ✅ Test upload functionality
4. 🔄 Integrate with your upload components
5. 🔄 Set up backup strategy
6. 🔄 Configure CDN for faster downloads

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 Pricing](https://www.cloudflare.com/en-us/products/r2/)
