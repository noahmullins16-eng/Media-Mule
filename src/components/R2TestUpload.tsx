import { useState } from "react";
import { useR2Upload } from "@/hooks/useR2Upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const R2TestUpload = () => {
  const { uploadFile, isUploading, uploadProgress } = useR2Upload();
  const [testResult, setTestResult] = useState<string>("");

  const handleTestUpload = async () => {
    try {
      // Create a test file
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testFile = new File([testContent], "r2-test.txt", {
        type: "text/plain",
      });

      console.log("Uploading test file to R2...");
      const url = await uploadFile(testFile, "r2-test.txt", {
        folder: "test",
      });

      if (url) {
        setTestResult(
          `✅ Success! File uploaded to: ${url}`
        );
        console.log("R2 Upload successful:", url);
        toast.success("R2 connection verified!");
      } else {
        setTestResult("❌ Upload failed - no URL returned");
        toast.error("R2 upload failed");
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Unknown error";
      setTestResult(`❌ Error: ${errorMsg}`);
      console.error("R2 test error:", error);
      toast.error("R2 connection test failed");
    }
  };

  return (
    <div className="glass-card p-6 max-w-md mx-auto rounded-lg border border-border">
      <h3 className="font-semibold text-lg mb-4">Test R2 Connection</h3>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Endpoint:</strong>{" "}
            {import.meta.env.VITE_R2_ENDPOINT}
          </p>
          <p>
            <strong>Bucket:</strong>{" "}
            {import.meta.env.VITE_R2_BUCKET_NAME}
          </p>
          <p>
            <strong>Account ID:</strong>{" "}
            {import.meta.env.VITE_R2_ACCOUNT_ID?.slice(0, 10)}...
          </p>
        </div>

        <Button
          onClick={handleTestUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading
            ? `Uploading... ${uploadProgress}%`
            : "Test R2 Upload"}
        </Button>

        {testResult && (
          <div className="p-3 rounded bg-background/50 text-sm font-mono whitespace-pre-wrap">
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
};
