export type SubscriptionTier = "starter" | "pro" | "studio" | "enterprise";

export interface TierConfig {
  label: string;
  price: number;
  maxFileSize: number; // bytes
  maxFileSizeLabel: string;
  totalStorage: number; // bytes
  totalStorageLabel: string;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  starter: {
    label: "Starter",
    price: 9,
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2 GB
    maxFileSizeLabel: "2 GB",
    totalStorage: 1024 * 1024 * 1024 * 1024, // 1 TB
    totalStorageLabel: "1 TB",
  },
  pro: {
    label: "Pro",
    price: 19,
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB
    maxFileSizeLabel: "5 GB",
    totalStorage: 5 * 1024 * 1024 * 1024 * 1024, // 5 TB
    totalStorageLabel: "5 TB",
  },
  studio: {
    label: "Studio",
    price: 49,
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB
    maxFileSizeLabel: "10 GB",
    totalStorage: 20 * 1024 * 1024 * 1024 * 1024, // 20 TB
    totalStorageLabel: "20 TB",
  },
  enterprise: {
    label: "Enterprise",
    price: 149,
    maxFileSize: 25 * 1024 * 1024 * 1024, // 25 GB
    maxFileSizeLabel: "25 GB",
    totalStorage: 100 * 1024 * 1024 * 1024 * 1024, // 100 TB
    totalStorageLabel: "100 TB",
  },
};
