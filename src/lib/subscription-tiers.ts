export type SubscriptionTier = "basic" | "starter" | "pro" | "studio" | "enterprise";

export interface TierFeature {
  text: string;
  included: boolean;
}

export interface TierConfig {
  label: string;
  price: number | null; // null = custom pricing
  description: string;
  maxFileSize: number; // bytes
  maxFileSizeLabel: string;
  totalStorage: number; // bytes
  totalStorageLabel: string;
  devices: number | null;
  transactionFee: string;
  features: TierFeature[];
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  // Legacy tiers kept for backward compat
  starter: {
    label: "Basic",
    price: 9,
    description: "",
    maxFileSize: 2 * 1024 * 1024 * 1024,
    maxFileSizeLabel: "2 GB",
    totalStorage: 100 * 1024 * 1024 * 1024,
    totalStorageLabel: "100 GB",
    devices: 2,
    transactionFee: "3–4%",
    features: [],
  },
  pro: {
    label: "Studio",
    price: 19.99,
    description: "",
    maxFileSize: 5 * 1024 * 1024 * 1024,
    maxFileSizeLabel: "5 GB",
    totalStorage: 1024 * 1024 * 1024 * 1024,
    totalStorageLabel: "1 TB",
    devices: 8,
    transactionFee: "0%",
    features: [],
  },
  // Active tiers
  basic: {
    label: "Basic",
    price: 9.99,
    description: "",
    maxFileSize: 2 * 1024 * 1024 * 1024,
    maxFileSizeLabel: "2 GB",
    totalStorage: 100 * 1024 * 1024 * 1024,
    totalStorageLabel: "100 GB",
    devices: 2,
    transactionFee: "3–4%",
    features: [
      { text: "100 GB Storage", included: true },
      { text: "2 Devices", included: true },
      { text: "Transaction Fee 3–4% (aside from Stripe)", included: true },
      { text: "Basic Preview & Watermark Settings", included: true },
      { text: "Bulk Uploads", included: true },
      { text: "Invoices", included: true },
      { text: "Preview in Full Quality (option)", included: true },
    ],
  },
  studio: {
    label: "Studio",
    price: 19.99,
    description: "A powerful, all-in-one platform for managing and selling digital content, offering 1TB of storage and access across 8 devices.",
    maxFileSize: 10 * 1024 * 1024 * 1024,
    maxFileSizeLabel: "10 GB",
    totalStorage: 1024 * 1024 * 1024 * 1024,
    totalStorageLabel: "1 TB",
    devices: 8,
    transactionFee: "0%",
    features: [
      { text: "1 TB Storage", included: true },
      { text: "8 Devices", included: true },
      { text: "Unlimited Bulk Uploads", included: true },
      { text: "Preview in Full Quality (option)", included: true },
      { text: "No Transaction Fee (aside from Stripe)", included: true },
      { text: "Custom Watermark Preview (your own logo)", included: true },
      { text: "Revision Dashboard", included: true },
      { text: "Invoices", included: true },
    ],
  },
  enterprise: {
    label: "Enterprise",
    price: null,
    description: "An enterprise-grade solution built for scale, offering advanced customization, premium support, and powerful workflow tools tailored to your business.",
    maxFileSize: 25 * 1024 * 1024 * 1024,
    maxFileSizeLabel: "25 GB",
    totalStorage: 100 * 1024 * 1024 * 1024 * 1024,
    totalStorageLabel: "100 TB",
    devices: null,
    transactionFee: "Custom",
    features: [
      { text: "Fully custom plan & pricing", included: true },
      { text: "Possibilities are endless", included: true },
      { text: "Contact us for details", included: true },
    ],
  },
};

/** The active tiers shown on the pricing page (in display order) */
export const ACTIVE_TIERS: SubscriptionTier[] = ["basic", "studio", "enterprise"];
