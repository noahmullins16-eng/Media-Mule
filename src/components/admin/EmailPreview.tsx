import { useState } from "react";
import { Mail, ChevronDown, ChevronUp } from "lucide-react";

const EMAIL_TEMPLATES = [
  {
    id: "signup",
    name: "Signup Confirmation",
    subject: "Welcome to Media Mule — Confirm Your Account",
    description: "Sent when a new user registers an account.",
  },
  {
    id: "recovery",
    name: "Password Reset",
    subject: "Reset your Media Mule password",
    description: "Sent when a user requests a password reset.",
  },
  {
    id: "magiclink",
    name: "Magic Link Login",
    subject: "Your Media Mule login link",
    description: "Sent when a user requests a passwordless login link.",
  },
  {
    id: "invite",
    name: "User Invitation",
    subject: "You've been invited to Media Mule",
    description: "Sent when a user is invited to join the platform.",
  },
  {
    id: "email_change",
    name: "Email Change Confirmation",
    subject: "Confirm your new email — Media Mule",
    description: "Sent when a user changes their email address.",
  },
  {
    id: "reauthentication",
    name: "Reauthentication Code",
    subject: "Your Media Mule verification code",
    description: "Sent when a user needs to verify their identity.",
  },
];

// Static HTML previews matching the actual email templates
const generatePreviewHtml = (templateId: string): string => {
  const styles = `
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: 'Space Grotesk', Arial, sans-serif; }
    .container { padding: 32px 25px; }
    .logo { margin-bottom: 24px; width: 48px; height: 48px; }
    h1 { font-size: 22px; font-weight: bold; color: hsl(220, 20%, 10%); margin: 0 0 20px; }
    .text { font-size: 14px; color: hsl(220, 10%, 40%); line-height: 1.6; margin: 0 0 16px; }
    .button { display: inline-block; background-color: hsl(193, 72%, 64%); color: #ffffff !important; font-size: 14px; font-weight: 600; border-radius: 12px; padding: 12px 24px; text-decoration: none; }
    .code { font-family: Courier, monospace; font-size: 22px; font-weight: bold; color: hsl(220, 20%, 10%); margin: 0 0 30px; }
    .footer { font-size: 12px; color: #999999; margin: 30px 0 0; }
    .footer a { color: hsl(193, 72%, 64%); text-decoration: none; }
    a.link { color: hsl(193, 72%, 64%); text-decoration: underline; }
  `;

  const logo = `<img src="https://mediamuleco.com/favicon.png" alt="Media Mule" width="48" height="48" class="logo" />`;
  const footer = `<p class="footer"><a href="https://mediamuleco.com">MediaMuleco.com</a></p>`;

  const templates: Record<string, string> = {
    signup: `
      ${logo}
      <h1>Hi there,</h1>
      <p class="text">Welcome to Media Mule! We're excited to have you join our community.</p>
      <p class="text">Media Mule is designed to make working with media simple and secure.</p>
      <p class="text">To get started, please confirm your email address by clicking the link below:</p>
      <a href="#" class="button">Confirm Your Account</a>
      <p class="text" style="margin-top:16px">Once your account is confirmed, you'll be able to log in, set up your profile, and start exchanging media securely.</p>
      <p class="text">If you didn't create a Media Mule account, you can safely ignore this email.</p>
      <p class="text">Thanks for joining us, and welcome to the mule team.</p>
      <p class="text">Best,<br /><strong>The Media Mule Team</strong></p>
      ${footer}
    `,
    recovery: `
      ${logo}
      <h1>Reset your password</h1>
      <p class="text">We received a request to reset your password for Media Mule. Click the button below to choose a new password.</p>
      <a href="#" class="button">Reset Password</a>
      <p class="text" style="margin-top:16px">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      <p class="text">Best,<br /><strong>The Media Mule Team</strong></p>
      ${footer}
    `,
    magiclink: `
      ${logo}
      <h1>Your login link</h1>
      <p class="text">Click the button below to log in to Media Mule. This link will expire shortly.</p>
      <a href="#" class="button">Log In</a>
      <p class="text" style="margin-top:16px">If you didn't request this link, you can safely ignore this email.</p>
      ${footer}
    `,
    invite: `
      ${logo}
      <h1>You've been invited</h1>
      <p class="text">You've been invited to join <a href="#" class="link"><strong>Media Mule</strong></a>. Click the button below to accept the invitation and create your account.</p>
      <a href="#" class="button">Accept Invitation</a>
      <p class="text" style="margin-top:16px">If you weren't expecting this invitation, you can safely ignore this email.</p>
      ${footer}
    `,
    email_change: `
      ${logo}
      <h1>Confirm your email change</h1>
      <p class="text">You requested to change your email address for Media Mule from <a href="#" class="link">old@example.com</a> to <a href="#" class="link">new@example.com</a>.</p>
      <p class="text">Click the button below to confirm this change:</p>
      <a href="#" class="button">Confirm Email Change</a>
      <p class="text" style="margin-top:16px">If you didn't request this change, please secure your account immediately.</p>
      ${footer}
    `,
    reauthentication: `
      ${logo}
      <h1>Confirm reauthentication</h1>
      <p class="text">Use the code below to confirm your identity:</p>
      <p class="code">123456</p>
      <p class="text">This code will expire shortly. If you didn't request this, you can safely ignore this email.</p>
      ${footer}
    `,
  };

  return `<!DOCTYPE html><html><head><style>${styles}</style></head><body><div class="container">${templates[templateId] || ""}</div></body></html>`;
};

export const EmailPreview = () => {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  return (
    <div className="glass-card p-6">
      <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-accent" />
        Automated Email Templates
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Preview all automated emails sent by the platform. Click any template to expand its preview.
      </p>
      <div className="space-y-3">
        {EMAIL_TEMPLATES.map((template) => {
          const isExpanded = expandedTemplate === template.id;
          return (
            <div key={template.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{template.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent">
                      Auth
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Subject: {template.subject}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {template.description}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-3" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-3" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-border bg-white">
                  <iframe
                    srcDoc={generatePreviewHtml(template.id)}
                    className="w-full border-0"
                    style={{ height: "500px" }}
                    title={`${template.name} preview`}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
