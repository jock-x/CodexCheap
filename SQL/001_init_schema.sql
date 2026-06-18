CREATE DATABASE IF NOT EXISTS `codexcheap`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `codexcheap`;

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_name` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(512) NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_users_user_name` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sites` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `support_type` INT NOT NULL DEFAULT 3 COMMENT '1=按量, 2=套餐, 3=按量+套餐',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `remark` VARCHAR(1000) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sites_deleted_enabled` (`deleted_at`, `is_enabled`),
  KEY `idx_sites_support_type` (`support_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `recharge_plans` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `site_id` BIGINT NOT NULL,
  `cny_amount` DECIMAL(18, 6) NOT NULL,
  `usd_credit` DECIMAL(18, 6) NOT NULL,
  `multiplier` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
  `expire_days` INT NOT NULL DEFAULT 0 COMMENT '0=永不过期',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recharge_plans_site` (`site_id`),
  KEY `idx_recharge_plans_deleted_enabled` (`deleted_at`, `is_enabled`),
  CONSTRAINT `fk_recharge_plans_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `package_plans` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `site_id` BIGINT NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `price_cny` DECIMAL(18, 6) NOT NULL,
  `duration_days` INT NOT NULL,
  `multiplier` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_package_plans_site` (`site_id`),
  KEY `idx_package_plans_deleted_enabled` (`deleted_at`, `is_enabled`),
  CONSTRAINT `fk_package_plans_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `package_quota_rules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `package_plan_id` BIGINT NOT NULL,
  `quota_type` INT NOT NULL COMMENT '1=日限额, 2=周限额, 3=月限额, 4=套餐总额度',
  `amount_usd` DECIMAL(18, 6) NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_package_quota_rules_plan` (`package_plan_id`),
  KEY `idx_package_quota_rules_deleted_enabled` (`deleted_at`, `is_enabled`),
  CONSTRAINT `fk_package_quota_rules_plan` FOREIGN KEY (`package_plan_id`) REFERENCES `package_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
