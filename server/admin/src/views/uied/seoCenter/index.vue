<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
-->
<template>
    <div class="uied-seo-center">
        <el-card shadow="never" class="uied-seo-center__card">
            <template #header>
                <div class="uied-seo-center__header">
                    <div>
                        <h2>SEO中心</h2>
                        <p>统一管理 TDK、Robots、Sitemap、重定向、检测日志与自动任务。</p>
                    </div>
                    <div class="uied-seo-center__header-actions">
                        <el-button :loading="loading.config" @click="loadConfig">刷新配置</el-button>
                        <el-button :loading="loading.autoTaskStatus" @click="loadAutoTaskStatus">刷新任务状态</el-button>
                        <el-button type="primary" :loading="loading.saveConfig" @click="saveConfig">保存配置</el-button>
                    </div>
                </div>
            </template>

            <el-descriptions :column="5" border class="uied-seo-center__overview">
                <el-descriptions-item label="重定向规则">{{ overview.stats.redirectRuleCount }}</el-descriptions-item>
                <el-descriptions-item label="404 记录">{{ overview.stats.logs404Count }}</el-descriptions-item>
                <el-descriptions-item label="最近失效链接">{{ overview.stats.latestInvalidCount }}</el-descriptions-item>
                <el-descriptions-item label="最近检测问题">{{ overview.stats.latestDetectorIssueCount }}</el-descriptions-item>
                <el-descriptions-item label="自动任务最近执行">{{ formatDateTime(autoTaskStatus.state.lastRunAt) }}</el-descriptions-item>
            </el-descriptions>

            <el-tabs v-model="activeTab" class="uied-seo-center__tabs">
                <el-tab-pane label="基础配置" name="basic" lazy>
                    <el-tabs v-model="basicSubTab" class="uied-seo-center__sub-tabs" type="border-card">
                        <el-tab-pane label="TDK优化" name="tdk">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-form-item label="首页标题模板">
                                    <el-input v-model="configForm.tdkOptimization.homeTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="页面标题模板">
                                    <el-input v-model="configForm.tdkOptimization.pageTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="分类标题模板">
                                    <el-input v-model="configForm.tdkOptimization.categoryTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="标签标题模板">
                                    <el-input v-model="configForm.tdkOptimization.tagTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="文章标题模板">
                                    <el-input v-model="configForm.tdkOptimization.articleTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="网址标题模板">
                                    <el-input v-model="configForm.tdkOptimization.websiteTitleTemplate" />
                                </el-form-item>
                                <el-form-item label="描述模板">
                                    <el-input v-model="configForm.tdkOptimization.descriptionTemplate" />
                                </el-form-item>
                                <el-form-item label="关键词模板">
                                    <el-input v-model="configForm.tdkOptimization.keywordsTemplate" />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="图片与链接" name="media-link">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-divider content-position="left">图片优化</el-divider>
                                <el-form-item label="启用图片优化">
                                    <el-switch v-model="configForm.imageOptimization.enabled" />
                                </el-form-item>
                                <el-form-item label="优先 WebP">
                                    <el-switch v-model="configForm.imageOptimization.preferWebp" />
                                </el-form-item>
                                <el-form-item label="懒加载">
                                    <el-switch v-model="configForm.imageOptimization.lazyLoad" />
                                </el-form-item>
                                <el-form-item label="补齐宽高">
                                    <el-switch v-model="configForm.imageOptimization.addWidthHeight" />
                                </el-form-item>
                                <el-form-item label="最大图片宽度">
                                    <el-input-number v-model="configForm.imageOptimization.maxImageWidth" :min="320" :max="3840" />
                                </el-form-item>

                                <el-divider content-position="left">链接改写</el-divider>
                                <el-form-item label="启用链接改写">
                                    <el-switch v-model="configForm.linkRewrite.enabled" />
                                </el-form-item>
                                <el-form-item label="强制 HTTPS">
                                    <el-switch v-model="configForm.linkRewrite.forceHttps" />
                                </el-form-item>
                                <el-form-item label="路径转小写">
                                    <el-switch v-model="configForm.linkRewrite.lowerCasePath" />
                                </el-form-item>
                                <el-form-item label="去除尾斜杠">
                                    <el-switch v-model="configForm.linkRewrite.removeTrailingSlash" />
                                </el-form-item>
                                <el-form-item label="去除 index.html">
                                    <el-switch v-model="configForm.linkRewrite.stripIndexHtml" />
                                </el-form-item>
                                <el-form-item label="去追踪参数">
                                    <el-switch v-model="configForm.linkRewrite.removeTrackingParams" />
                                </el-form-item>
                                <el-form-item label="追踪参数名单">
                                    <el-input
                                        v-model="trackingParamsText"
                                        type="textarea"
                                        :rows="4"
                                        placeholder="每行一个，如：utm_source"
                                    />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="Robots 与 Sitemap" name="robots-sitemap">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-divider content-position="left">Robots</el-divider>
                                <el-form-item label="启用 Robots">
                                    <el-switch v-model="configForm.robots.enabled" />
                                </el-form-item>
                                <el-form-item label="User-agent">
                                    <el-input v-model="configForm.robots.userAgent" />
                                </el-form-item>
                                <el-form-item label="Allow 列表">
                                    <el-input v-model="robotsAllowText" type="textarea" :rows="3" placeholder="每行一个路径" />
                                </el-form-item>
                                <el-form-item label="Disallow 列表">
                                    <el-input v-model="robotsDisallowText" type="textarea" :rows="3" placeholder="每行一个路径" />
                                </el-form-item>
                                <el-form-item label="Crawl-delay">
                                    <el-input-number v-model="configForm.robots.crawlDelay" :min="0" :max="60" />
                                </el-form-item>
                                <el-form-item label="附加规则">
                                    <el-input v-model="configForm.robots.extraRules" type="textarea" :rows="3" />
                                </el-form-item>
                                <el-form-item label="附加 Sitemap">
                                    <el-switch v-model="configForm.robots.includeSitemap" />
                                </el-form-item>

                                <el-divider content-position="left">Sitemap</el-divider>
                                <el-form-item label="启用基础 Sitemap">
                                    <el-switch v-model="configForm.sitemap.enabled" />
                                </el-form-item>
                                <el-form-item label="包含网址详情页">
                                    <el-switch v-model="configForm.sitemap.includeWebsiteDetails" />
                                </el-form-item>
                                <el-form-item label="网址数量上限">
                                    <el-input-number v-model="configForm.sitemap.websiteLimit" :min="50" :max="50000" />
                                </el-form-item>
                                <el-form-item label="允许 noindex 路由">
                                    <el-switch v-model="configForm.sitemap.includeNoindex" />
                                </el-form-item>
                                <el-form-item label="changefreq">
                                    <el-select v-model="configForm.sitemap.changefreq" class="uied-seo-center__select">
                                        <el-option label="always" value="always" />
                                        <el-option label="hourly" value="hourly" />
                                        <el-option label="daily" value="daily" />
                                        <el-option label="weekly" value="weekly" />
                                        <el-option label="monthly" value="monthly" />
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="priority">
                                    <el-input-number
                                        v-model="configForm.sitemap.priority"
                                        :step="0.1"
                                        :min="0.1"
                                        :max="1.0"
                                        :precision="1"
                                    />
                                </el-form-item>
                                <el-form-item label="启用进阶 Sitemap">
                                    <el-switch v-model="configForm.sitemap.advancedEnabled" />
                                </el-form-item>
                                <el-form-item label="单文件 URL 上限">
                                    <el-input-number v-model="configForm.sitemap.maxUrlsPerFile" :min="100" :max="20000" />
                                </el-form-item>
                                <el-form-item label="包含分类页">
                                    <el-switch v-model="configForm.sitemap.includeCategoryPages" />
                                </el-form-item>
                                <el-form-item label="包含标签页">
                                    <el-switch v-model="configForm.sitemap.includeTagPages" />
                                </el-form-item>
                                <el-form-item label="包含文章页">
                                    <el-switch v-model="configForm.sitemap.includeArticlePages" />
                                </el-form-item>
                                <el-form-item label="文件预览">
                                    <div class="uied-seo-center__inline-actions">
                                        <el-button @click="previewRobotsTxt">预览 Robots</el-button>
                                        <el-button @click="previewSitemapXml">预览 Sitemap</el-button>
                                        <el-button @click="previewAdvancedSitemapXml">预览进阶 Sitemap</el-button>
                                    </div>
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="站长验证" name="verification">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-form-item label="百度验证">
                                    <el-input v-model="configForm.webmasterVerification.baidu" placeholder="百度站长验证码" />
                                </el-form-item>
                                <el-form-item label="Google 验证">
                                    <el-input v-model="configForm.webmasterVerification.google" placeholder="Google 验证码" />
                                </el-form-item>
                                <el-form-item label="Bing 验证">
                                    <el-input v-model="configForm.webmasterVerification.bing" placeholder="Bing 验证码" />
                                </el-form-item>
                                <el-form-item label="搜狗验证">
                                    <el-input v-model="configForm.webmasterVerification.sogou" />
                                </el-form-item>
                                <el-form-item label="360 验证">
                                    <el-input v-model="configForm.webmasterVerification.so360" />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="内链与检测器" name="internal-detector">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-form-item label="启用内部链接管理">
                                    <el-switch v-model="configForm.internalLinkManagement.enabled" />
                                </el-form-item>
                                <el-form-item label="每页最大链接">
                                    <el-input-number v-model="configForm.internalLinkManagement.maxLinksPerPage" :min="1" :max="50" />
                                </el-form-item>
                                <el-form-item label="按分类推荐">
                                    <el-switch v-model="configForm.internalLinkManagement.relatedByCategory" />
                                </el-form-item>
                                <el-form-item label="按标签推荐">
                                    <el-switch v-model="configForm.internalLinkManagement.relatedByTag" />
                                </el-form-item>
                                <el-form-item label="启用进阶链接检测器">
                                    <el-switch v-model="configForm.advancedLinkDetector.enabled" />
                                </el-form-item>
                                <el-form-item label="检测超时(ms)">
                                    <el-input-number v-model="configForm.advancedLinkDetector.timeoutMs" :min="1000" :max="20000" />
                                </el-form-item>
                                <el-form-item label="检查 HTTPS">
                                    <el-switch v-model="configForm.advancedLinkDetector.checkHttps" />
                                </el-form-item>
                                <el-form-item label="检查重定向">
                                    <el-switch v-model="configForm.advancedLinkDetector.checkRedirect" />
                                </el-form-item>
                                <el-form-item label="检查 SSL 到期">
                                    <el-switch v-model="configForm.advancedLinkDetector.checkSslExpiry" />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="监测参数" name="monitoring">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-form-item label="启用 404 监测">
                                    <el-switch v-model="configForm.monitoring.enable404Monitor" />
                                </el-form-item>
                                <el-form-item label="404 日志上限">
                                    <el-input-number v-model="configForm.monitoring.max404Logs" :min="50" :max="2000" />
                                </el-form-item>
                                <el-form-item label="失效检测数量">
                                    <el-input-number v-model="configForm.monitoring.invalidScanLimit" :min="10" :max="2000" />
                                </el-form-item>
                                <el-form-item label="链接检测数量">
                                    <el-input-number v-model="configForm.monitoring.linkDetectorLimit" :min="10" :max="1000" />
                                </el-form-item>
                                <el-form-item label="慢链接阈值(ms)">
                                    <el-input-number v-model="configForm.monitoring.slowThresholdMs" :min="500" :max="20000" />
                                </el-form-item>
                                <el-form-item label="SSL 预警(天)">
                                    <el-input-number v-model="configForm.monitoring.sslExpireWarnDays" :min="1" :max="180" />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>
                    </el-tabs>
                </el-tab-pane>

                <el-tab-pane label="自动任务中心" name="autoTask" lazy>
                    <el-row :gutter="12">
                        <el-col :span="14">
                            <el-card shadow="never" class="uied-seo-center__auto-card">
                                <template #header>
                                    <span>自动任务配置</span>
                                </template>
                                <el-form label-width="160px" class="uied-seo-center__form">
                                    <el-form-item label="启用自动任务">
                                        <el-switch v-model="configForm.autoTasks.enabled" />
                                    </el-form-item>
                                    <el-form-item label="执行间隔(分钟)">
                                        <el-input-number v-model="configForm.autoTasks.intervalMinutes" :min="5" :max="1440" />
                                    </el-form-item>
                                    <el-form-item label="失效 URL 检测">
                                        <el-switch v-model="configForm.autoTasks.tasks.invalidScan" />
                                    </el-form-item>
                                    <el-form-item label="进阶链接检测">
                                        <el-switch v-model="configForm.autoTasks.tasks.linkDetector" />
                                    </el-form-item>
                                    <el-form-item label="图片优化检测">
                                        <el-switch v-model="configForm.autoTasks.tasks.imageOptimization" />
                                    </el-form-item>
                                    <el-form-item label="Sitemap 生成">
                                        <el-switch v-model="configForm.autoTasks.tasks.sitemapGenerate" />
                                    </el-form-item>
                                    <el-form-item label="404 聚合摘要">
                                        <el-switch v-model="configForm.autoTasks.tasks.logs404Digest" />
                                    </el-form-item>
                                    <el-form-item label="404 汇总天数">
                                        <el-input-number v-model="configForm.autoTasks.digestLookbackDays" :min="1" :max="90" />
                                    </el-form-item>
                                    <el-form-item label="站长推送">
                                        <el-switch v-model="configForm.autoTasks.tasks.platformPush" />
                                    </el-form-item>
                                    <el-form-item label="推送平台">
                                        <el-select v-model="configForm.autoTasks.pushPlatform" class="uied-seo-center__select">
                                            <el-option label="百度" value="baidu" />
                                            <el-option label="Bing" value="bing" />
                                            <el-option label="IndexNow" value="indexnow" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item label="推送数量">
                                        <el-input-number v-model="configForm.autoTasks.pushLimit" :min="1" :max="1000" />
                                    </el-form-item>
                                    <el-form-item label="推送主域名(可选)">
                                        <el-input v-model="configForm.autoTasks.siteOrigin" placeholder="https://hao.uied.cn" />
                                    </el-form-item>
                                </el-form>
                            </el-card>
                        </el-col>

                        <el-col :span="10">
                            <el-card shadow="never" class="uied-seo-center__auto-card">
                                <template #header>
                                    <div class="uied-seo-center__panel-tools">
                                        <span>执行状态</span>
                                        <el-button link @click="loadAutoTaskStatus" :loading="loading.autoTaskStatus">刷新</el-button>
                                    </div>
                                </template>
                                <el-descriptions :column="1" border>
                                    <el-descriptions-item label="运行状态">
                                        <el-tag :type="autoTaskStatus.state.running ? 'warning' : 'success'">
                                            {{ autoTaskStatus.state.running ? '执行中' : '空闲' }}
                                        </el-tag>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="上次执行">
                                        {{ formatDateTime(autoTaskStatus.state.lastRunAt) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="下次计划执行">
                                        {{ formatDateTime(autoTaskStatus.state.nextRunAt) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="触发方式">
                                        {{ autoTaskStatus.state.lastTrigger || '-' }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="任务类型">
                                        {{ formatAutoTaskType(autoTaskStatus.state.lastTaskType) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="耗时(ms)">
                                        {{ Number(autoTaskStatus.state.lastDurationMs || 0) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="最近错误">
                                        {{ autoTaskStatus.state.lastError || '-' }}
                                    </el-descriptions-item>
                                </el-descriptions>

                                <div class="uied-seo-center__auto-actions">
                                    <el-button type="primary" :loading="loading.autoTaskRun" @click="runAutoTask('all')">执行全部</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('invalid')">失效检测</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('link-detector')">链接检测</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('image-optimization')">图片检测</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('sitemap-generate')">生成Sitemap</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('logs-404-digest')">404汇总</el-button>
                                    <el-button :loading="loading.autoTaskRun" @click="runAutoTask('push-platform')">站长推送</el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>

                    <el-card shadow="never" class="uied-seo-center__auto-card">
                        <template #header>
                            <div class="uied-seo-center__panel-tools">
                                <span>自动任务日志</span>
                                <el-button link type="danger" @click="clearLog('seoAutoTaskLogs')">清空</el-button>
                            </div>
                        </template>
                        <el-table :data="logs.seoAutoTaskLogs" border>
                            <el-table-column prop="taskType" label="任务类型" width="130">
                                <template #default="{ row }">{{ formatAutoTaskType(row.taskType) }}</template>
                            </el-table-column>
                            <el-table-column prop="trigger" label="触发方式" width="100" />
                            <el-table-column prop="taskCount" label="执行项" width="80" />
                            <el-table-column prop="successCount" label="成功" width="80" />
                            <el-table-column prop="failedCount" label="失败" width="80" />
                            <el-table-column prop="durationMs" label="耗时(ms)" width="110" />
                            <el-table-column label="执行摘要" min-width="280">
                                <template #default="{ row }">
                                    <div class="uied-seo-center__url-list">
                                        <div v-for="(item, idx) in row.results || []" :key="`${row.id || 'log'}-${idx}`">
                                            {{ formatAutoTaskType(item.task) }}：{{ item.summary || (item.success ? '成功' : '失败') }}
                                        </div>
                                    </div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="finishedAt" label="完成时间" width="180">
                                <template #default="{ row }">{{ formatDateTime(row.finishedAt || row.createdAt) }}</template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </el-tab-pane>

                <el-tab-pane label="短链重定向（运营）" name="redirects" lazy>
                    <div class="uied-seo-center__redirect-tools">
                        <el-button type="primary" @click="addRedirectRule">新增规则</el-button>
                    </div>
                    <el-alert
                        type="info"
                        :closable="false"
                        class="uied-seo-center__alert"
                        title="运营短链示例：来源路径填 /uied，目标地址填 https://www.uied.cn/，即可把 hao.uied.cn/uied 跳转到目标链接。"
                    />
                    <el-table :data="configForm.redirects" border>
                        <el-table-column label="来源路径" min-width="180">
                            <template #default="{ row, $index }">
                                <el-input v-model="row.from" placeholder="/uied（精确匹配）" @blur="handleRedirectFromBlur(row, $index)" />
                            </template>
                        </el-table-column>
                        <el-table-column label="目标地址" min-width="220">
                            <template #default="{ row }">
                                <el-input v-model="row.to" placeholder="https://www.uied.cn/" />
                            </template>
                        </el-table-column>
                        <el-table-column label="类型" width="90">
                            <template #default="{ row }">
                                <el-select v-model="row.type">
                                    <el-option label="301" value="301" />
                                    <el-option label="302" value="302" />
                                </el-select>
                            </template>
                        </el-table-column>
                        <el-table-column label="保留 Query" width="110">
                            <template #default="{ row }">
                                <el-switch v-model="row.preserveQuery" />
                            </template>
                        </el-table-column>
                        <el-table-column label="启用" width="90">
                            <template #default="{ row }">
                                <el-switch v-model="row.enabled" />
                            </template>
                        </el-table-column>
                        <el-table-column label="排序" width="100">
                            <template #default="{ row }">
                                <el-input-number v-model="row.sort" :min="1" :max="999999" />
                            </template>
                        </el-table-column>
                        <el-table-column label="备注" min-width="180">
                            <template #default="{ row }">
                                <el-input v-model="row.note" />
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="90" fixed="right">
                            <template #default="{ $index }">
                                <el-button link type="danger" @click="removeRedirectRule($index)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>

                <el-tab-pane label="检测与日志" name="monitor" lazy>
                    <el-tabs v-model="monitorSubTab" class="uied-seo-center__sub-tabs" type="border-card">
                        <el-tab-pane label="检测任务" name="actions">
                            <div class="uied-seo-center__monitor-actions">
                                <el-button :loading="loading.scanInvalid" @click="runInvalidScan">失效 URL 检测</el-button>
                                <el-button :loading="loading.scanLinkDetector" @click="runLinkDetectorScan">进阶链接检测</el-button>
                                <el-button :loading="loading.scanImageOptimization" @click="runImageOptimizationScan">图片优化检测</el-button>
                                <el-button :loading="loading.internalLinks" @click="loadInternalLinks">内部链接建议</el-button>
                                <el-button :loading="loading.logs" @click="loadLogs">刷新日志</el-button>
                            </div>
                            <el-alert type="info" :closable="false" class="uied-seo-center__alert" title="检测结果会写入日志，可多次执行对比变化。" />
                        </el-tab-pane>

                        <el-tab-pane label="404 日志" name="404-log">
                            <div class="uied-seo-center__panel-tools">
                                <span>404 监测日志</span>
                                <el-button link type="danger" @click="clearLog('seo404Logs')">清空</el-button>
                            </div>
                            <el-table :data="logs.seo404Logs" border>
                                <el-table-column prop="path" label="路径" min-width="220" />
                                <el-table-column prop="referer" label="来源页" min-width="220" show-overflow-tooltip />
                                <el-table-column prop="source" label="来源" width="110" />
                                <el-table-column prop="createdAt" label="时间" width="180">
                                    <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="失效日志" name="invalid-log">
                            <div class="uied-seo-center__panel-tools">
                                <span>失效 URL 检测日志</span>
                                <el-button link type="danger" @click="clearLog('seoInvalidUrlLogs')">清空</el-button>
                            </div>
                            <el-table :data="flattenScanItems(logs.seoInvalidUrlLogs)" border>
                                <el-table-column prop="name" label="网站" min-width="180" />
                                <el-table-column prop="url" label="URL" min-width="220" show-overflow-tooltip />
                                <el-table-column prop="statusCode" label="状态码" width="90" />
                                <el-table-column prop="errorMessage" label="错误信息" min-width="180" show-overflow-tooltip />
                                <el-table-column prop="checkedAt" label="检测时间" width="180">
                                    <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="链接日志" name="detector-log">
                            <div class="uied-seo-center__panel-tools">
                                <span>进阶链接检测日志</span>
                                <el-button link type="danger" @click="clearLog('seoLinkDetectorLogs')">清空</el-button>
                            </div>
                            <el-table :data="flattenScanItems(logs.seoLinkDetectorLogs)" border>
                                <el-table-column prop="name" label="网站" min-width="180" />
                                <el-table-column prop="url" label="URL" min-width="220" show-overflow-tooltip />
                                <el-table-column label="问题标签" min-width="180">
                                    <template #default="{ row }">
                                        <el-space wrap>
                                            <el-tag v-for="item in row.issues || []" :key="item" size="small">{{ item }}</el-tag>
                                        </el-space>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="responseTimeMs" label="耗时(ms)" width="110" />
                                <el-table-column prop="checkedAt" label="检测时间" width="180">
                                    <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="图片日志" name="image-log">
                            <div class="uied-seo-center__panel-tools">
                                <span>图片优化检测日志</span>
                                <el-button link type="danger" @click="clearLog('seoImageOptimizationLogs')">清空</el-button>
                            </div>
                            <el-table :data="flattenImageItems(logs.seoImageOptimizationLogs)" border>
                                <el-table-column prop="name" label="网站" min-width="180" />
                                <el-table-column prop="field" label="字段" width="100" />
                                <el-table-column prop="url" label="图片地址" min-width="220" show-overflow-tooltip />
                                <el-table-column label="问题标签" min-width="180">
                                    <template #default="{ row }">
                                        <el-space wrap>
                                            <el-tag v-for="item in row.issues || []" :key="item" size="small">{{ item }}</el-tag>
                                        </el-space>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="内链建议" name="internal-links">
                            <el-card shadow="never" class="uied-seo-center__internal-card">
                                <template #header>
                                    <div class="uied-seo-center__internal-header">
                                        <span>内部链接建议</span>
                                        <el-tag type="info">分类 {{ internalLinks.categories.length }} / 标签 {{ internalLinks.tags.length }}</el-tag>
                                    </div>
                                </template>
                                <el-row :gutter="12">
                                    <el-col :span="8">
                                        <h4>分类建议</h4>
                                        <ul class="uied-seo-center__simple-list">
                                            <li v-for="item in internalLinks.categories" :key="`c-${item.path}`">{{ item.name }} - {{ item.path }}</li>
                                        </ul>
                                    </el-col>
                                    <el-col :span="8">
                                        <h4>标签建议</h4>
                                        <ul class="uied-seo-center__simple-list">
                                            <li v-for="item in internalLinks.tags" :key="`t-${item.path}`">{{ item.name }} - {{ item.path }}</li>
                                        </ul>
                                    </el-col>
                                    <el-col :span="8">
                                        <h4>页面建议</h4>
                                        <ul class="uied-seo-center__simple-list">
                                            <li v-for="item in internalLinks.pages" :key="`p-${item.path}`">{{ item.name }} - {{ item.path }}</li>
                                        </ul>
                                    </el-col>
                                </el-row>
                            </el-card>
                        </el-tab-pane>
                    </el-tabs>
                </el-tab-pane>

                <el-tab-pane label="站长推送" name="push" lazy>
                    <el-tabs v-model="pushSubTab" class="uied-seo-center__sub-tabs" type="border-card">
                        <el-tab-pane label="平台配置" name="platform">
                            <el-form label-width="160px" class="uied-seo-center__form">
                                <el-divider content-position="left">百度推送</el-divider>
                                <el-form-item label="启用百度推送">
                                    <el-switch v-model="configForm.platformPush.baidu.enabled" />
                                </el-form-item>
                                <el-form-item label="站点域名(site)">
                                    <el-input v-model="configForm.platformPush.baidu.site" placeholder="https://hao.uied.cn" />
                                </el-form-item>
                                <el-form-item label="Token">
                                    <el-input v-model="configForm.platformPush.baidu.token" />
                                </el-form-item>
                                <el-form-item label="Endpoint">
                                    <el-input v-model="configForm.platformPush.baidu.endpoint" />
                                </el-form-item>

                                <el-divider content-position="left">Bing 推送</el-divider>
                                <el-form-item label="启用 Bing 推送">
                                    <el-switch v-model="configForm.platformPush.bing.enabled" />
                                </el-form-item>
                                <el-form-item label="站点域名(site)">
                                    <el-input v-model="configForm.platformPush.bing.site" />
                                </el-form-item>
                                <el-form-item label="API Key">
                                    <el-input v-model="configForm.platformPush.bing.apiKey" />
                                </el-form-item>
                                <el-form-item label="Endpoint">
                                    <el-input v-model="configForm.platformPush.bing.endpoint" />
                                </el-form-item>

                                <el-divider content-position="left">IndexNow</el-divider>
                                <el-form-item label="启用 IndexNow">
                                    <el-switch v-model="configForm.platformPush.indexNow.enabled" />
                                </el-form-item>
                                <el-form-item label="Host">
                                    <el-input v-model="configForm.platformPush.indexNow.host" placeholder="https://hao.uied.cn" />
                                </el-form-item>
                                <el-form-item label="Key">
                                    <el-input v-model="configForm.platformPush.indexNow.key" />
                                </el-form-item>
                                <el-form-item label="Key 文件地址">
                                    <el-input v-model="configForm.platformPush.indexNow.keyLocation" />
                                </el-form-item>
                                <el-form-item label="Endpoint">
                                    <el-input v-model="configForm.platformPush.indexNow.endpoint" />
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>

                        <el-tab-pane label="手动推送" name="manual">
                            <el-card shadow="never" class="uied-seo-center__push-card">
                                <el-form inline>
                                    <el-form-item label="平台">
                                        <el-select v-model="pushForm.platform" class="uied-seo-center__select">
                                            <el-option label="百度" value="baidu" />
                                            <el-option label="Bing" value="bing" />
                                            <el-option label="IndexNow" value="indexnow" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item label="URL 数量">
                                        <el-input-number v-model="pushForm.limit" :min="1" :max="1000" />
                                    </el-form-item>
                                    <el-form-item label="主域名(可选)">
                                        <el-input v-model="pushForm.siteOrigin" placeholder="https://hao.uied.cn" />
                                    </el-form-item>
                                    <el-form-item>
                                        <el-button type="primary" :loading="loading.pushPlatform" @click="runPlatformPush">执行推送</el-button>
                                    </el-form-item>
                                </el-form>
                            </el-card>
                        </el-tab-pane>

                        <el-tab-pane label="推送日志" name="logs">
                            <el-card shadow="never" class="uied-seo-center__push-card">
                                <template #header>
                                    <div class="uied-seo-center__panel-tools">
                                        <span>推送日志</span>
                                        <el-button link type="danger" @click="clearLog('seoPushLogs')">清空</el-button>
                                    </div>
                                </template>
                                <el-table :data="logs.seoPushLogs" border>
                                    <el-table-column prop="platform" label="平台" width="120" />
                                    <el-table-column prop="pushedCount" label="推送数量" width="100" />
                                    <el-table-column label="示例 URL" min-width="320">
                                        <template #default="{ row }">
                                            <div class="uied-seo-center__url-list">
                                                <div v-for="(item, idx) in (row.sampleUrls || []).slice(0, 3)" :key="`url-${idx}`">{{ item }}</div>
                                            </div>
                                        </template>
                                    </el-table-column>
                                    <el-table-column prop="createdAt" label="时间" width="180">
                                        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
                                    </el-table-column>
                                </el-table>
                            </el-card>
                        </el-tab-pane>
                    </el-tabs>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <el-dialog v-model="previewDialog.visible" :title="previewDialog.title" width="860px">
            <el-input v-model="previewDialog.content" type="textarea" :rows="22" readonly />
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedSeoCenter">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
import { onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import {
    uiedSeoCenterAutoTaskRun,
    uiedSeoCenterAutoTaskStatus,
    uiedSeoCenterConfigGet,
    uiedSeoCenterConfigSave,
    uiedSeoCenterInternalLinks,
    uiedSeoCenterLogs404,
    uiedSeoCenterLogsAutoTask,
    uiedSeoCenterLogsClear,
    uiedSeoCenterLogsImageOptimization,
    uiedSeoCenterLogsInvalid,
    uiedSeoCenterLogsLinkDetector,
    uiedSeoCenterLogsPush,
    uiedSeoCenterOverview,
    uiedSeoCenterPushPlatform,
    uiedSeoCenterRobotsPreview,
    uiedSeoCenterScanImageOptimization,
    uiedSeoCenterScanInvalid,
    uiedSeoCenterScanLinkDetector,
    uiedSeoCenterSitemapAdvancedPreview,
    uiedSeoCenterSitemapBasicPreview
} from '@/api/uied'

type SeoTab = 'basic' | 'autoTask' | 'redirects' | 'monitor' | 'push'
type BasicSubTab = 'tdk' | 'media-link' | 'robots-sitemap' | 'verification' | 'internal-detector' | 'monitoring'
type MonitorSubTab = 'actions' | '404-log' | 'invalid-log' | 'detector-log' | 'image-log' | 'internal-links'
type PushSubTab = 'platform' | 'manual' | 'logs'
type AutoTaskType = 'all' | 'invalid' | 'link-detector' | 'image-optimization' | 'sitemap-generate' | 'logs-404-digest' | 'push-platform'
type LogKey = 'seo404Logs' | 'seoInvalidUrlLogs' | 'seoLinkDetectorLogs' | 'seoImageOptimizationLogs' | 'seoPushLogs' | 'seoAutoTaskLogs'

interface OverviewStats {
    redirectRuleCount: number
    logs404Count: number
    latestInvalidCount: number
    latestDetectorIssueCount: number
    latestImageIssueCount: number
    latestPushCount: number
}

interface InternalLinkItem {
    name: string
    path: string
    updatedAt?: string
}

/**
 * 生成 SEO 中心默认配置，确保页面在首次加载和接口异常时可操作。
 */
const createDefaultSeoConfig = () => ({
    tdkOptimization: {
        homeTitleTemplate: '{siteTitle}',
        pageTitleTemplate: '{pageTitle} - {siteName}',
        categoryTitleTemplate: '{categoryName} - {siteName}',
        tagTitleTemplate: '{tagName} - {siteName}',
        articleTitleTemplate: '{articleTitle} - {siteName}',
        websiteTitleTemplate: '{websiteName} - {siteName}',
        descriptionTemplate: '{description}',
        keywordsTemplate: '{keywords}'
    },
    imageOptimization: {
        enabled: true,
        preferWebp: true,
        lazyLoad: true,
        addWidthHeight: true,
        maxImageWidth: 1600
    },
    linkRewrite: {
        enabled: true,
        forceHttps: false,
        lowerCasePath: false,
        removeTrailingSlash: false,
        stripIndexHtml: true,
        removeTrackingParams: true,
        trackingParams: [ 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ]
    },
    monitoring: {
        enable404Monitor: true,
        max404Logs: 500,
        invalidScanLimit: 200,
        linkDetectorLimit: 120,
        slowThresholdMs: 3000,
        sslExpireWarnDays: 14
    },
    robots: {
        enabled: true,
        userAgent: '*',
        allowPaths: [ '/' ],
        disallowPaths: [ '/admin', '/api' ],
        crawlDelay: 0,
        extraRules: '',
        includeSitemap: true
    },
    sitemap: {
        enabled: true,
        includeWebsiteDetails: true,
        websiteLimit: 5000,
        includeNoindex: false,
        changefreq: 'daily',
        priority: 0.8,
        advancedEnabled: true,
        maxUrlsPerFile: 1000,
        includeCategoryPages: true,
        includeTagPages: true,
        includeArticlePages: true
    },
    webmasterVerification: {
        baidu: '',
        google: '',
        bing: '',
        sogou: '',
        so360: ''
    },
    redirects: [] as any[],
    internalLinkManagement: {
        enabled: false,
        maxLinksPerPage: 6,
        relatedByCategory: true,
        relatedByTag: true
    },
    advancedLinkDetector: {
        enabled: true,
        timeoutMs: 6000,
        checkHttps: true,
        checkRedirect: true,
        checkSslExpiry: true
    },
    platformPush: {
        baidu: {
            enabled: false,
            site: '',
            token: '',
            endpoint: 'http://data.zz.baidu.com/urls'
        },
        bing: {
            enabled: false,
            apiKey: '',
            site: '',
            endpoint: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'
        },
        indexNow: {
            enabled: false,
            host: '',
            key: '',
            keyLocation: '',
            endpoint: 'https://api.indexnow.org/indexnow'
        }
    },
    autoTasks: {
        enabled: false,
        intervalMinutes: 30,
        tasks: {
            invalidScan: true,
            linkDetector: true,
            imageOptimization: false,
            sitemapGenerate: true,
            logs404Digest: true,
            platformPush: false
        },
        pushPlatform: 'baidu',
        pushLimit: 100,
        siteOrigin: '',
        digestLookbackDays: 7
    }
})

/**
 * 判断是否为普通对象。
 */
const isPlainObject = (value: unknown): value is Record<string, any> => {
    return Object.prototype.toString.call(value) === '[object Object]'
}

/**
 * 深拷贝（JSON 结构），用于避免响应对象和表单对象引用互相污染。
 */
function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
}

/**
 * 深度合并对象（不修改入参），用于“默认配置 + 接口配置”融合。
 */
const deepMerge = (base: Record<string, any>, patch: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = { ...base }
    Object.keys(patch || {}).forEach((key) => {
        const currentValue = result[key]
        const patchValue = patch[key]
        if (isPlainObject(currentValue) && isPlainObject(patchValue)) {
            result[key] = deepMerge(currentValue, patchValue)
            return
        }
        result[key] = patchValue
    })
    return result
}

/**
 * 将多行文本转为字符串数组（去空、去重）。
 */
const parseLineList = (text: string): string[] => {
    const rows = String(text || '')
        .split(/\n|,/)
        .map(item => String(item || '').trim())
        .filter(Boolean)
    return Array.from(new Set(rows))
}

/**
 * 将字符串数组渲染为多行文本。
 */
const stringifyLineList = (value: unknown): string => {
    const list = Array.isArray(value) ? value : []
    return list.map(item => String(item || '').trim()).filter(Boolean).join('\n')
}

/**
 * 规范化短链来源路径，用于重复校验（统一前导斜杠并去除尾斜杠）。
 */
const normalizeRedirectFromPath = (value: unknown): string => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
    const normalizedSlash = withLeadingSlash.replace(/\/+/g, '/')
    if (normalizedSlash === '/') return '/'
    const withoutTrailingSlash = normalizedSlash.replace(/\/+$/, '')
    return withoutTrailingSlash || '/'
}

/**
 * 获取重复来源路径列表，返回标准化后的路径集合。
 */
const collectDuplicateRedirectFromPaths = (rules: any[]): string[] => {
    const pathMap = new Map<string, number>()
    const duplicates = new Set<string>()
    ;(Array.isArray(rules) ? rules : []).forEach((rule) => {
        const normalizedPath = normalizeRedirectFromPath(rule?.from)
        if (!normalizedPath) return
        const compareKey = normalizedPath.toLowerCase()
        const count = Number(pathMap.get(compareKey) || 0) + 1
        pathMap.set(compareKey, count)
        if (count > 1) {
            duplicates.add(normalizedPath)
        }
    })
    return Array.from(duplicates)
}

/**
 * 收集无效短链规则，避免空来源或根路径把首页重定向出去。
 */
const collectInvalidRedirectRules = (rules: any[]): string[] => {
    const invalidList: string[] = []
    ;(Array.isArray(rules) ? rules : []).forEach((rule, index) => {
        const rowLabel = `第 ${index + 1} 条`
        const normalizedPath = normalizeRedirectFromPath(rule?.from)
        const target = String(rule?.to || '').trim()
        if (!normalizedPath) {
            invalidList.push(`${rowLabel}来源路径不能为空`)
            return
        }
        if (normalizedPath === '/') {
            invalidList.push(`${rowLabel}来源路径不能为 /`)
        }
        if (!target) {
            invalidList.push(`${rowLabel}目标地址不能为空`)
        }
    })
    return invalidList
}

/**
 * 校验短链来源路径是否重复，重复时提示并阻断保存。
 */
const validateRedirectRulesBeforeSave = (): boolean => {
    const invalidRules = collectInvalidRedirectRules(configForm.redirects as any[])
    if (invalidRules.length > 0) {
        activeTab.value = 'redirects'
        feedback.msgError(invalidRules.slice(0, 3).join('；'))
        return false
    }
    const duplicatePaths = collectDuplicateRedirectFromPaths(configForm.redirects as any[])
    if (duplicatePaths.length === 0) return true
    activeTab.value = 'redirects'
    feedback.msgError(`来源路径已存在：${duplicatePaths.join('、')}，请去重后再保存`)
    return false
}

const activeTab = ref<SeoTab>('basic')
const basicSubTab = ref<BasicSubTab>('tdk')
const monitorSubTab = ref<MonitorSubTab>('actions')
const pushSubTab = ref<PushSubTab>('platform')
const route = useRoute()

/**
 * 根据路由查询参数定位 SEO 主标签，支持更新记录和工作台直接跳转到具体功能。
 * @param value tab 查询参数
 */
const applyRouteTab = (value: unknown) => {
    const tab = String(Array.isArray(value) ? value[0] : value || '').trim() as SeoTab
    if ([ 'basic', 'autoTask', 'redirects', 'monitor', 'push' ].includes(tab)) {
        activeTab.value = tab
    }
}

watch(
    () => route.query.tab,
    (value) => applyRouteTab(value),
    { immediate: true }
)

const configForm = reactive(createDefaultSeoConfig())
const previewDialog = reactive({
    visible: false,
    title: '',
    content: ''
})
const overview = reactive({
    stats: {
        redirectRuleCount: 0,
        logs404Count: 0,
        latestInvalidCount: 0,
        latestDetectorIssueCount: 0,
        latestImageIssueCount: 0,
        latestPushCount: 0
    } as OverviewStats
})
const logs = reactive({
    seo404Logs: [] as any[],
    seoInvalidUrlLogs: [] as any[],
    seoLinkDetectorLogs: [] as any[],
    seoImageOptimizationLogs: [] as any[],
    seoPushLogs: [] as any[],
    seoAutoTaskLogs: [] as any[]
})
const autoTaskStatus = reactive({
    state: {
        running: false,
        lastRunAt: '',
        nextRunAt: '',
        lastTrigger: '',
        lastTaskType: '',
        lastDurationMs: 0,
        lastError: ''
    },
    latest: null as any
})
const internalLinks = reactive({
    categories: [] as InternalLinkItem[],
    tags: [] as InternalLinkItem[],
    pages: [] as InternalLinkItem[]
})
const loading = reactive({
    config: false,
    saveConfig: false,
    logs: false,
    scanInvalid: false,
    scanLinkDetector: false,
    scanImageOptimization: false,
    internalLinks: false,
    pushPlatform: false,
    autoTaskStatus: false,
    autoTaskRun: false
})
const pushForm = reactive({
    platform: 'baidu',
    limit: 100,
    siteOrigin: ''
})

const trackingParamsText = ref('')
const robotsAllowText = ref('')
const robotsDisallowText = ref('')

/**
 * 把“数组配置字段”同步到文本框，便于后台运营直接多行编辑。
 */
const syncTextFieldsFromConfig = () => {
    trackingParamsText.value = stringifyLineList(configForm.linkRewrite?.trackingParams)
    robotsAllowText.value = stringifyLineList(configForm.robots?.allowPaths)
    robotsDisallowText.value = stringifyLineList(configForm.robots?.disallowPaths)
}

/**
 * 把文本框内容写回配置对象，确保保存时传给后端的是结构化数组。
 */
const applyTextFieldsToConfig = () => {
    configForm.linkRewrite.trackingParams = parseLineList(trackingParamsText.value)
    configForm.robots.allowPaths = parseLineList(robotsAllowText.value)
    configForm.robots.disallowPaths = parseLineList(robotsDisallowText.value)
}

/**
 * 将接口返回配置安全合并到当前表单模型。
 */
const assignConfig = (nextConfig: Record<string, any>) => {
    const merged = deepMerge(createDefaultSeoConfig(), isPlainObject(nextConfig) ? nextConfig : {})
    Object.keys(configForm).forEach((key) => {
        // @ts-ignore - 这里按 key 动态重置 reactive 对象
        delete configForm[key]
    })
    Object.assign(configForm, merged)
    syncTextFieldsFromConfig()
}

/**
 * 生成重定向规则唯一 ID，避免前端新增后与历史规则冲突。
 */
const createRuleId = (): string => {
    return `rule_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

/**
 * 新增重定向规则（默认 301，启用状态）。
 */
const addRedirectRule = () => {
    const list = Array.isArray(configForm.redirects) ? configForm.redirects : []
    const nextSort = list.length > 0
        ? Math.max(...list.map(item => Number(item?.sort || 0))) + 10
        : 10
    const nextFromPath = `/short-link-${list.length + 1}`
    list.push({
        id: createRuleId(),
        from: nextFromPath,
        to: 'https://example.com/landing',
        type: '301',
        enabled: true,
        preserveQuery: true,
        sort: nextSort,
        note: ''
    })
    configForm.redirects = list
}

/**
 * 删除指定重定向规则。
 */
const removeRedirectRule = (index: number) => {
    const list = Array.isArray(configForm.redirects) ? configForm.redirects : []
    if (index < 0 || index >= list.length) return
    list.splice(index, 1)
}

/**
 * 来源路径输入框失焦校验：发现重复时清空当前值并提示。
 */
const handleRedirectFromBlur = (row: any, index: number) => {
    const normalizedPath = normalizeRedirectFromPath(row?.from)
    if (!normalizedPath) {
        row.from = ''
        return
    }
    if (normalizedPath === '/') {
        row.from = ''
        feedback.msgError('短链来源路径不能为 /，否则会影响首页访问')
        return
    }
    row.from = normalizedPath
    const list = Array.isArray(configForm.redirects) ? configForm.redirects : []
    const duplicatedIndex = list.findIndex((item, itemIndex) => {
        if (itemIndex === index) return false
        return normalizeRedirectFromPath(item?.from).toLowerCase() === normalizedPath.toLowerCase()
    })
    if (duplicatedIndex === -1) return
    row.from = ''
    feedback.msgError(`来源路径 ${normalizedPath} 已存在，请勿重复填写`)
}

/**
 * 统一弹窗预览文本内容（robots/sitemap）。
 */
const showPreview = (title: string, content: string) => {
    previewDialog.title = title
    previewDialog.content = String(content || '').trim()
    previewDialog.visible = true
}

/**
 * 加载 SEO 配置。
 */
const loadConfig = async () => {
    loading.config = true
    try {
        const data = await uiedSeoCenterConfigGet()
        assignConfig((data || {}) as Record<string, any>)
    } catch (error) {
        console.error('加载 SEO 配置失败:', error)
        feedback.msgError('加载 SEO 配置失败')
    } finally {
        loading.config = false
    }
}

/**
 * 保存 SEO 配置。
 */
const saveConfig = async () => {
    applyTextFieldsToConfig()
    if (!validateRedirectRulesBeforeSave()) {
        return
    }
    loading.saveConfig = true
    try {
        const payload = cloneJson(configForm)
        await uiedSeoCenterConfigSave(payload)
        feedback.msgSuccess('SEO 配置已保存')
        await Promise.all([ loadOverview(), loadAutoTaskStatus() ])
    } catch (error) {
        console.error('保存 SEO 配置失败:', error)
        feedback.msgError('保存 SEO 配置失败')
    } finally {
        loading.saveConfig = false
    }
}

/**
 * 加载 SEO 总览统计。
 */
const loadOverview = async () => {
    try {
        const data = await uiedSeoCenterOverview()
        overview.stats = {
            redirectRuleCount: Number(data?.stats?.redirectRuleCount || 0),
            logs404Count: Number(data?.stats?.logs404Count || 0),
            latestInvalidCount: Number(data?.stats?.latestInvalidCount || 0),
            latestDetectorIssueCount: Number(data?.stats?.latestDetectorIssueCount || 0),
            latestImageIssueCount: Number(data?.stats?.latestImageIssueCount || 0),
            latestPushCount: Number(data?.stats?.latestPushCount || 0)
        }
    } catch (error) {
        console.error('加载 SEO 总览失败:', error)
    }
}

/**
 * 加载日志列表（404/失效/检测/图片/推送/自动任务）。
 */
const loadLogs = async () => {
    loading.logs = true
    try {
        const [log404, invalid, detector, image, push, autoTask] = await Promise.all([
            uiedSeoCenterLogs404(),
            uiedSeoCenterLogsInvalid(),
            uiedSeoCenterLogsLinkDetector(),
            uiedSeoCenterLogsImageOptimization(),
            uiedSeoCenterLogsPush(),
            uiedSeoCenterLogsAutoTask()
        ])
        logs.seo404Logs = Array.isArray(log404) ? log404 : []
        logs.seoInvalidUrlLogs = Array.isArray(invalid) ? invalid : []
        logs.seoLinkDetectorLogs = Array.isArray(detector) ? detector : []
        logs.seoImageOptimizationLogs = Array.isArray(image) ? image : []
        logs.seoPushLogs = Array.isArray(push) ? push : []
        logs.seoAutoTaskLogs = Array.isArray(autoTask) ? autoTask : []
    } catch (error) {
        console.error('加载 SEO 日志失败:', error)
        feedback.msgError('加载 SEO 日志失败')
    } finally {
        loading.logs = false
    }
}

/**
 * 加载自动任务状态（执行中/下次执行时间/最近错误）。
 */
const loadAutoTaskStatus = async () => {
    loading.autoTaskStatus = true
    try {
        const data = await uiedSeoCenterAutoTaskStatus()
        if (isPlainObject(data?.config)) {
            const nextAutoTasks = deepMerge(configForm.autoTasks as Record<string, any>, data.config as Record<string, any>)
            Object.assign(configForm.autoTasks, nextAutoTasks)
        }
        const state = isPlainObject(data?.state) ? data.state : {}
        autoTaskStatus.state.running = Boolean(state.running)
        autoTaskStatus.state.lastRunAt = String(state.lastRunAt || '')
        autoTaskStatus.state.nextRunAt = String(state.nextRunAt || '')
        autoTaskStatus.state.lastTrigger = String(state.lastTrigger || '')
        autoTaskStatus.state.lastTaskType = String(state.lastTaskType || '')
        autoTaskStatus.state.lastDurationMs = Number(state.lastDurationMs || 0)
        autoTaskStatus.state.lastError = String(state.lastError || '')
        autoTaskStatus.latest = data?.latest || null
        if (Array.isArray(data?.logs)) {
            logs.seoAutoTaskLogs = data.logs
        }
    } catch (error) {
        console.error('加载自动任务状态失败:', error)
    } finally {
        loading.autoTaskStatus = false
    }
}

/**
 * 清空指定日志类型。
 */
const clearLog = async (logKey: LogKey) => {
    try {
        await uiedSeoCenterLogsClear({ logKey })
        feedback.msgSuccess('日志已清空')
        await Promise.all([ loadLogs(), loadOverview(), loadAutoTaskStatus() ])
    } catch (error) {
        console.error('清空日志失败:', error)
        feedback.msgError('清空日志失败')
    }
}

/**
 * 手动触发 SEO 自动任务。
 */
const runAutoTask = async (taskType: AutoTaskType) => {
    loading.autoTaskRun = true
    try {
        await uiedSeoCenterAutoTaskRun({
            taskType,
            respectSwitch: taskType === 'all',
            siteOrigin: String(configForm.autoTasks.siteOrigin || '').trim()
        })
        feedback.msgSuccess('自动任务执行完成')
        await Promise.all([ loadAutoTaskStatus(), loadLogs(), loadOverview() ])
    } catch (error: any) {
        console.error('自动任务执行失败:', error)
        feedback.msgError(error?.message || '自动任务执行失败')
    } finally {
        loading.autoTaskRun = false
    }
}

/**
 * 执行失效 URL 检测。
 */
const runInvalidScan = async () => {
    loading.scanInvalid = true
    try {
        await uiedSeoCenterScanInvalid({
            limit: Number(configForm.monitoring.invalidScanLimit || 200),
            timeoutMs: Number(configForm.advancedLinkDetector.timeoutMs || 6000)
        })
        feedback.msgSuccess('失效 URL 检测完成')
        await Promise.all([ loadLogs(), loadOverview() ])
    } catch (error) {
        console.error('失效 URL 检测失败:', error)
        feedback.msgError('失效 URL 检测失败')
    } finally {
        loading.scanInvalid = false
    }
}

/**
 * 执行进阶链接检测。
 */
const runLinkDetectorScan = async () => {
    loading.scanLinkDetector = true
    try {
        await uiedSeoCenterScanLinkDetector({
            limit: Number(configForm.monitoring.linkDetectorLimit || 120),
            timeoutMs: Number(configForm.advancedLinkDetector.timeoutMs || 6000),
            slowThresholdMs: Number(configForm.monitoring.slowThresholdMs || 3000),
            sslWarnDays: Number(configForm.monitoring.sslExpireWarnDays || 14)
        })
        feedback.msgSuccess('进阶链接检测完成')
        await Promise.all([ loadLogs(), loadOverview() ])
    } catch (error) {
        console.error('进阶链接检测失败:', error)
        feedback.msgError('进阶链接检测失败')
    } finally {
        loading.scanLinkDetector = false
    }
}

/**
 * 执行图片优化检测。
 */
const runImageOptimizationScan = async () => {
    loading.scanImageOptimization = true
    try {
        await uiedSeoCenterScanImageOptimization({
            limit: Number(configForm.monitoring.invalidScanLimit || 200)
        })
        feedback.msgSuccess('图片优化检测完成')
        await Promise.all([ loadLogs(), loadOverview() ])
    } catch (error) {
        console.error('图片优化检测失败:', error)
        feedback.msgError('图片优化检测失败')
    } finally {
        loading.scanImageOptimization = false
    }
}

/**
 * 获取内部链接建议。
 */
const loadInternalLinks = async () => {
    loading.internalLinks = true
    try {
        const data = await uiedSeoCenterInternalLinks({
            limit: Number(configForm.internalLinkManagement.maxLinksPerPage || 20)
        })
        internalLinks.categories = Array.isArray(data?.categories) ? data.categories : []
        internalLinks.tags = Array.isArray(data?.tags) ? data.tags : []
        internalLinks.pages = Array.isArray(data?.pages) ? data.pages : []
    } catch (error) {
        console.error('获取内部链接建议失败:', error)
        feedback.msgError('获取内部链接建议失败')
    } finally {
        loading.internalLinks = false
    }
}

/**
 * 预览 robots.txt。
 */
const previewRobotsTxt = async () => {
    try {
        const data = await uiedSeoCenterRobotsPreview()
        showPreview('robots.txt 预览', String(data?.text || ''))
    } catch (error) {
        console.error('预览 robots.txt 失败:', error)
        feedback.msgError('预览 robots.txt 失败')
    }
}

/**
 * 预览基础 sitemap.xml。
 */
const previewSitemapXml = async () => {
    try {
        const data = await uiedSeoCenterSitemapBasicPreview()
        showPreview('sitemap.xml 预览', String(data?.xml || ''))
    } catch (error) {
        console.error('预览 sitemap.xml 失败:', error)
        feedback.msgError('预览 sitemap.xml 失败')
    }
}

/**
 * 预览进阶 sitemap 索引。
 */
const previewAdvancedSitemapXml = async () => {
    try {
        const data = await uiedSeoCenterSitemapAdvancedPreview()
        showPreview('sitemap-advanced.xml 预览', String(data?.indexXml || ''))
    } catch (error) {
        console.error('预览进阶 sitemap 失败:', error)
        feedback.msgError('预览进阶 sitemap 失败')
    }
}

/**
 * 执行站长平台推送（百度/Bing/IndexNow）。
 */
const runPlatformPush = async () => {
    loading.pushPlatform = true
    try {
        await uiedSeoCenterPushPlatform({
            platform: pushForm.platform,
            limit: Number(pushForm.limit || 100),
            siteOrigin: String(pushForm.siteOrigin || '').trim()
        })
        feedback.msgSuccess('站长平台推送任务已完成')
        await Promise.all([ loadLogs(), loadOverview() ])
    } catch (error) {
        console.error('站长平台推送失败:', error)
        feedback.msgError('站长平台推送失败，请先检查平台参数')
    } finally {
        loading.pushPlatform = false
    }
}

/**
 * 扁平化扫描日志中的 items，用于表格展示。
 */
const flattenScanItems = (rows: any[]) => {
    return (Array.isArray(rows) ? rows : [])
        .flatMap(run => Array.isArray(run?.items) ? run.items : [])
}

/**
 * 扁平化图片优化日志结构（run.items[].issues[]）。
 */
const flattenImageItems = (rows: any[]) => {
    return (Array.isArray(rows) ? rows : [])
        .flatMap(run => Array.isArray(run?.items) ? run.items : [])
        .flatMap(item => {
            const issueRows = Array.isArray(item?.issues) ? item.issues : []
            return issueRows.map((issue: any) => ({
                id: item?.id,
                name: item?.name,
                field: issue?.field,
                url: issue?.url,
                issues: issue?.issues || []
            }))
        })
}

/**
 * 自动任务类型转为中文展示。
 */
const formatAutoTaskType = (value: unknown): string => {
    const key = String(value || '').trim().toLowerCase()
    if (key === 'all') return '全部任务'
    if (key === 'invalid') return '失效 URL 检测'
    if (key === 'link-detector') return '进阶链接检测'
    if (key === 'image-optimization') return '图片优化检测'
    if (key === 'sitemap-generate') return 'Sitemap 生成'
    if (key === 'logs-404-digest') return '404 聚合摘要'
    if (key === 'push-platform') return '站长推送'
    return key || '-'
}

/**
 * 格式化 ISO 时间文本，统一后台展示格式。
 */
const formatDateTime = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return '-'
    const date = new Date(text)
    if (Number.isNaN(date.getTime())) return text
    const yyyy = date.getFullYear()
    const mm = `${date.getMonth() + 1}`.padStart(2, '0')
    const dd = `${date.getDate()}`.padStart(2, '0')
    const hh = `${date.getHours()}`.padStart(2, '0')
    const mi = `${date.getMinutes()}`.padStart(2, '0')
    const ss = `${date.getSeconds()}`.padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

onMounted(async () => {
    await Promise.all([
        loadConfig(),
        loadOverview(),
        loadLogs(),
        loadAutoTaskStatus()
    ])
})
</script>

<style scoped>
.uied-seo-center {
    padding: 10px;
}

.uied-seo-center__card {
    border-radius: 12px;
}

.uied-seo-center__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.uied-seo-center__header h2 {
    margin: 0;
    font-size: 20px;
    color: #1f2937;
}

.uied-seo-center__header p {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
}

.uied-seo-center__header-actions {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.uied-seo-center__overview {
    margin-bottom: 16px;
}

.uied-seo-center__tabs {
    margin-top: 6px;
}

.uied-seo-center__sub-tabs {
    margin-top: 8px;
}

.uied-seo-center__form {
    max-width: 980px;
}

.uied-seo-center__select {
    width: 220px;
}

.uied-seo-center__inline-actions {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.uied-seo-center__redirect-tools {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.uied-seo-center__monitor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.uied-seo-center__alert {
    margin-bottom: 12px;
}

.uied-seo-center__panel-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.uied-seo-center__internal-card {
    margin-top: 4px;
}

.uied-seo-center__internal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.uied-seo-center__simple-list {
    margin: 0;
    padding-left: 16px;
    line-height: 1.8;
    color: #374151;
    font-size: 13px;
}

.uied-seo-center__push-card,
.uied-seo-center__auto-card {
    margin-top: 12px;
}

.uied-seo-center__auto-actions {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.uied-seo-center__url-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: #4b5563;
    font-size: 12px;
    line-height: 1.5;
}

@media (max-width: 1200px) {
    .uied-seo-center__header {
        flex-direction: column;
        align-items: stretch;
    }

    .uied-seo-center__header-actions {
        justify-content: flex-start;
    }
}
</style>
