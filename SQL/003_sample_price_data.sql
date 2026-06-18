USE `codexcheap`;

INSERT INTO `sites` (`name`, `url`, `support_type`, `is_enabled`, `remark`)
VALUES ('示例中转站', 'https://example.com', 3, 1, '用于验证价格计算，可按需删除。');

SET @site_id = LAST_INSERT_ID();

INSERT INTO `recharge_plans` (`site_id`, `cny_amount`, `usd_credit`, `multiplier`, `expire_days`, `is_enabled`)
VALUES (@site_id, 10.000000, 130.000000, 0.130000, 0, 1);

INSERT INTO `package_plans` (`site_id`, `name`, `price_cny`, `duration_days`, `multiplier`, `is_enabled`)
VALUES (@site_id, '周卡总额度示例', 28.000000, 7, 1.000000, 1);

SET @package_id = LAST_INSERT_ID();

INSERT INTO `package_quota_rules` (`package_plan_id`, `quota_type`, `amount_usd`, `is_enabled`)
VALUES (@package_id, 4, 300.000000, 1);
