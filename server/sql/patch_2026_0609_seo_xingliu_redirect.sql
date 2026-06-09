-- UIED-NAV SEO 中心运营短链补丁：补齐 /xingliu 推广短链（可重复执行）
-- 适用场景：老客户已有数据库，不想重跑 customer/starter.sql 覆盖后台配置。
-- 兼容说明：仅使用 MySQL 5.6 可用字符串函数，不依赖 JSON_EXTRACT / JSON_SET。
-- 执行方式：
-- mysql --default-character-set=utf8mb4 -u <user> -p <database> < server/sql/patch_2026_0609_seo_xingliu_redirect.sql

SET NAMES utf8mb4;
SET @now_ts := UNIX_TIMESTAMP();
SET @xingliu_target := 'https://www.xingliu.art/?souceid=005903&utm=cg&cgv=dqndprwn2z';
SET @xingliu_redirect_item := CONCAT(
  '{"id":"uied_redirect_xingliu","from":"/xingliu","to":"',
  @xingliu_target,
  '","type":"302","enabled":true,"preserveQuery":false,"sort":10,"note":"星流推广短链"}'
);
SET @seo_center_default_json := CONCAT('{"redirects":[', @xingliu_redirect_item, ']}');

START TRANSACTION;

-- 1) 没有 SEO 中心配置时，直接插入默认短链配置。
INSERT INTO `uied_site_setting` (`key`, `value`, `description`, `create_time`, `update_time`)
SELECT
  'seoCenterConfig',
  @seo_center_default_json,
  'SEO中心与运营短链配置',
  @now_ts,
  @now_ts
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM `uied_site_setting`
  WHERE `key` = 'seoCenterConfig'
);

-- 2) 配置存在但为空或空对象时，只补默认值，不影响其它配置项。
UPDATE `uied_site_setting`
SET
  `value` = @seo_center_default_json,
  `description` = IF(COALESCE(`description`, '') = '', 'SEO中心与运营短链配置', `description`),
  `update_time` = @now_ts
WHERE `key` = 'seoCenterConfig'
  AND (
    COALESCE(`value`, '') = ''
    OR TRIM(`value`) = '{}'
  );

-- 3) JSON 对象里存在 redirects 数组时，定位数组左括号后追加；兼容空格/换行格式化。
UPDATE `uied_site_setting`
SET
  `value` = INSERT(
    `value`,
    LOCATE('[', `value`, LOCATE('"redirects"', `value`)) + 1,
    0,
    IF(
      SUBSTRING(TRIM(SUBSTRING(`value`, LOCATE('[', `value`, LOCATE('"redirects"', `value`)) + 1)), 1, 1) = ']',
      @xingliu_redirect_item,
      CONCAT(@xingliu_redirect_item, ',')
    )
  ),
  `description` = IF(COALESCE(`description`, '') = '', 'SEO中心与运营短链配置', `description`),
  `update_time` = @now_ts
WHERE `key` = 'seoCenterConfig'
  AND INSTR(`value`, '"/xingliu"') = 0
  AND INSTR(`value`, 'uied_redirect_xingliu') = 0
  AND LOCATE('"redirects"', `value`) > 0
  AND LOCATE('[', `value`, LOCATE('"redirects"', `value`)) > 0;

-- 4) JSON 对象缺少 redirects 字段时，在对象头部插入 redirects；其它字段原样保留。
UPDATE `uied_site_setting`
SET
  `value` = CONCAT('{"redirects":[', @xingliu_redirect_item, '],', SUBSTRING(TRIM(`value`), 2)),
  `description` = IF(COALESCE(`description`, '') = '', 'SEO中心与运营短链配置', `description`),
  `update_time` = @now_ts
WHERE `key` = 'seoCenterConfig'
  AND INSTR(`value`, '"/xingliu"') = 0
  AND INSTR(`value`, 'uied_redirect_xingliu') = 0
  AND INSTR(`value`, '"redirects"') = 0
  AND LEFT(TRIM(`value`), 1) = '{'
  AND RIGHT(TRIM(`value`), 1) = '}'
  AND TRIM(`value`) <> '{}';

COMMIT;
