import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setError("Invalid verification link.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          "custom-verify-email",
          {
            body: { token },
          }
        );

        if (functionError) {
          setError("Failed to verify email. The link may have expired.");
        } else if (data?.success) {
          setVerified(true);
          toast.success("Email verified successfully!");
        } else {
          setError("Failed to verify email. Please try again.");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Media Mule Co." className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl font-display">
            {loading ? "Verifying Email" : verified ? "Email Verified" : "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Please wait while we verify your email..."
              : verified
              ? "Your email has been verified successfully!"
              : error || "Something went wrong during verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!loading && (
            <>
              {verified ? (
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Sign In to Your Account
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
                  Back to Sign Up
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
