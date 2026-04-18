ALTER TABLE creator_profiles ADD COLUMN username_locked boolean NOT NULL DEFAULT false;
UPDATE creator_profiles SET username_locked = true WHERE user_id = 'baad26e9-78bd-442d-b162-ee781e7d40b6';