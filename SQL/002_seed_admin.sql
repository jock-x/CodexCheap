USE `codexcheap`;

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
  'admin',
  'AQAAAAIAAYagAAAAEIA/vkRQg3PV7eimDzWJYrvnRvSoAWzHAWZVoaEYyVMSDtFRDxyrWXOSfdsMugUyqQ==',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `is_enabled` = VALUES(`is_enabled`),
  `updated_at` = NOW();
