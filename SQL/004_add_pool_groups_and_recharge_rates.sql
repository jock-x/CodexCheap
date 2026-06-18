USE `codexcheap`;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `name` VARCHAR(128) NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @migration_name = '004_add_pool_groups_and_recharge_rates';
SET @migration_already_applied = (
  SELECT COUNT(*)
  FROM `schema_migrations`
  WHERE `name` = @migration_name
);

CREATE TABLE IF NOT EXISTS `recharge_rate_rules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `recharge_plan_id` BIGINT NOT NULL,
  `multiplier` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
  `pool_group` INT NOT NULL DEFAULT 2 COMMENT '1=Pro, 2=Plus, 3=Team, 4=未知',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recharge_rate_rules_plan` (`recharge_plan_id`),
  KEY `idx_recharge_rate_rules_pool_group` (`pool_group`),
  KEY `idx_recharge_rate_rules_deleted_enabled` (`deleted_at`, `is_enabled`),
  CONSTRAINT `fk_recharge_rate_rules_plan` FOREIGN KEY (`recharge_plan_id`) REFERENCES `recharge_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `recharge_rate_rules`
  MODIFY COLUMN `pool_group` INT NOT NULL DEFAULT 2 COMMENT '1=Pro, 2=Plus, 3=Team, 4=未知';

SET @has_package_pool_group = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'package_plans'
    AND COLUMN_NAME = 'pool_group'
);

SET @add_package_pool_group = IF(
  @has_package_pool_group = 0,
  'ALTER TABLE `package_plans` ADD COLUMN `pool_group` INT NOT NULL DEFAULT 2 COMMENT ''1=Pro, 2=Plus, 3=Team, 4=未知'' AFTER `multiplier`',
  'SELECT 1'
);
PREPARE stmt FROM @add_package_pool_group;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `package_plans`
  MODIFY COLUMN `pool_group` INT NOT NULL DEFAULT 2 COMMENT '1=Pro, 2=Plus, 3=Team, 4=未知';

UPDATE `package_plans`
SET `pool_group` = 2
WHERE @migration_already_applied = 0
  AND `pool_group` = 4;

DELETE r_unknown
FROM `recharge_rate_rules` r_unknown
JOIN `recharge_rate_rules` r_plus
  ON r_unknown.`recharge_plan_id` = r_plus.`recharge_plan_id`
 AND r_unknown.`pool_group` = 4
 AND r_plus.`pool_group` = 2
WHERE @migration_already_applied = 0;

UPDATE `recharge_rate_rules`
SET `pool_group` = 2
WHERE @migration_already_applied = 0
  AND `pool_group` = 4;

INSERT INTO `recharge_rate_rules`
(
  `recharge_plan_id`,
  `multiplier`,
  `pool_group`,
  `is_enabled`,
  `created_at`,
  `updated_at`
)
SELECT
  p.`id`,
  p.`multiplier`,
  2,
  p.`is_enabled`,
  NOW(),
  NOW()
FROM `recharge_plans` p
WHERE @migration_already_applied = 0
  AND p.`deleted_at` IS NULL
  AND p.`multiplier` > 0
  AND NOT EXISTS (
    SELECT 1
    FROM `recharge_rate_rules` r
    WHERE r.`recharge_plan_id` = p.`id`
      AND r.`pool_group` = 2
  );

DELETE r1
FROM `recharge_rate_rules` r1
JOIN `recharge_rate_rules` r2
  ON r1.`recharge_plan_id` = r2.`recharge_plan_id`
 AND r1.`pool_group` = r2.`pool_group`
 AND r1.`id` > r2.`id`;

SET @has_recharge_rate_unique = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recharge_rate_rules'
    AND INDEX_NAME = 'uk_recharge_rate_rules_plan_pool'
);

SET @add_recharge_rate_unique = IF(
  @has_recharge_rate_unique = 0,
  'ALTER TABLE `recharge_rate_rules` ADD UNIQUE KEY `uk_recharge_rate_rules_plan_pool` (`recharge_plan_id`, `pool_group`)',
  'SELECT 1'
);
PREPARE stmt FROM @add_recharge_rate_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_package_pool_group_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'package_plans'
    AND INDEX_NAME = 'idx_package_plans_pool_group'
);

SET @add_package_pool_group_index = IF(
  @has_package_pool_group_index = 0,
  'ALTER TABLE `package_plans` ADD INDEX `idx_package_plans_pool_group` (`pool_group`)',
  'SELECT 1'
);
PREPARE stmt FROM @add_package_pool_group_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`name`, `applied_at`)
VALUES (@migration_name, NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
