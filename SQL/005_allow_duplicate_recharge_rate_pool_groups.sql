USE `codexcheap`;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `name` VARCHAR(128) NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @migration_name = '005_allow_duplicate_recharge_rate_pool_groups';

SET @has_recharge_rate_unique = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recharge_rate_rules'
    AND INDEX_NAME = 'uk_recharge_rate_rules_plan_pool'
);

SET @drop_recharge_rate_unique = IF(
  @has_recharge_rate_unique > 0,
  'ALTER TABLE `recharge_rate_rules` DROP INDEX `uk_recharge_rate_rules_plan_pool`',
  'SELECT 1'
);
PREPARE stmt FROM @drop_recharge_rate_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`name`, `applied_at`)
VALUES (@migration_name, NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
