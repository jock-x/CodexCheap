USE `codexcheap`;

-- Example only. Do not commit a real administrator password hash.
-- Generate a password hash for your deployment and keep the real seed script local.
-- Copy this file to SQL/002_seed_admin.sql, replace the placeholders, then run it.

INSERT INTO `admin_users`
(
  `user_name`,
  `password_hash`,
  `is_enabled`,
  `created_at`,
  `updated_at`
)
VALUES
(
  '<admin-user-name>',
  '<aspnet-password-hash>',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `is_enabled` = VALUES(`is_enabled`),
  `updated_at` = NOW();
