/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
 *
 * @file pages/Install/index.tsx
 * @description 安装向导页面：环境检测 + 一键初始化 + 管理员创建
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  InstallDbTestResult,
  InstallLicenseCheckResult,
  getInstallEnvCheck,
  getInstallStatus,
  runInstallDbTest,
  runInstallLicenseCheck,
  runInstallInitialize,
  InstallEnvResult,
  InstallStatus,
} from '../../services/installService';
import { DEFAULT_BRAND_CONFIG } from '../../config/brandConfig';
import './index.css';

/**
 * 格式化时间戳显示
 */
const formatUnixTime = (unixSeconds: number): string => {
  if (!unixSeconds || unixSeconds <= 0) return '-';
  const date = new Date(unixSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * 获取检查项状态文本
 */
const resolveCheckStatusText = (status: string): string => {
  if (status === 'pass') return '通过';
  if (status === 'warn') return '警告';
  if (status === 'fail') return '失败';
  return '未知';
};

/**
 * 获取安装页默认绑定域名（自动带入当前访问域名）
 */
const resolveDefaultBindDomain = (): string => {
  if (typeof window === 'undefined') return '';
  const host = String(window.location.hostname || '').trim().toLowerCase();
  if (!host) return '';
  if ([ 'localhost', '127.0.0.1', '::1' ].includes(host)) return '';
  return host;
};

/**
 * 解析安装步骤状态，便于安装页按“授权优先”展示当前进度。
 */
const resolveStepStatus = (
  ready: boolean,
  blocked: boolean
): 'done' | 'current' | 'pending' => {
  if (ready) return 'done';
  if (blocked) return 'current';
  return 'pending';
};

/**
 * 安装向导主页面
 */
const InstallPage: React.FC = () => {
  const brandConfig = DEFAULT_BRAND_CONFIG;
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [envLoading, setEnvLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [dbTestLoading, setDbTestLoading] = useState<boolean>(false);
  const [licenseCheckLoading, setLicenseCheckLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<InstallStatus | null>(null);
  const [envData, setEnvData] = useState<InstallEnvResult | null>(null);
  const [dbTestResult, setDbTestResult] = useState<InstallDbTestResult | null>(null);
  const [licenseCheckResult, setLicenseCheckResult] = useState<InstallLicenseCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitMessage, setSubmitMessage] = useState<string>('');

  const [formData, setFormData] = useState({
    siteName: brandConfig.installSiteName,
    siteTitle: brandConfig.installSiteTitle,
    siteDescription: brandConfig.installSiteDescription,
    siteKeywords: brandConfig.installSiteKeywords,
    licenseKey: '',
    bindDomain: '',
    adminUsername: 'admin',
    adminPassword: '',
    confirmPassword: '',
    adminNickname: brandConfig.installAdminNickname,
    adminEmail: '',
    importDemoData: true,
  });

  const [dbFormData, setDbFormData] = useState({
    host: '127.0.0.1',
    port: '3306',
    username: '',
    password: '',
    database: '',
  });
  const licenseCheckPassed = Boolean(licenseCheckResult?.valid);
  const dbReady = Boolean(dbTestResult?.success);

  /**
   * 计算当前是否允许执行安装
   */
  const canInitialize = useMemo(() => {
    if (!envData?.canInstall) return false;
    if (statusData?.installed) return false;
    if (!licenseCheckPassed) return false;
    if (!formData.adminUsername.trim() || !formData.adminPassword.trim()) return false;
    if (formData.adminPassword !== formData.confirmPassword) return false;
    return true;
  }, [envData, statusData, formData, licenseCheckPassed]);

  /**
   * 安装步骤摘要：明确要求先完成授权，再做数据库与初始化。
   */
  const installSteps = useMemo(() => {
    const installed = Boolean(statusData?.installed);
    return [
      {
        key: 'license',
        title: '步骤 1：授权校验',
        desc: `先在 ${brandConfig.officialSiteUrl} 购买并绑定域名，再校验授权码。`,
        status: resolveStepStatus(licenseCheckPassed, !installed),
      },
      {
        key: 'database',
        title: '步骤 2：数据库测试',
        desc: '建议先验证宝塔 MySQL 参数，避免初始化中途失败。',
        status: resolveStepStatus(dbReady, !installed && licenseCheckPassed),
      },
      {
        key: 'initialize',
        title: '步骤 3：初始化安装',
        desc: '授权通过后再写入站点信息并创建管理员。',
        status: resolveStepStatus(installed, !installed && licenseCheckPassed),
      },
    ];
  }, [brandConfig.officialSiteUrl, dbReady, licenseCheckPassed, statusData?.installed]);

  /**
   * 拉取安装状态
   */
  const fetchInstallStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await getInstallStatus();
      setStatusData(data);
    } catch (error: any) {
      setErrorMessage(error?.message || '获取安装状态失败');
    } finally {
      setStatusLoading(false);
    }
  };

  /**
   * 拉取环境检测结果
   */
  const fetchEnvCheck = async () => {
    setEnvLoading(true);
    try {
      const data = await getInstallEnvCheck();
      setEnvData(data);
    } catch (error: any) {
      setErrorMessage(error?.message || '获取环境检测失败');
    } finally {
      setEnvLoading(false);
    }
  };

  /**
   * 刷新安装向导数据
   */
  const refreshData = async () => {
    setRefreshing(true);
    setErrorMessage('');
    setSubmitMessage('');
    try {
      await Promise.all([fetchInstallStatus(), fetchEnvCheck()]);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 初始化加载
   */
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 首次进入安装页时自动填入当前域名，减少人工输入
   */
  useEffect(() => {
    setFormData(prev => {
      if (String(prev.bindDomain || '').trim()) {
        return prev;
      }
      const fallbackDomain = resolveDefaultBindDomain();
      if (!fallbackDomain) {
        return prev;
      }
      return {
        ...prev,
        bindDomain: fallbackDomain,
      };
    });
  }, []);

  /**
   * 更新表单字段
   */
  const updateFormField = (key: string, value: string) => {
    if (key === 'licenseKey' || key === 'bindDomain') {
      setLicenseCheckResult(null);
    }
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 更新数据库测试表单字段
   */
  const updateDbFormField = (key: string, value: string) => {
    setDbFormData(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 执行数据库连接测试
   */
  const handleDbTest = async () => {
    const host = dbFormData.host.trim();
    const username = dbFormData.username.trim();
    const database = dbFormData.database.trim();
    const port = Number.parseInt(dbFormData.port, 10) || 3306;
    if (!host) {
      setErrorMessage('数据库主机不能为空');
      return;
    }
    if (!username) {
      setErrorMessage('数据库用户名不能为空');
      return;
    }
    if (!database) {
      setErrorMessage('数据库名称不能为空');
      return;
    }
    setErrorMessage('');
    setDbTestLoading(true);
    try {
      const result = await runInstallDbTest({
        host,
        port,
        username,
        password: dbFormData.password,
        database,
      });
      setDbTestResult(result);
      if (!result.success) {
        setErrorMessage(result.message || '数据库连接失败');
      }
    } catch (error: any) {
      setErrorMessage(error?.message || '数据库连接测试失败');
      setDbTestResult(null);
    } finally {
      setDbTestLoading(false);
    }
  };

  /**
   * 执行安装初始化
   */
  const handleInitialize = async () => {
    if (!canInitialize || submitLoading) return;
    if (!licenseCheckPassed) {
      setErrorMessage('请先完成授权码校验，通过后再执行初始化');
      return;
    }
    if (!formData.licenseKey.trim()) {
      setErrorMessage('请先填写授权码 Key');
      return;
    }
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(formData.adminUsername.trim())) {
      setErrorMessage('管理员账号需为4-20位字母/数字/下划线');
      return;
    }
    if (formData.adminPassword.length < 6 || formData.adminPassword.length > 32) {
      setErrorMessage('管理员密码长度需在6-32位之间');
      return;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      setErrorMessage('两次输入的密码不一致');
      return;
    }

    setErrorMessage('');
    setSubmitMessage('');
    setSubmitLoading(true);
    try {
      const result = await runInstallInitialize({
        siteName: formData.siteName,
        siteTitle: formData.siteTitle,
        siteDescription: formData.siteDescription,
        siteKeywords: formData.siteKeywords,
        licenseKey: formData.licenseKey,
        bindDomain: formData.bindDomain,
        adminUsername: formData.adminUsername,
        adminPassword: formData.adminPassword,
        adminNickname: formData.adminNickname,
        adminEmail: formData.adminEmail,
        importDemoData: formData.importDemoData,
      });
      setSubmitMessage(
        `安装完成：站点「${result.site.siteName}」，管理员「${result.admin.username}」，授权版本「${String(
          result.license?.edition || '-'
        ).toUpperCase()}」${result.deliveryInit?.imported ? '，已自动导入默认演示数据' : ''}。请前往 /admin 登录。`
      );
      await refreshData();
    } catch (error: any) {
      setErrorMessage(error?.message || '安装初始化失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  /**
   * 预校验授权码（仅校验，不写入本地）
   */
  const handleLicenseCheck = async () => {
    if (licenseCheckLoading || submitLoading) return;
    const licenseKey = String(formData.licenseKey || '').trim();
    const bindDomain = String(formData.bindDomain || '').trim();
    if (!licenseKey) {
      setErrorMessage('请先填写授权码 Key');
      return;
    }
    setErrorMessage('');
    setSubmitMessage('');
    setLicenseCheckLoading(true);
    try {
      const result = await runInstallLicenseCheck({
        licenseKey,
        bindDomain,
      });
      setLicenseCheckResult(result);
    } catch (error: any) {
      setLicenseCheckResult(null);
      setErrorMessage(error?.message || '授权码校验失败');
    } finally {
      setLicenseCheckLoading(false);
    }
  };

  return (
    <div className="install-page">
      <div className="install-page__container">
        <div className="install-page__header">
          <h1>{brandConfig.installPageTitle}</h1>
          <p>{brandConfig.installPageDescription}</p>
          <button
            type="button"
            className="install-page__refresh-btn"
            onClick={refreshData}
            disabled={refreshing || submitLoading}
          >
            {refreshing ? '刷新中...' : '刷新检测'}
          </button>
        </div>

        <div className="install-steps">
          {installSteps.map((item) => (
            <div key={item.key} className={`install-step install-step--${item.status}`}>
              <div className="install-step__title">{item.title}</div>
              <div className="install-step__desc">{item.desc}</div>
            </div>
          ))}
        </div>

        {errorMessage ? (
          <div className="install-alert install-alert--error">{errorMessage}</div>
        ) : null}
        {submitMessage ? (
          <div className="install-alert install-alert--success">{submitMessage}</div>
        ) : null}

        <div className="install-card">
          <h2>安装状态</h2>
          {statusLoading ? (
            <div className="install-empty">加载中...</div>
          ) : (
            <div className="install-status-grid">
              <div className="install-status-item">
                <span className="label">是否已安装</span>
                <span className={`value ${statusData?.installed ? 'is-ok' : 'is-pending'}`}>
                  {statusData?.installed ? '已安装' : '未安装'}
                </span>
              </div>
              <div className="install-status-item">
                <span className="label">管理员数量</span>
                <span className="value">{statusData?.adminCount ?? 0}</span>
              </div>
              <div className="install-status-item">
                <span className="label">完成时间</span>
                <span className="value">
                  {formatUnixTime(Number((statusData?.installState as any)?.completedAt || 0))}
                </span>
              </div>
              <div className="install-status-item">
                <span className="label">向导版本</span>
                <span className="value">{statusData?.wizardVersion || '-'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="install-card">
          <h2>环境检测</h2>
          {envLoading ? (
            <div className="install-empty">检测中...</div>
          ) : (
            <>
              <div className="install-env-summary">
                <span>通过 {envData?.passCount ?? 0}</span>
                <span>警告 {envData?.warnCount ?? 0}</span>
                <span>失败 {envData?.failCount ?? 0}</span>
              </div>
              <div className="install-env-list">
                {(envData?.checks || []).map(item => (
                  <div key={item.key} className={`install-env-item status-${item.status}`}>
                    <div className="row-main">
                      <strong>{item.label}</strong>
                      <span>{resolveCheckStatusText(item.status)}</span>
                    </div>
                    <div className="row-sub">{item.value}</div>
                    <div className="row-sub">{item.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="install-card">
          <h2>步骤 1：授权校验</h2>
          <p className="install-card__desc">
            先在
            {' '}
            <a href={brandConfig.buyUrl} target="_blank" rel="noreferrer">
              {brandConfig.brandName}
            </a>
            {' '}
            完成购买并绑定域名，然后在这里校验授权码；校验通过后才允许执行初始化。
          </p>
          <div className="install-form-grid">
            <label className="is-full">
              授权码 Key
              <input
                type="text"
                value={formData.licenseKey}
                onChange={(event) => updateFormField('licenseKey', event.target.value)}
                placeholder={`请输入 ${brandConfig.brandName} 下发的授权码（例如 LIC-XXXX-XXXX）`}
              />
            </label>
            <label className="is-full">
              绑定域名
              <input
                type="text"
                value={formData.bindDomain}
                onChange={(event) => updateFormField('bindDomain', event.target.value)}
                placeholder="正式环境请填写实际域名；本地 localhost 可留空"
              />
            </label>
          </div>
          <div className="install-form-footer">
            <button
              type="button"
              className="install-page__submit-btn install-page__submit-btn--ghost"
              disabled={licenseCheckLoading || submitLoading || !String(formData.licenseKey || '').trim()}
              onClick={handleLicenseCheck}
            >
              {licenseCheckLoading ? '校验中...' : '校验授权码'}
            </button>
            {licenseCheckResult ? (
              <span className="tip is-success">
                {`校验通过：${String(licenseCheckResult.edition || '-').toUpperCase()} / 域名额度 ${licenseCheckResult.domainWhitelist.length}/${licenseCheckResult.domainLimit}`}
              </span>
            ) : (
              <span className="tip">
                {String(formData.bindDomain || '').trim()
                  ? `请确认该域名已在 ${brandConfig.officialSiteUrl} 授权中心绑定。`
                  : '本地联调可留空；正式安装建议填写真实域名后校验。'}
              </span>
            )}
          </div>
          {licenseCheckResult ? (
            <div className="install-status-grid install-status-grid--detail">
              <div className="install-status-item">
                <span className="label">授权版本</span>
                <span className="value">{String(licenseCheckResult.edition || '-').toUpperCase()}</span>
              </div>
              <div className="install-status-item">
                <span className="label">授权状态</span>
                <span className="value is-ok">{licenseCheckResult.status || '-'}</span>
              </div>
              <div className="install-status-item">
                <span className="label">授权码</span>
                <span className="value">{licenseCheckResult.licenseKeyMasked || '-'}</span>
              </div>
              <div className="install-status-item">
                <span className="label">项目编码</span>
                <span className="value">{licenseCheckResult.projectCode || '-'}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="install-card">
          <h2>步骤 2：数据库连接测试</h2>
          <p className="install-card__desc">用于安装前验证宝塔 MySQL 连接参数是否可用</p>
          <div className="install-form-grid install-form-grid--compact">
            <label>
              主机
              <input
                type="text"
                value={dbFormData.host}
                onChange={(event) => updateDbFormField('host', event.target.value)}
                placeholder="127.0.0.1"
              />
            </label>
            <label>
              端口
              <input
                type="number"
                value={dbFormData.port}
                onChange={(event) => updateDbFormField('port', event.target.value)}
                placeholder="3306"
              />
            </label>
            <label>
              用户名
              <input
                type="text"
                value={dbFormData.username}
                onChange={(event) => updateDbFormField('username', event.target.value)}
                placeholder="数据库用户名"
              />
            </label>
            <label>
              数据库名
              <input
                type="text"
                value={dbFormData.database}
                onChange={(event) => updateDbFormField('database', event.target.value)}
                placeholder="数据库名称"
              />
            </label>
            <label className="is-full">
              密码
              <input
                type="password"
                value={dbFormData.password}
                onChange={(event) => updateDbFormField('password', event.target.value)}
                placeholder="数据库密码"
              />
            </label>
          </div>
          <div className="install-form-footer">
            <button
              type="button"
              className="install-page__submit-btn install-page__submit-btn--ghost"
              onClick={handleDbTest}
              disabled={dbTestLoading}
            >
              {dbTestLoading ? '测试中...' : '测试连接'}
            </button>
            {dbTestResult ? (
              <span className={`tip ${dbTestResult.success ? 'is-success' : 'is-error'}`}>
                {dbTestResult.success
                  ? `连接成功：MySQL ${dbTestResult.version || '-'} / DB ${dbTestResult.databaseName || '-'}`
                  : `连接失败：${dbTestResult.message || '请检查参数'}`}
              </span>
            ) : (
              <span className="tip">建议先测试连接，再执行初始化</span>
            )}
          </div>
        </div>

        <div className="install-card">
          <h2>步骤 3：初始化安装</h2>
          <p className="install-card__desc">
            这一步负责写入站点信息、创建管理员；可选自动导入默认演示数据。授权必须先校验通过，否则不允许继续。
          </p>
          <div className="install-form-grid">
            <label>
              站点名称
              <input
                type="text"
                value={formData.siteName}
                onChange={(event) => updateFormField('siteName', event.target.value)}
                placeholder="请输入站点名称"
              />
            </label>
            <label>
              站点标题
              <input
                type="text"
                value={formData.siteTitle}
                onChange={(event) => updateFormField('siteTitle', event.target.value)}
                placeholder="请输入站点标题"
              />
            </label>
            <label className="is-full">
              站点描述
              <textarea
                rows={3}
                value={formData.siteDescription}
                onChange={(event) => updateFormField('siteDescription', event.target.value)}
                placeholder="请输入站点描述"
              />
            </label>
            <label className="is-full">
              站点关键词
              <input
                type="text"
                value={formData.siteKeywords}
                onChange={(event) => updateFormField('siteKeywords', event.target.value)}
                placeholder="多个关键词可用英文逗号分隔"
              />
            </label>
            <label>
              管理员账号
              <input
                type="text"
                value={formData.adminUsername}
                onChange={(event) => updateFormField('adminUsername', event.target.value)}
                placeholder="4-20位字母/数字/下划线"
              />
            </label>
            <label>
              管理员昵称
              <input
                type="text"
                value={formData.adminNickname}
                onChange={(event) => updateFormField('adminNickname', event.target.value)}
                placeholder="请输入管理员昵称"
              />
            </label>
            <label>
              管理员密码
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(event) => updateFormField('adminPassword', event.target.value)}
                placeholder="6-32位"
              />
            </label>
            <label>
              确认密码
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => updateFormField('confirmPassword', event.target.value)}
                placeholder="请再次输入密码"
              />
            </label>
            <label className="is-full">
              管理员邮箱（可选）
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(event) => updateFormField('adminEmail', event.target.value)}
                placeholder="example@domain.com"
              />
            </label>
          </div>
          <div className="install-option-card">
            <label className="install-option-card__checkbox">
              <input
                type="checkbox"
                checked={formData.importDemoData}
                onChange={(event) => setFormData(prev => ({ ...prev, importDemoData: event.target.checked }))}
              />
              <span>自动导入默认演示数据（推荐）</span>
            </label>
            <p className="install-option-card__desc">
              开启后，安装完成会自动写入默认分类、标签、示例网址、示例文章和基础前台配置。这样客户第一次打开不是空站，后续再按需替换为自己的数据。
            </p>
          </div>
          <div className="install-form-footer">
            <button
              type="button"
              className="install-page__submit-btn"
              disabled={!canInitialize || submitLoading}
              onClick={handleInitialize}
            >
              {submitLoading ? '初始化中...' : '执行初始化'}
            </button>
            {licenseCheckPassed ? (
              <span className="tip is-success">
                授权已校验通过，可以开始安装
              </span>
            ) : (
              <span className="tip">
                {statusData?.installed
                  ? '当前系统已安装，如需重装请先清理管理员数据。'
                  : '请先完成“步骤 1：授权校验”，通过后再执行初始化。'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
