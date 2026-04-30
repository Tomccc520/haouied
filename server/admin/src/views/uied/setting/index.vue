<!--
 * @file views/uied/setting/index.vue
 * @description UIED 站点设置管理 - WordPress主题级别的丰富配置
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
-->
<template>
    <div class="site-setting">
        <el-card class="!border-none" shadow="never">
            <div class="setting-toolbar">
                <div class="toolbar-left">
                    <el-tag :type="hasPendingChanges ? 'warning' : 'success'" effect="plain">
                        {{ hasPendingChanges ? '有未保存改动' : '已与服务器保持一致' }}
                    </el-tag>
                    <span class="toolbar-time">最近保存：{{ lastSavedAtText }}</span>
                </div>
                <div class="toolbar-right">
                    <el-button
                        size="small"
                        :disabled="!hasCurrentTabChanges"
                        @click="handleResetCurrentTab"
                        >重置当前标签</el-button
                    >
                    <el-button size="small" :loading="reloadLoading" @click="handleReloadAll"
                        >重新加载</el-button
                    >
                    <el-button
                        type="primary"
                        size="small"
                        :loading="saveAllLoading"
                        @click="handleSaveAll"
                        >保存全部配置</el-button
                    >
                </div>
            </div>
            <el-tabs v-model="activeTab" tab-position="left" class="setting-tabs">
                <!-- ==================== 站点信息 ==================== -->
                <el-tab-pane name="siteInfo">
                    <template #label>
                        <span class="setting-tab-label">
                            <span>站点信息</span>
                            <span v-if="isUpdatedSettingTab('siteInfo')" class="setting-tab-label__badge">新</span>
                        </span>
                    </template>
                    <div class="setting-header">
                        <div class="setting-title-row">
                            <h2 class="setting-title">站点信息</h2>
                            <span v-if="isUpdatedSettingTab('siteInfo')" class="setting-title-badge">本版新增</span>
                        </div>
                        <p class="setting-desc">
                            配置网站的基本信息，包括名称、SEO、备案等。修改后保存即可生效。
                        </p>
                    </div>
                    <el-form :model="siteInfoData" label-width="120px" class="form-max-600">
                        <el-form-item>
                            <template #label>
                                <span>站点名称</span>
                                <el-tooltip
                                    content="显示在浏览器标签页和页面顶部的网站名称"
                                    placement="top"
                                >
                                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                                </el-tooltip>
                            </template>
                            <el-input
                                v-model="siteInfoData.siteName"
                                placeholder="请输入站点名称"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>站点标题</span
                                ><el-tooltip
                                    content="用于SEO的页面标题，建议30字以内"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.siteTitle"
                                placeholder="请输入站点标题"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>站点描述</span
                                ><el-tooltip
                                    content="用于SEO的页面描述，建议120字以内"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.siteDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="请输入站点描述"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>站点关键词</span
                                ><el-tooltip content="多个关键词用英文逗号分隔" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.siteKeywords"
                                placeholder="多个关键词用逗号分隔"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>Logo</span
                                ><el-tooltip
                                    content="网站Logo图片地址，支持PNG/SVG格式，推荐尺寸200x50px"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-start-gap-12">
                                <el-input
                                    v-model="siteInfoData.logo"
                                    placeholder="Logo URL"
                                    class="flex-1"
                                />
                                <material-picker v-model="siteInfoData.logo" :limit="1">
                                    <el-button>选择图片</el-button>
                                </material-picker>
                            </div>
                            <div v-if="siteInfoData.logo" class="mt-8">
                                <img
                                    :src="siteInfoData.logo"
                                    alt="Logo预览"
                                    class="logo-preview-image"
                                />
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label>
                                <span>头部品牌显示</span>
                                <el-tooltip
                                    content="控制头部菜单左侧品牌区显示图标、文案或两者同时显示"
                                    placement="top"
                                >
                                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                                </el-tooltip>
                            </template>
                            <el-radio-group v-model="siteInfoData.navbarLogoDisplayMode">
                                <el-radio-button label="icon_text">图标 + 文案</el-radio-button>
                                <el-radio-button label="text">仅文案</el-radio-button>
                                <el-radio-button label="icon">仅图标</el-radio-button>
                            </el-radio-group>
                            <div class="form-tip mt-8">
                                建议同时准备图标与文案，后续切换展示模式会更灵活。
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label>
                                <span>头部品牌文案</span>
                                <el-tooltip
                                    content="头部菜单左侧品牌文案，留空则默认使用站点名称"
                                    placement="top"
                                >
                                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                                </el-tooltip>
                            </template>
                            <el-input
                                v-model="siteInfoData.navbarLogoText"
                                maxlength="40"
                                show-word-limit
                                placeholder="留空则默认使用站点名称"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>Favicon</span
                                ><el-tooltip
                                    content="浏览器标签页小图标，建议32x32px，支持ICO/PNG格式"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-start-gap-12">
                                <el-input
                                    v-model="siteInfoData.favicon"
                                    placeholder="Favicon URL"
                                    class="flex-1"
                                />
                                <material-picker v-model="siteInfoData.favicon" :limit="1">
                                    <el-button>选择图片</el-button>
                                </material-picker>
                            </div>
                            <div v-if="siteInfoData.favicon" class="mt-8">
                                <img
                                    :src="siteInfoData.favicon"
                                    alt="Favicon预览"
                                    class="favicon-preview-image"
                                />
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>ICP备案号</span
                                ><el-tooltip
                                    content="显示在页面底部，如：京ICP备XXXXXXXX号"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input v-model="siteInfoData.icp" placeholder="请输入ICP备案号" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>版权信息</span
                                ><el-tooltip content="显示在页面底部的版权声明文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.copyright"
                                placeholder="请输入版权信息"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>联系邮箱</span
                                ><el-tooltip
                                    content="用于接收用户反馈和举报的邮箱地址"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.contactEmail"
                                placeholder="请输入联系邮箱"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>统计代码</span
                                ><el-tooltip
                                    content="第三方统计代码（如百度统计），将插入到页面底部"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="siteInfoData.analyticsCode"
                                type="textarea"
                                :rows="4"
                                placeholder="请输入统计代码"
                            />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="siteInfoLoading"
                                @click="handleSaveSiteInfo"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 品牌配置 ==================== -->
                <el-tab-pane v-if="false" label="品牌配置" name="brandConfig">
                    <div class="setting-header">
                        <h2 class="setting-title">品牌配置</h2>
                        <p class="setting-desc">
                            统一管理安装页、登录弹窗、404、首页兜底内容和更新记录页品牌链接。售卖版建议优先在这里收口品牌信息，避免前端继续写死。
                        </p>
                    </div>
                    <el-form :model="brandConfigData" label-width="140px" class="form-max-700">
                        <el-divider content-position="left">基础品牌信息</el-divider>
                        <p class="section-desc">
                            用于官网入口、购买链接和默认售后信息展示。
                        </p>
                        <el-form-item label="品牌名称">
                            <el-input v-model="brandConfigData.brandName" placeholder="例如：UIED导航系统" />
                        </el-form-item>
                        <el-form-item label="官网地址">
                            <el-input
                                v-model="brandConfigData.officialSiteUrl"
                                placeholder="https://fsuied.com"
                            />
                        </el-form-item>
                        <el-form-item label="购买链接">
                            <el-input
                                v-model="brandConfigData.buyUrl"
                                placeholder="https://fsuied.com/products/10"
                            />
                        </el-form-item>
                        <el-form-item label="咨询链接">
                            <el-input
                                v-model="brandConfigData.supportUrl"
                                placeholder="https://fsuied.com"
                            />
                        </el-form-item>
                        <el-form-item label="咨询按钮文案">
                            <el-input
                                v-model="brandConfigData.supportLabel"
                                placeholder="前往官网咨询"
                            />
                        </el-form-item>
                        <el-form-item label="客服 QQ">
                            <el-input
                                v-model="brandConfigData.supportQq"
                                placeholder="403479454"
                            />
                        </el-form-item>
                        <el-form-item label="官方群号">
                            <el-input
                                v-model="brandConfigData.supportQqGroup"
                                placeholder="1082794860"
                            />
                        </el-form-item>

                        <el-divider content-position="left">安装页默认值</el-divider>
                        <p class="section-desc">
                            安装页是首次交付场景，推荐把默认站点信息和引导文案在这里统一维护。
                        </p>
                        <el-form-item label="安装页标题">
                            <el-input
                                v-model="brandConfigData.installPageTitle"
                                placeholder="安装向导"
                            />
                        </el-form-item>
                        <el-form-item label="安装页说明">
                            <el-input
                                v-model="brandConfigData.installPageDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="正式交付流程说明"
                            />
                        </el-form-item>
                        <el-form-item label="默认站点名称">
                            <el-input
                                v-model="brandConfigData.installSiteName"
                                placeholder="默认站点名称"
                            />
                        </el-form-item>
                        <el-form-item label="默认站点标题">
                            <el-input
                                v-model="brandConfigData.installSiteTitle"
                                placeholder="默认站点标题"
                            />
                        </el-form-item>
                        <el-form-item label="默认站点描述">
                            <el-input
                                v-model="brandConfigData.installSiteDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="默认站点描述"
                            />
                        </el-form-item>
                        <el-form-item label="默认站点关键词">
                            <el-input
                                v-model="brandConfigData.installSiteKeywords"
                                placeholder="多个关键词英文逗号分隔"
                            />
                        </el-form-item>
                        <el-form-item label="默认管理员昵称">
                            <el-input
                                v-model="brandConfigData.installAdminNickname"
                                placeholder="系统管理员"
                            />
                        </el-form-item>

                        <el-divider content-position="left">登录弹窗</el-divider>
                        <p class="section-desc">
                            登录/注册弹窗的品牌文案统一在这里配置，避免前台继续写死 UIED。
                        </p>
                        <el-form-item label="Logo 文案">
                            <el-input
                                v-model="brandConfigData.authLogoText"
                                placeholder="例如：UIED"
                            />
                        </el-form-item>
                        <el-form-item label="登录标题">
                            <el-input
                                v-model="brandConfigData.authLoginTitle"
                                placeholder="欢迎回来"
                            />
                        </el-form-item>
                        <el-form-item label="登录副标题">
                            <el-input
                                v-model="brandConfigData.authLoginSubtitle"
                                placeholder="登录以体验更多精彩功能"
                            />
                        </el-form-item>
                        <el-form-item label="注册标题">
                            <el-input
                                v-model="brandConfigData.authRegisterTitle"
                                placeholder="加入品牌"
                            />
                        </el-form-item>
                        <el-form-item label="注册副标题">
                            <el-input
                                v-model="brandConfigData.authRegisterSubtitle"
                                placeholder="注册副标题"
                            />
                        </el-form-item>

                        <el-divider content-position="left">404 页面</el-divider>
                        <p class="section-desc">
                            配置 404 页的 SEO、默认文案和常用入口。短链命中时仍优先按运营规则跳转。
                        </p>
                        <el-form-item label="404 标题">
                            <el-input
                                v-model="brandConfigData.notFoundTitle"
                                placeholder="页面不存在或已迁移"
                            />
                        </el-form-item>
                        <el-form-item label="404 描述">
                            <el-input
                                v-model="brandConfigData.notFoundDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="404 页面说明"
                            />
                        </el-form-item>
                        <el-form-item label="SEO 标题">
                            <el-input
                                v-model="brandConfigData.notFoundSeoTitle"
                                placeholder="页面未找到"
                            />
                        </el-form-item>
                        <el-form-item label="SEO 描述">
                            <el-input
                                v-model="brandConfigData.notFoundSeoDescription"
                                type="textarea"
                                :rows="2"
                                placeholder="404 SEO 描述"
                            />
                        </el-form-item>
                        <el-form-item label="SEO 关键词">
                            <el-input
                                v-model="brandConfigData.notFoundSeoKeywords"
                                placeholder="404,页面未找到,导航站"
                            />
                        </el-form-item>
                        <el-form-item label="自动返回秒数">
                            <el-input-number
                                v-model="brandConfigData.notFoundAutoRedirectSeconds"
                                :min="3"
                                :max="30"
                            />
                            <span class="form-tip">命中短链规则前，404 页面默认返回首页倒计时。</span>
                        </el-form-item>
                        <div class="brand-array-block">
                            <div class="brand-array-block__header">
                                <span>404 快捷入口</span>
                                <el-button
                                    size="small"
                                    type="primary"
                                    plain
                                    @click="brandConfigData.notFoundQuickLinks.push(createBrandQuickLinkItem())"
                                >
                                    新增入口
                                </el-button>
                            </div>
                            <div
                                v-for="(item, index) in brandConfigData.notFoundQuickLinks"
                                :key="`quick-${index}`"
                                class="brand-array-card"
                            >
                                <div class="brand-array-card__grid brand-array-card__grid--three">
                                    <el-input v-model="item.label" placeholder="入口名称" />
                                    <el-input v-model="item.to" placeholder="/ai 或 https://example.com" />
                                    <div class="row-between-center">
                                        <el-switch v-model="item.newWindow" active-text="新窗口" inactive-text="当前页" />
                                        <el-button
                                            text
                                            type="danger"
                                            @click="brandConfigData.notFoundQuickLinks.splice(index, 1)"
                                        >
                                            删除
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <el-divider content-position="left">首页兜底内容</el-divider>
                        <p class="section-desc">
                            当后台广告位未配置时，首页 Banner 和轮播图使用这里的品牌兜底内容；留空则前台直接隐藏，不再显示演示数据。
                        </p>
                        <div class="brand-array-block">
                            <div class="brand-array-block__header">
                                <span>首页 Banner 兜底卡片</span>
                                <el-button
                                    size="small"
                                    type="primary"
                                    plain
                                    @click="brandConfigData.homeFallbackBannerCards.push(createBrandBannerCardItem(brandConfigData.homeFallbackBannerCards.length))"
                                >
                                    新增卡片
                                </el-button>
                            </div>
                            <div
                                v-for="(item, index) in brandConfigData.homeFallbackBannerCards"
                                :key="`banner-card-${index}`"
                                class="brand-array-card"
                            >
                                <div class="brand-array-card__grid brand-array-card__grid--two">
                                    <el-input v-model="item.title" placeholder="标题" />
                                    <el-input v-model="item.link" placeholder="跳转链接" />
                                </div>
                                <div class="brand-array-card__grid brand-array-card__grid--two">
                                    <el-input v-model="item.badge" placeholder="徽标文案（可空）" />
                                    <div class="row-center-gap-12">
                                        <el-color-picker v-model="item.color" />
                                        <el-input v-model="item.color" placeholder="#2563eb" class="flex-1" />
                                        <el-switch v-model="item.newWindow" active-text="新窗口" inactive-text="当前页" />
                                    </div>
                                </div>
                                <el-input
                                    v-model="item.description"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="简介文案"
                                />
                                <div class="brand-array-card__actions">
                                    <el-button
                                        text
                                        type="danger"
                                        @click="brandConfigData.homeFallbackBannerCards.splice(index, 1)"
                                    >
                                        删除卡片
                                    </el-button>
                                </div>
                            </div>
                        </div>

                        <div class="brand-array-block">
                            <div class="brand-array-block__header">
                                <span>首页轮播兜底内容</span>
                                <el-button
                                    size="small"
                                    type="primary"
                                    plain
                                    @click="brandConfigData.homeFallbackCarouselSlides.push(createBrandCarouselSlideItem())"
                                >
                                    新增轮播
                                </el-button>
                            </div>
                            <div
                                v-for="(item, index) in brandConfigData.homeFallbackCarouselSlides"
                                :key="`carousel-${index}`"
                                class="brand-array-card"
                            >
                                <div class="brand-array-card__grid brand-array-card__grid--two">
                                    <el-input v-model="item.title" placeholder="轮播标题" />
                                    <el-input v-model="item.link" placeholder="跳转链接" />
                                </div>
                                <el-input
                                    v-model="item.subtitle"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="轮播副标题"
                                />
                                <div class="row-start-gap-12">
                                    <el-input
                                        v-model="item.image"
                                        placeholder="轮播图片地址"
                                        class="flex-1"
                                    />
                                    <material-picker v-model="item.image" :limit="1">
                                        <el-button>选择图片</el-button>
                                    </material-picker>
                                    <el-switch v-model="item.newWindow" active-text="新窗口" inactive-text="当前页" />
                                </div>
                                <div class="brand-array-card__actions">
                                    <el-button
                                        text
                                        type="danger"
                                        @click="brandConfigData.homeFallbackCarouselSlides.splice(index, 1)"
                                    >
                                        删除轮播
                                    </el-button>
                                </div>
                            </div>
                        </div>

                        <el-divider content-position="left">更新记录页</el-divider>
                        <p class="section-desc">
                            更新记录页的作者说明、购买按钮、仓库链接和平台链接统一在这里维护。
                        </p>
                        <el-form-item label="作者名称">
                            <el-input
                                v-model="brandConfigData.changelogAuthorName"
                                placeholder="Tomda"
                            />
                        </el-form-item>
                        <el-form-item label="作者链接">
                            <el-input
                                v-model="brandConfigData.changelogAuthorUrl"
                                placeholder="https://tomda.top/"
                            />
                        </el-form-item>
                        <el-form-item label="作者说明">
                            <el-input
                                v-model="brandConfigData.changelogAuthorDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="作者说明"
                            />
                        </el-form-item>
                        <el-form-item label="购买按钮文案">
                            <el-input
                                v-model="brandConfigData.changelogBuyButtonText"
                                placeholder="购买源码授权"
                            />
                        </el-form-item>

                        <div class="brand-array-block">
                            <div class="brand-array-block__header">
                                <span>仓库链接</span>
                                <el-button
                                    size="small"
                                    type="primary"
                                    plain
                                    @click="brandConfigData.changelogRepoLinks.push(createBrandRepoLinkItem())"
                                >
                                    新增仓库链接
                                </el-button>
                            </div>
                            <div
                                v-for="(item, index) in brandConfigData.changelogRepoLinks"
                                :key="`repo-${index}`"
                                class="brand-array-card"
                            >
                                <div class="brand-array-card__grid brand-array-card__grid--three">
                                    <el-input v-model="item.name" placeholder="名称" />
                                    <el-input v-model="item.url" placeholder="链接地址" />
                                    <div class="row-between-center">
                                        <el-select v-model="item.iconKey" class="flex-1">
                                            <el-option
                                                v-for="option in brandRepoIconOptions"
                                                :key="option.value"
                                                :label="option.label"
                                                :value="option.value"
                                            />
                                        </el-select>
                                        <el-button
                                            text
                                            type="danger"
                                            @click="brandConfigData.changelogRepoLinks.splice(index, 1)"
                                        >
                                            删除
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="brand-array-block">
                            <div class="brand-array-block__header">
                                <span>平台链接</span>
                                <el-button
                                    size="small"
                                    type="primary"
                                    plain
                                    @click="brandConfigData.changelogPlatformLinks.push(createBrandPlatformLinkItem())"
                                >
                                    新增平台链接
                                </el-button>
                            </div>
                            <div
                                v-for="(item, index) in brandConfigData.changelogPlatformLinks"
                                :key="`platform-${index}`"
                                class="brand-array-card"
                            >
                                <div class="brand-array-card__grid brand-array-card__grid--two">
                                    <el-input v-model="item.name" placeholder="名称" />
                                    <div class="row-between-center">
                                        <el-input v-model="item.url" placeholder="链接地址" class="flex-1" />
                                        <el-button
                                            text
                                            type="danger"
                                            @click="brandConfigData.changelogPlatformLinks.splice(index, 1)"
                                        >
                                            删除
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="brandConfigLoading"
                                @click="handleSaveBrandConfig"
                            >
                                保存
                            </el-button>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 外观配置 ==================== -->
                <el-tab-pane label="外观配置" name="appearance">
                    <div class="setting-header">
                        <h2 class="setting-title">外观配置</h2>
                        <p class="setting-desc">
                            自定义网站的视觉风格，包括主题色、字体、圆角、间距等。类似WordPress主题自定义器。
                        </p>
                    </div>
                    <el-form :model="appearanceData" label-width="140px" class="form-max-650">
                        <el-divider content-position="left">主题色彩</el-divider>
                        <p class="section-desc">
                            设置网站的主色调和辅助色彩，影响按钮、链接、高亮等元素的颜色。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>主题色</span
                                ><el-tooltip
                                    content="网站的主色调，用于按钮、链接、高亮等元素"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-center-gap-12">
                                <el-color-picker v-model="appearanceData.primaryColor" />
                                <el-input
                                    v-model="appearanceData.primaryColor"
                                    class="input-w-140"
                                    placeholder="#0066ff"
                                />
                                <el-button
                                    text
                                    type="primary"
                                    @click="appearanceData.primaryColor = '#0066ff'"
                                    >重置</el-button
                                >
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>背景色</span
                                ><el-tooltip content="页面整体背景色，建议使用浅色" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-center-gap-12">
                                <el-color-picker v-model="appearanceData.backgroundColor" />
                                <el-input
                                    v-model="appearanceData.backgroundColor"
                                    class="input-w-140"
                                    placeholder="#f6f8fb"
                                />
                                <el-button
                                    text
                                    type="primary"
                                    @click="appearanceData.backgroundColor = '#f6f8fb'"
                                    >重置</el-button
                                >
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>卡片背景色</span
                                ><el-tooltip content="网站卡片和内容区块的背景色" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-center-gap-12">
                                <el-color-picker v-model="appearanceData.cardBackgroundColor" />
                                <el-input
                                    v-model="appearanceData.cardBackgroundColor"
                                    class="input-w-140"
                                    placeholder="#ffffff"
                                />
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>文字主色</span
                                ><el-tooltip content="正文和标题的主要文字颜色" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-center-gap-12">
                                <el-color-picker v-model="appearanceData.textPrimaryColor" />
                                <el-input
                                    v-model="appearanceData.textPrimaryColor"
                                    class="input-w-140"
                                    placeholder="#333333"
                                />
                            </div>
                        </el-form-item>
                        <el-divider content-position="left">字体设置</el-divider>
                        <p class="section-desc">
                            统一控制前端全站主字体。建议优先选预设方案，不够用时再填写自定义字体栈。
                        </p>
                        <el-form-item label="字体方案">
                            <el-select
                                v-model="appearanceFontPreset"
                                placeholder="请选择字体方案"
                                @change="handleAppearanceFontPresetChange"
                            >
                                <el-option
                                    v-for="item in fontPresetOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value"
                                />
                            </el-select>
                            <div class="form-tip">
                                预设会自动写入推荐字体栈，自定义模式下可手工修改下方主字体。
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>主字体</span
                                ><el-tooltip content="网站正文使用的字体名称" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="appearanceData.fontFamily"
                                placeholder='Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                            />
                            <div class="font-preview-panel">
                                <div class="font-preview-panel__header">
                                    <strong>字体预览</strong>
                                    <span>{{ appearanceData.fontFamily || '系统默认字体栈' }}</span>
                                </div>
                                <div
                                    class="font-preview-panel__content"
                                    :style="{ fontFamily: appearanceData.fontFamily || undefined }"
                                >
                                    <p>UIED 导航系统让前端品牌风格可以通过后台统一调整。</p>
                                    <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
                                    <p>常规标题、按钮文案、正文阅读都会跟随这里的字体设置。</p>
                                </div>
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>基础字号</span
                                ><el-tooltip content="网站正文的基础字号（px）" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="appearanceData.baseFontSize"
                                :min="12"
                                :max="20"
                            />
                            <span class="form-tip">px</span>
                        </el-form-item>
                        <el-divider content-position="left">圆角和布局</el-divider>
                        <p class="section-desc">调整卡片圆角大小和内容区域宽度。</p>
                        <el-form-item>
                            <template #label
                                ><span>卡片圆角</span
                                ><el-tooltip
                                    content="网站卡片的圆角大小（px），0为直角"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-slider
                                v-model="appearanceData.borderRadius"
                                :min="0"
                                :max="24"
                                :step="2"
                                show-stops
                                class="input-w-300"
                            />
                            <span class="form-tip">{{ appearanceData.borderRadius }}px</span>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>内容最大宽度</span
                                ><el-tooltip content="页面内容区域的最大宽度" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="appearanceData.contentMaxWidth"
                                class="input-w-200"
                            >
                                <el-option label="窄版 (1000px)" :value="1000" />
                                <el-option label="标准 (1200px)" :value="1200" />
                                <el-option label="宽版 (1400px)" :value="1400" />
                                <el-option label="超宽 (1600px)" :value="1600" />
                                <el-option label="全屏" :value="0" />
                            </el-select>
                        </el-form-item>
                        <el-divider content-position="left">自定义CSS</el-divider>
                        <p class="section-desc">高级用户可以在此添加自定义CSS代码。</p>
                        <el-form-item>
                            <template #label
                                ><span>自定义CSS</span
                                ><el-tooltip
                                    content="输入自定义CSS代码，将注入到前端页面"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="appearanceData.customCss"
                                type="textarea"
                                :rows="6"
                                placeholder="/* 在此输入自定义CSS */"
                            />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="appearanceLoading"
                                @click="handleSaveAppearance"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 首页配置 ==================== -->
                <el-tab-pane label="首页配置" name="homepage">
                    <div class="setting-header">
                        <h2 class="setting-title">首页配置</h2>
                        <p class="setting-desc">
                            配置首页各区块的显示、顺序和内容。可以自由开关和排列首页的各个模块。
                        </p>
                    </div>
                    <el-form :model="homepageData" label-width="140px" class="form-max-700">
                        <el-divider content-position="left">横幅区域 (Hero Banner)</el-divider>
                        <p class="section-desc">
                            首页顶部的大横幅区域，包含标题、搜索框和热门标签。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>显示横幅</span
                                ><el-tooltip
                                    content="关闭后首页将不显示顶部横幅区域"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="homepageData.heroBannerEnabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>横幅背景类型</span
                                ><el-tooltip content="选择横幅区域的背景样式" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="homepageData.heroBgType"
                                class="input-w-200"
                                :disabled="!homepageData.heroBannerEnabled"
                            >
                                <el-option label="默认背景图" value="default" />
                                <el-option label="纯色背景" value="color" />
                                <el-option label="渐变背景" value="gradient" />
                                <el-option label="自定义图片" value="image" />
                            </el-select>
                        </el-form-item>
                        <el-form-item v-if="homepageData.heroBgType === 'color'">
                            <template #label><span>背景颜色</span></template>
                            <div class="row-center-gap-12">
                                <el-color-picker v-model="homepageData.heroBgValue" />
                                <el-input
                                    v-model="homepageData.heroBgValue"
                                    class="input-w-200"
                                    placeholder="#1a1a2e"
                                />
                            </div>
                        </el-form-item>
                        <el-form-item v-if="homepageData.heroBgType === 'gradient'">
                            <template #label><span>渐变值</span></template>
                            <el-input
                                v-model="homepageData.heroBgValue"
                                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            />
                        </el-form-item>
                        <el-form-item v-if="homepageData.heroBgType === 'image'">
                            <template #label><span>背景图片URL</span></template>
                            <el-input
                                v-model="homepageData.heroBgValue"
                                placeholder="https://example.com/bg.jpg"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示模式</span
                                ><el-tooltip
                                    content="搜索模式显示搜索框，图标滚动模式显示网站图标墙"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="homepageData.heroDisplayMode"
                                class="input-w-200"
                                :disabled="!homepageData.heroBannerEnabled"
                            >
                                <el-option label="搜索模式" value="search" />
                                <el-option label="图标滚动" value="iconScroll" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>图标点击方式</span
                                ><el-tooltip
                                    content="图标滚动模式下可选：直达外部网站，或进入本站详情页"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="homepageData.heroIconClickMode"
                                class="input-w-200"
                                :disabled="!homepageData.heroBannerEnabled"
                            >
                                <el-option label="直达网站（默认）" value="direct" />
                                <el-option label="打开详情页" value="detail" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示收录统计</span
                                ><el-tooltip
                                    content="显示「已收录 XXX+ 个优质网站」的统计信息"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="homepageData.heroShowStats"
                                :disabled="!homepageData.heroBannerEnabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示热门标签</span
                                ><el-tooltip content="在搜索框下方显示热门搜索标签" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="homepageData.heroShowHotTags"
                                :disabled="!homepageData.heroBannerEnabled"
                            />
                        </el-form-item>
                        <el-divider content-position="left">推荐卡片区域</el-divider>
                        <p class="section-desc">横幅下方的推荐卡片区域，用于展示重点推荐内容。</p>
                        <el-form-item>
                            <template #label
                                ><span>显示推荐卡片</span
                                ><el-tooltip
                                    content="开启后在横幅下方显示推荐卡片区域"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="homepageData.bannerCardsEnabled" />
                        </el-form-item>
                        <el-divider content-position="left">首页轮播区域</el-divider>
                        <p class="section-desc">
                            控制首页顶部轮播区显示与排序，支持和推荐区自由排布。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>显示首页轮播</span
                                ><el-tooltip content="关闭后首页不显示轮播模块" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="homepageData.homeCarouselEnabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>轮播区排序</span
                                ><el-tooltip
                                    content="数字越小越靠前，建议 10、20 递增"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="homepageData.homeCarouselSort"
                                :min="1"
                                :max="999"
                            />
                        </el-form-item>
                        <el-divider content-position="left">热门推荐区域</el-divider>
                        <p class="section-desc">
                            展示热门推荐的网站列表，数据来源于「热门推荐」管理；可独立设置显示与排序。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>显示推荐区模块</span
                                ><el-tooltip content="关闭后首页不渲染推荐区模块" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="homepageData.homeRecommendationEnabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>推荐区排序</span
                                ><el-tooltip
                                    content="数字越小越靠前，建议 10、20 递增"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="homepageData.homeRecommendationSort"
                                :min="1"
                                :max="999"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示推荐内容</span
                                ><el-tooltip
                                    content="关闭后推荐区模块保留，但不展示推荐内容列表"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="homepageData.hotRecommendationsEnabled"
                                :disabled="!homepageData.homeRecommendationEnabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>推荐区标题</span
                                ><el-tooltip content="热门推荐区域的标题文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="homepageData.hotRecommendationsTitle"
                                placeholder="热门推荐"
                                :disabled="
                                    !homepageData.homeRecommendationEnabled ||
                                    !homepageData.hotRecommendationsEnabled
                                "
                            />
                        </el-form-item>
                        <el-divider content-position="left">首页入口页面</el-divider>
                        <p class="section-desc">
                            可将页面管理里的某个页面设为首页入口（访问 <code>/</code> 时直接渲染该页面）。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>首页页面</span
                                ><el-tooltip
                                    content="为空时使用默认首页（固定导航页）；选择后访问根路径 / 会直接显示该页面"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="row-center-gap-12 w-100">
                                <el-select
                                    v-model="homepageData.homePageSlug"
                                    class="flex-1"
                                    placeholder="请选择要作为首页的页面"
                                    filterable
                                    clearable
                                    :loading="pageOptionsLoading"
                                    @visible-change="handleHomepagePageDropdownVisible"
                                >
                                    <el-option label="默认首页（固定导航页）" value="" />
                                    <el-option
                                        v-for="page in pageOptions"
                                        :key="page.id"
                                        :label="`${page.name}（${page.slug}）`"
                                        :value="page.slug"
                                    />
                                    <el-option
                                        v-if="homepageSelectMissingOption"
                                        :label="homepageSelectMissingOption.label"
                                        :value="homepageSelectMissingOption.slug"
                                    />
                                </el-select>
                                <el-button :loading="pageOptionsLoading" @click="loadHomepagePageOptions()"
                                    >刷新页面列表</el-button
                                >
                            </div>
                        </el-form-item>
                        <el-divider content-position="left">导航切换配置</el-divider>
                        <p class="section-desc">
                            控制顶部 navSwitchItems 的显示开关与排序。可直接改文案与图标关键字。
                        </p>
                        <el-form-item label-width="0">
                            <div class="nav-switch-setting-table">
                                <div class="nav-switch-setting-header">
                                    <span>拖拽</span>
                                    <span>Slug</span>
                                    <span>名称</span>
                                    <span>图标</span>
                                    <span>显示</span>
                                    <span>排序</span>
                                </div>
                                <Draggable
                                    v-model="homepageData.navSwitchItems"
                                    item-key="slug"
                                    handle=".nav-switch-row-handle"
                                    :animation="180"
                                    ghost-class="nav-switch-setting-row--ghost"
                                    @end="handleNavSwitchSortEnd"
                                >
                                    <template #item="{ element }">
                                        <div class="nav-switch-setting-row">
                                            <span class="nav-switch-row-handle">⋮⋮</span>
                                            <el-input v-model="element.slug" placeholder="slug" />
                                            <el-input v-model="element.name" placeholder="显示名称" />
                                            <el-input
                                                v-model="element.icon"
                                                placeholder="图标关键字（如 AI/Figma）"
                                            />
                                            <el-switch v-model="element.visible" />
                                            <el-input-number v-model="element.sort" :min="1" :max="999" />
                                        </div>
                                    </template>
                                </Draggable>
                            </div>
                            <div class="nav-switch-live-preview">
                                <div class="nav-switch-live-preview__title">
                                    前端 <code>nav-switch-trigger</code> 实时预览
                                </div>
                                <div class="nav-switch-trigger-preview">
                                    <button class="nav-switch-trigger-preview__button" type="button">
                                        <span class="nav-switch-trigger-preview__icon">
                                            {{ currentNavSwitchPreviewItem?.icon || 'Design' }}
                                        </span>
                                        <span class="nav-switch-trigger-preview__name">
                                            {{ currentNavSwitchPreviewItem?.name || '导航切换' }}
                                        </span>
                                        <span class="nav-switch-trigger-preview__arrow">⌄</span>
                                    </button>
                                    <div class="nav-switch-trigger-preview__dropdown">
                                        <div
                                            v-for="(item, idx) in visibleNavSwitchPreviewItems"
                                            :key="`${item.slug}-${idx}`"
                                            class="nav-switch-trigger-preview__option"
                                        >
                                            <span class="nav-switch-trigger-preview__option-icon">{{ item.icon }}</span>
                                            <span class="nav-switch-trigger-preview__option-name">{{ item.name }}</span>
                                            <el-tag size="small" effect="plain">{{ item.slug }}</el-tag>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </el-form-item>
                        <el-divider content-position="left">内容中心配置</el-divider>
                        <p class="section-desc">
                            “热门文章 / 榜单系统 / 每日热榜 / 最新上新”已统一迁移到内容中心配置页，避免重复配置冲突。
                        </p>
                        <el-form-item>
                            <el-button type="primary" plain @click="router.push('/system-setting/base-config/content-hub')">
                                打开内容中心配置页
                            </el-button>
                        </el-form-item>
                        <el-divider content-position="left">广告位</el-divider>
                        <el-alert type="info" :closable="false" show-icon>
                            <template #title>
                                广告位已统一收敛到「广告管理」模块配置（支持图片/HTML/位置多选），此处不再维护旧版首页广告代码，避免重复配置冲突。
                            </template>
                        </el-alert>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="homepageLoading"
                                @click="handleSaveHomepage"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 页面配置 ==================== -->
                <el-tab-pane label="页面配置" name="pageConfig">
                    <div class="setting-header">
                        <h2 class="setting-title">页面配置</h2>
                        <p class="setting-desc">
                            控制前端网站卡片的点击行为、直达箭头、窗口打开方式等全局页面交互配置。
                        </p>
                        <el-alert type="info" :closable="false" show-icon class="mt-12">
                            <template #title>
                                <span class="font-500"
                                    >注意：此配置仅对「分类区域」的网站卡片生效，「热门推荐」区域有独立配置</span
                                >
                            </template>
                        </el-alert>
                    </div>
                    <el-form :model="pageConfigData" label-width="140px" class="form-max-650">
                        <el-divider content-position="left">分类区域点击行为</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>网站点击行为</span
                                ><el-tooltip placement="top"
                                    ><template #content
                                        >设置用户点击「分类区域」网站卡片时的行为：<br />「跳转详情页」-
                                        进入网站介绍页面<br />「直达网站」- 直接打开外部网站<br /><br />注意：热门推荐区域有独立配置</template
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="pageConfigData.websiteClickMode"
                                class="w-100"
                            >
                                <el-option label="跳转详情页" value="detail" />
                                <el-option label="直达网站" value="direct" />
                            </el-select>
                        </el-form-item>
                        <el-divider content-position="left">直达箭头</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>卡片直达箭头</span
                                ><el-tooltip placement="top"
                                    ><template #content
                                        >开启后，网站卡片右侧显示快捷按钮（鼠标移入时出现）。</template
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.showDirectArrow" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>箭头新窗口打开</span
                                ><el-tooltip
                                    content="开启后，点击直达箭头时在新标签页中打开"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.directArrowNewWindow" />
                        </el-form-item>
                        <el-divider content-position="left">窗口行为</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>详情页新窗口</span
                                ><el-tooltip
                                    content="开启后，点击卡片进入详情页时在新标签页打开"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                    ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.detailPageNewWindow" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>查看更多新窗口</span
                                ><el-tooltip
                                    content="开启后，分类区右侧“查看更多”图标在新标签页打开分类页"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.viewMoreNewWindow" />
                        </el-form-item>
                        <el-divider content-position="left">分页</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>每页显示数量</span
                                ><el-tooltip
                                    content="每页显示的网站数量，建议20-50之间"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="pageConfigData.pageSize"
                                :min="10"
                                :max="100"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>分页触发阈值</span
                                ><el-tooltip
                                    content="分类总数超过该值才启用分页；低于或等于该值时分类页默认展示全部。"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="pageConfigData.categoryPaginationThreshold"
                                :min="24"
                                :max="2000"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>分类页每页数</span
                                ><el-tooltip
                                    content="仅在超过分页触发阈值后生效。"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="pageConfigData.categoryPaginationPageSize"
                                :min="8"
                                :max="120"
                            />
                        </el-form-item>
                        <el-divider content-position="left">网站排序策略</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>排序=0新站优先</span
                                ><el-tooltip
                                    content="开启后，排序值为 0 的站点将按最新创建时间优先展示（同排序值内）。"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.sortZeroNewFirstEnabled" />
                        </el-form-item>
                        <el-divider content-position="left">热门推荐点击行为</el-divider>
                        <p class="section-desc">
                            热门推荐区域使用独立的点击行为配置，不受上方「分类区域」配置影响。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>热门推荐点击</span
                                ><el-tooltip placement="top"
                                    ><template #content
                                        >设置用户点击「热门推荐」区域卡片时的行为：<br />「跳转详情页」-
                                        进入网站介绍页面<br />「直达网站」-
                                        直接打开外部网站</template
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="pageConfigData.hotRecommendationClickMode"
                                class="w-100"
                            >
                                <el-option label="跳转详情页" value="detail" />
                                <el-option label="直达网站" value="direct" />
                            </el-select>
                        </el-form-item>
                        <el-divider content-position="left">外链来源参数（ref）</el-divider>
                        <p class="section-desc">
                            开启后，所有“直达外链”会自动补充 <code>?ref=参数值</code>，便于渠道统计与联盟归因。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>启用 ref 参数</span
                                ><el-tooltip
                                    content="仅作用于外部网站直达跳转，不影响站内详情页链接"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="pageConfigData.appendRefEnabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>ref 参数值</span
                                ><el-tooltip
                                    content="例如：hao.uied.cn。若目标链接已存在 ref 参数，将保留原值。"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="pageConfigData.appendRefValue"
                                :disabled="!pageConfigData.appendRefEnabled"
                                placeholder="例如：hao.uied.cn"
                                maxlength="120"
                                show-word-limit
                            />
                        </el-form-item>
                        <el-alert
                            type="info"
                            :closable="false"
                            show-icon
                            class="mb-16"
                        >
                            <template #title>
                                SVG 图标库已迁移到「素材中心 -> SVG图标库」统一维护，避免重复配置入口。
                            </template>
                        </el-alert>
                        <el-alert
                            type="success"
                            :closable="false"
                            show-icon
                            class="mb-16"
                        >
                            <template #title>
                                <span class="font-500">点击行为预览</span>
                            </template>
                            <div class="behavior-preview">
                                <p>
                                    分类区域卡片：{{
                                        pageConfigData.websiteClickMode === 'direct'
                                            ? '直达网站'
                                            : '跳转详情页'
                                    }}
                                </p>
                                <p>
                                    热门推荐卡片：{{
                                        pageConfigData.hotRecommendationClickMode === 'direct'
                                            ? '直达网站'
                                            : '跳转详情页'
                                    }}
                                </p>
                                <p>
                                    卡片箭头：{{
                                        pageConfigData.websiteClickMode === 'direct'
                                            ? '进入详情页'
                                            : '直达外部网站'
                                    }}
                                </p>
                                <p>
                                    直达外链 ref：{{
                                        pageConfigData.appendRefEnabled
                                            ? pageConfigData.appendRefValue || '已开启（未填写参数值）'
                                            : '关闭'
                                    }}
                                </p>
                            </div>
                        </el-alert>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="pageConfigLoading"
                                @click="handleSavePageConfig"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 卡片样式 ==================== -->
                <el-tab-pane label="卡片样式" name="cardStyle">
                    <div class="setting-header">
                        <h2 class="setting-title">卡片样式</h2>
                        <p class="setting-desc">
                            自定义网站卡片的展示样式，控制卡片上显示哪些信息。
                        </p>
                    </div>
                    <el-form :model="cardStyleData" label-width="140px" class="form-max-650">
                        <el-divider content-position="left">卡片布局</el-divider>
                        <p class="section-desc">设置网站列表的默认展示方式和列数。</p>
                        <el-form-item>
                            <template #label
                                ><span>默认布局</span
                                ><el-tooltip content="网站列表的默认展示方式" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select v-model="cardStyleData.defaultLayout" class="input-w-200">
                                <el-option label="网格布局" value="grid" />
                                <el-option label="列表布局" value="list" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>网格列数</span
                                ><el-tooltip
                                    content="网格布局时每行显示的卡片数量（桌面端）"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select v-model="cardStyleData.gridColumns" class="input-w-200">
                                <el-option label="3列" :value="3" />
                                <el-option label="4列（推荐）" :value="4" />
                                <el-option label="5列" :value="5" />
                                <el-option label="6列" :value="6" />
                            </el-select>
                        </el-form-item>
                        <el-divider content-position="left">卡片信息显示</el-divider>
                        <p class="section-desc">控制网站卡片上显示哪些信息元素。</p>
                        <el-form-item>
                            <template #label
                                ><span>显示描述</span
                                ><el-tooltip
                                    content="在卡片上显示网站的简短描述文字"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="cardStyleData.showDescription" />
                        </el-form-item>
                        <el-form-item v-if="cardStyleData.showDescription">
                            <template #label
                                ><span>描述行数</span
                                ><el-tooltip
                                    content="描述文字最多显示的行数，超出部分省略"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="cardStyleData.maxDescriptionLines"
                                :min="1"
                                :max="5"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示标签</span
                                ><el-tooltip
                                    content="在卡片上显示网站的标签（如：热门、新上线等）"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="cardStyleData.showTags" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示图标</span
                                ><el-tooltip content="在卡片上显示网站的Favicon图标" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="cardStyleData.showFavicon" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示URL</span
                                ><el-tooltip content="在卡片上显示网站的域名地址" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="cardStyleData.showUrl" />
                        </el-form-item>
                        <el-divider content-position="left">悬浮效果</el-divider>
                        <p class="section-desc">鼠标悬浮在卡片上时的视觉效果。</p>
                        <el-form-item>
                            <template #label
                                ><span>悬浮效果</span
                                ><el-tooltip content="鼠标悬浮时卡片的动画效果" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select v-model="cardStyleData.hoverEffect" class="input-w-200">
                                <el-option label="上移 + 边框变色" value="translateUp" />
                                <el-option label="仅边框变色" value="borderOnly" />
                                <el-option label="阴影效果" value="shadow" />
                                <el-option label="无效果" value="none" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="cardStyleLoading"
                                @click="handleSaveCardStyle"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 侧边栏配置 ==================== -->
                <el-tab-pane label="侧边栏配置" name="sidebar">
                    <div class="setting-header">
                        <h2 class="setting-title">侧边栏配置</h2>
                        <p class="setting-desc">
                            配置前端页面的侧边栏显示方式和内容。侧边栏用于展示分类导航。
                        </p>
                    </div>
                    <el-form :model="sidebarData" label-width="140px" class="form-max-650">
                        <el-divider content-position="left">侧边栏基础</el-divider>
                        <p class="section-desc">控制侧边栏的显示和位置。</p>
                        <el-form-item>
                            <template #label
                                ><span>显示侧边栏</span
                                ><el-tooltip
                                    content="关闭后页面将不显示侧边栏，内容区域占满全宽"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="sidebarData.enabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>侧边栏位置</span
                                ><el-tooltip
                                    content="侧边栏显示在页面的左侧还是右侧"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-select
                                v-model="sidebarData.position"
                                class="input-w-200"
                                :disabled="!sidebarData.enabled"
                            >
                                <el-option label="左侧" value="left" />
                                <el-option label="右侧" value="right" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>侧边栏宽度</span
                                ><el-tooltip content="侧边栏的宽度（px）" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="sidebarData.width"
                                :min="180"
                                :max="360"
                                :step="20"
                                :disabled="!sidebarData.enabled"
                            />
                            <span class="form-tip">px</span>
                        </el-form-item>
                        <el-divider content-position="left">侧边栏内容</el-divider>
                        <p class="section-desc">控制侧边栏中显示哪些内容模块。</p>
                        <el-form-item>
                            <template #label
                                ><span>显示分类导航</span
                                ><el-tooltip content="在侧边栏中显示分类树形导航" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="sidebarData.showCategories"
                                :disabled="!sidebarData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>显示网站数量</span
                                ><el-tooltip
                                    content="在分类名称旁显示该分类下的网站数量"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="sidebarData.showCategoryCount"
                                :disabled="!sidebarData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>默认展开子分类</span
                                ><el-tooltip
                                    content="页面加载时是否默认展开所有子分类"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="sidebarData.expandSubCategories"
                                :disabled="!sidebarData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>侧边栏吸顶</span
                                ><el-tooltip
                                    content="开启后，滚动页面时侧边栏会固定在顶部"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="sidebarData.sticky"
                                :disabled="!sidebarData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="sidebarLoading"
                                @click="handleSaveSidebar"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 搜索配置 ==================== -->
                <el-tab-pane label="搜索配置" name="search">
                    <div class="setting-header">
                        <h2 class="setting-title">搜索配置</h2>
                        <p class="setting-desc">配置前端搜索功能的行为和展示方式。</p>
                    </div>
                    <el-form :model="searchData" label-width="140px" class="form-max-650">
                        <el-divider content-position="left">搜索基础</el-divider>
                        <p class="section-desc">控制搜索功能的基本行为。</p>
                        <el-form-item>
                            <template #label
                                ><span>启用站内搜索</span
                                ><el-tooltip content="关闭后，前台搜索页将不再执行站内搜索请求" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="searchData.enabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>搜索占位文字</span
                                ><el-tooltip content="搜索框中的提示文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="searchData.placeholder"
                                placeholder="搜索网站名称..."
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>搜索网站</span
                                ><el-tooltip content="开启后，关键词搜索会检索网址数据" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="searchData.websiteSearchEnabled"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>搜索文章</span
                                ><el-tooltip content="开启后，关键词搜索会同时检索文章数据" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="searchData.articleSearchEnabled"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>搜索防抖延迟</span
                                ><el-tooltip
                                    content="用户停止输入后多少毫秒触发搜索，避免频繁请求"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="searchData.debounceDelay"
                                :min="100"
                                :max="1000"
                                :step="100"
                                :disabled="!searchData.enabled"
                            />
                            <span class="form-tip">毫秒</span>
                        </el-form-item>
                        <el-divider content-position="left">AI 搜索</el-divider>
                        <p class="section-desc">
                            AI搜索使用人工智能理解用户搜索意图，提供更精准的结果。需要先在「AI配置」中配置AI服务。
                        </p>
                        <el-form-item>
                            <template #label
                                ><span>启用AI搜索</span
                                ><el-tooltip content="开启后搜索框旁显示AI搜索按钮" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch
                                v-model="searchData.aiSearchEnabled"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>AI搜索按钮文字</span
                                ><el-tooltip content="AI搜索按钮上显示的文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="searchData.aiSearchBtnText"
                                placeholder="AI 搜索"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                        </el-form-item>
                        <el-divider content-position="left">搜索页 Hero</el-divider>
                        <p class="section-desc">
                            仅作用于 <code>/search</code> 页面首屏，不影响导航页 Hero；热门标签仍优先使用实时热搜，只有接口失败时才回退到这里。
                        </p>
                        <el-form-item label="Hero标题">
                            <el-input
                                v-model="searchData.heroTitle"
                                placeholder="全站搜索"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item label="Hero描述模板">
                            <el-input
                                v-model="searchData.heroDescriptionTemplate"
                                placeholder="收录 {count} 个优质网站资源"
                                :disabled="!searchData.enabled"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                支持占位符：<code>{count}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="Hero高亮词">
                            <el-input
                                v-model="searchData.heroHighlightText"
                                placeholder="可选，匹配标题中的某段文字做高亮"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item label="热搜兜底标签">
                            <el-input
                                v-model="searchData.hotSearchTagsText"
                                type="textarea"
                                :rows="3"
                                placeholder="每行一条，接口失败时用于 Hero 与搜索建议兜底"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-divider content-position="left">AI 搜索文案</el-divider>
                        <p class="section-desc">
                            统一控制搜索页和 AI 搜索侧边栏的提示语，避免两个入口各自写死。
                        </p>
                        <el-form-item label="站内搜索关闭提示">
                            <el-input
                                v-model="searchData.searchDisabledText"
                                placeholder="站内搜索功能已关闭"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item label="AI搜索关闭提示">
                            <el-input
                                v-model="searchData.aiSearchDisabledText"
                                placeholder="AI 搜索功能已关闭，请在后台配置中开启后再使用。"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item label="AI命中模板">
                            <el-input
                                v-model="searchData.aiResultSummaryTemplate"
                                placeholder="AI 智能推荐找到 {count} 个结果{extra}"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                支持占位符：<code>{count}</code>、<code>{extra}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="关键词命中模板">
                            <el-input
                                v-model="searchData.aiKeywordResultSummaryTemplate"
                                placeholder="关键词匹配找到 {count} 个结果"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                支持占位符：<code>{count}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="语义扩展模板">
                            <el-input
                                v-model="searchData.aiSemanticResultSummaryTemplate"
                                placeholder="AI 语义扩展已返回 {count} 个结果{extra}"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                支持占位符：<code>{count}</code>、<code>{extra}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="无结果提示">
                            <el-input
                                v-model="searchData.aiNoResultText"
                                placeholder="AI 未找到相关结果，请尝试其他描述"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                        </el-form-item>
                        <el-form-item label="失败降级提示">
                            <el-input
                                v-model="searchData.aiFallbackErrorText"
                                placeholder="AI 搜索暂时不可用，请稍后重试"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                        </el-form-item>
                        <el-form-item label="缓存后缀">
                            <el-input
                                v-model="searchData.aiCacheSuffixText"
                                placeholder="（缓存）"
                                :disabled="!searchData.enabled || !searchData.aiSearchEnabled"
                            />
                        </el-form-item>
                        <el-divider content-position="left">搜索结果</el-divider>
                        <p class="section-desc">控制搜索结果页面的展示方式。</p>
                        <el-form-item>
                            <template #label
                                ><span>高亮关键词</span
                                ><el-tooltip
                                    content="在搜索结果中高亮显示匹配的关键词"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="searchData.highlightKeyword" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>每页结果数</span
                                ><el-tooltip content="搜索结果每页显示的数量" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number
                                v-model="searchData.resultsPerPage"
                                :min="10"
                                :max="100"
                                :disabled="!searchData.enabled"
                            />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="searchLoading"
                                @click="handleSaveSearch"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 用户认证 ==================== -->
                <el-tab-pane label="用户认证" name="authConfig">
                    <div class="setting-header">
                        <h2 class="setting-title">用户认证与个人中心</h2>
                        <p class="setting-desc">
                            统一管理前端登录、注册、个人中心开关，以及微信开放平台、QQ互联、微信公众号登录的对接参数。
                        </p>
                    </div>
                    <el-form :model="authConfigData" label-width="160px" class="form-max-700">
                        <el-divider content-position="left">注册与登录</el-divider>
                        <el-form-item label="允许用户注册">
                            <el-switch
                                v-model="authConfigData.enable_register"
                                :active-value="1"
                                :inactive-value="0"
                                active-text="开启"
                                inactive-text="关闭"
                            />
                        </el-form-item>
                        <el-form-item
                            label="注册关闭提示"
                            v-if="authConfigData.enable_register === 0"
                        >
                            <el-input
                                v-model="authConfigData.register_close_message"
                                type="textarea"
                                :rows="2"
                                maxlength="255"
                                show-word-limit
                                placeholder="注册功能暂时关闭"
                            />
                        </el-form-item>
                        <el-form-item label="允许用户登录">
                            <el-switch
                                v-model="authConfigData.enable_login"
                                :active-value="1"
                                :inactive-value="0"
                                active-text="开启"
                                inactive-text="关闭"
                            />
                        </el-form-item>
                        <el-form-item
                            label="登录关闭提示"
                            v-if="authConfigData.enable_login === 0"
                        >
                            <el-input
                                v-model="authConfigData.login_close_message"
                                type="textarea"
                                :rows="2"
                                maxlength="255"
                                show-word-limit
                                placeholder="系统维护中，暂时无法登录"
                            />
                        </el-form-item>
                        <el-divider content-position="left">个人中心</el-divider>
                        <el-form-item label="开启个人中心">
                            <el-switch
                                v-model="authConfigData.enable_user_center"
                                :active-value="1"
                                :inactive-value="0"
                                active-text="开启"
                                inactive-text="关闭"
                            />
                        </el-form-item>
                        <el-form-item
                            label="个人中心关闭提示"
                            v-if="authConfigData.enable_user_center === 0"
                        >
                            <el-input
                                v-model="authConfigData.user_center_close_message"
                                type="textarea"
                                :rows="2"
                                maxlength="255"
                                show-word-limit
                                placeholder="个人中心功能暂时关闭"
                            />
                        </el-form-item>
                        <el-divider content-position="left">个人中心模块开关</el-divider>
                        <el-form-item label="显示个人资料">
                            <el-switch v-model="authConfigData.userCenterModules.profile" />
                        </el-form-item>
                        <el-form-item label="显示我的消息">
                            <el-switch v-model="authConfigData.userCenterModules.messages" />
                        </el-form-item>
                        <el-form-item label="显示我的订单">
                            <el-switch v-model="authConfigData.userCenterModules.orders" />
                        </el-form-item>
                        <el-form-item label="显示我的投放">
                            <el-switch v-model="authConfigData.userCenterModules.submissions" />
                        </el-form-item>
                        <el-form-item label="显示我的收藏">
                            <el-switch v-model="authConfigData.userCenterModules.collections" />
                        </el-form-item>
                        <el-form-item label="显示我的点赞">
                            <el-switch v-model="authConfigData.userCenterModules.likes" />
                        </el-form-item>
                        <el-form-item label="显示我的评论">
                            <el-switch v-model="authConfigData.userCenterModules.comments" />
                        </el-form-item>
                        <el-form-item label="显示登录日志">
                            <el-switch v-model="authConfigData.userCenterModules.loginLogs" />
                        </el-form-item>
                        <el-form-item label="显示账号安全">
                            <el-switch v-model="authConfigData.userCenterModules.security" />
                            <div class="form-tips">
                                仅控制个人中心前台展示入口，不影响后台接口权限与数据本身。
                            </div>
                        </el-form-item>
                        <el-divider content-position="left"
                            >微信开放平台网站应用 PC 扫码登录</el-divider
                        >
                        <el-form-item label="是否启用">
                            <el-switch v-model="authConfigData.wechatWebsiteLogin.enabled" />
                        </el-form-item>
                        <el-form-item label="AppID">
                            <el-input
                                v-model="authConfigData.wechatWebsiteLogin.appId"
                                maxlength="120"
                                show-word-limit
                                placeholder="请输入微信开放平台网站应用 AppID"
                            />
                        </el-form-item>
                        <el-form-item label="AppSecret">
                            <el-input
                                v-model="authConfigData.wechatWebsiteLogin.appSecret"
                                type="password"
                                show-password
                                maxlength="255"
                                show-word-limit
                                placeholder="请输入微信开放平台网站应用 AppSecret"
                            />
                        </el-form-item>
                        <el-form-item label="回调地址">
                            <el-input :model-value="wechatOpenPlatformCallbackPreview" readonly />
                            <div class="form-tips">
                                微信开放平台网站应用申请地址：
                                <a
                                    href="https://open.weixin.qq.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    https://open.weixin.qq.com/
                                </a>
                                。回调地址按当前 API 域名自动生成，无需手动填写。
                            </div>
                        </el-form-item>
                        <el-divider content-position="left">QQ 互联网页登录</el-divider>
                        <el-form-item label="是否启用">
                            <el-switch v-model="authConfigData.qqLogin.enabled" />
                        </el-form-item>
                        <el-form-item label="AppID">
                            <el-input
                                v-model="authConfigData.qqLogin.appId"
                                maxlength="120"
                                show-word-limit
                                placeholder="请输入 QQ 互联 AppID"
                            />
                        </el-form-item>
                        <el-form-item label="AppKey">
                            <el-input
                                v-model="authConfigData.qqLogin.appKey"
                                type="password"
                                show-password
                                maxlength="255"
                                show-word-limit
                                placeholder="请输入 QQ 互联 AppKey"
                            />
                            <div class="form-tips">
                                QQ 互联入口：
                                <a
                                    href="https://connect.qq.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    https://connect.qq.com/
                                </a>
                                。创建网页应用后将回调地址配置到“回调地址”，无需前台手工填写。
                            </div>
                        </el-form-item>
                        <el-form-item label="回调地址">
                            <el-input :model-value="qqOauthCallbackPreview" readonly />
                        </el-form-item>
                        <el-divider content-position="left">微信公众号登录</el-divider>
                        <el-form-item label="是否启用">
                            <el-switch v-model="authConfigData.wechatOfficialAccountLogin.enabled" />
                        </el-form-item>
                        <el-form-item label="AppID">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.appId"
                                maxlength="120"
                                show-word-limit
                                placeholder="请输入微信公众号 AppID"
                            />
                        </el-form-item>
                        <el-form-item label="AppSecret">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.appSecret"
                                type="password"
                                show-password
                                maxlength="255"
                                show-word-limit
                                placeholder="请输入微信公众号 AppSecret"
                            />
                            <div class="form-tips">
                                微信公众平台入口：
                                <a
                                    href="https://mp.weixin.qq.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    https://mp.weixin.qq.com/
                                </a>
                                。请在公众号后台配置“网页授权域名”与“服务器配置”后再联调。公众号授权登录建议使用已认证服务号，订阅号通常无法用于完整网页授权登录。
                            </div>
                        </el-form-item>
                        <el-form-item label="网页授权回调">
                            <el-input :model-value="wechatOfficialOauthCallbackPreview" readonly />
                        </el-form-item>
                        <el-divider content-position="left">域名校验文件</el-divider>
                        <el-form-item label="域名校验文件名">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.domainVerifyFileName"
                                maxlength="120"
                                show-word-limit
                                placeholder="例如：MP_verify_xxx.txt"
                            />
                            <div class="form-tips">
                                用于微信公众平台配置业务域名 / JS安全域名时的文件校验。保存后，官网根路径会自动返回该文件。
                            </div>
                        </el-form-item>
                        <el-form-item label="域名校验文件内容">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.domainVerifyFileContent"
                                type="textarea"
                                :rows="4"
                                maxlength="5000"
                                show-word-limit
                                placeholder="例如访问：https://fsuied.com/MP_verify_xxx.txt 时，官网会直接输出这里保存的内容。"
                            />
                        </el-form-item>
                        <el-form-item
                            label="校验文件访问地址"
                            v-if="wechatOfficialVerifyFilePreview"
                        >
                            <el-input :model-value="wechatOfficialVerifyFilePreview" readonly />
                        </el-form-item>
                        <el-divider content-position="left">扫码关注自动登录</el-divider>
                        <el-form-item label="是否启用">
                            <el-switch
                                v-model="authConfigData.wechatOfficialAccountLogin.scanAutoLoginEnabled"
                            />
                        </el-form-item>
                        <el-form-item label="提示文案">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.scanAutoLoginPrompt"
                                type="textarea"
                                :rows="2"
                                maxlength="255"
                                show-word-limit
                                placeholder="请输入扫码关注自动登录提示文案"
                            />
                        </el-form-item>
                        <el-divider content-position="left">事件回调配置</el-divider>
                        <el-form-item label="事件回调路径">
                            <el-input :model-value="wechatOfficialEventCallbackPreview" readonly />
                            <div class="form-tips">
                                用于微信公众号“服务器配置”URL 路径，默认值即可。
                            </div>
                        </el-form-item>
                        <el-form-item label="回调校验 Token">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.callbackToken"
                                maxlength="120"
                                show-word-limit
                                placeholder="需与微信公众号后台“服务器配置”中的 Token 完全一致"
                            />
                        </el-form-item>
                        <el-form-item label="EncodingAESKey">
                            <el-input
                                v-model="authConfigData.wechatOfficialAccountLogin.encodingAESKey"
                                maxlength="43"
                                show-word-limit
                                placeholder="请输入 43 位 EncodingAESKey"
                            />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="authConfigLoading"
                                @click="handleSaveAuthConfig"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 投稿服务 ==================== -->
                <el-tab-pane name="submissionService">
                    <template #label>
                        <span class="setting-tab-label">
                            <span>投稿服务</span>
                            <span v-if="isUpdatedSettingTab('submissionService')" class="setting-tab-label__badge">新</span>
                        </span>
                    </template>
                    <div class="setting-header">
                        <div class="setting-title-row">
                            <h2 class="setting-title">投稿服务</h2>
                            <span v-if="isUpdatedSettingTab('submissionService')" class="setting-title-badge">本版新增</span>
                        </div>
                        <p class="setting-desc">
                            配置投稿页的基础收录模式、收费规则、置顶/Banner 增值加购项与 FAQ 文案。
                        </p>
                    </div>
                    <el-form :model="submissionServiceData" label-width="140px" class="form-max-700">
                        <el-divider content-position="left">页面基础</el-divider>
                        <el-form-item label="开启投稿页">
                            <el-switch v-model="submissionServiceData.enabled" />
                        </el-form-item>
                        <el-form-item label="眉标题">
                            <el-input
                                v-model="submissionServiceData.pageEyebrow"
                                placeholder="如：Website Submission"
                            />
                        </el-form-item>
                        <el-form-item label="页面标题">
                            <el-input v-model="submissionServiceData.pageTitle" />
                        </el-form-item>
                        <el-form-item label="页面副标题">
                            <el-input v-model="submissionServiceData.pageSubtitle" />
                        </el-form-item>
                        <el-form-item label="页面描述">
                            <el-input
                                v-model="submissionServiceData.pageDescription"
                                type="textarea"
                                :rows="2"
                            />
                        </el-form-item>
                        <el-form-item label="页面宽度">
                            <el-input-number
                                v-model="submissionServiceData.containerMaxWidth"
                                :min="960"
                                :max="1600"
                                :step="20"
                            />
                            <span class="form-tip">px</span>
                        </el-form-item>
                        <el-form-item label="Hero 高亮">
                            <el-input
                                v-model="submissionServiceData.heroHighlightsText"
                                type="textarea"
                                :rows="3"
                                placeholder="每行一条，展示在前台头图高亮标签"
                            />
                        </el-form-item>

                        <el-divider content-position="left">关闭态</el-divider>
                        <el-form-item label="关闭标题">
                            <el-input v-model="submissionServiceData.closedTitle" />
                        </el-form-item>
                        <el-form-item label="关闭说明">
                            <el-input
                                v-model="submissionServiceData.closedDescription"
                                type="textarea"
                                :rows="2"
                            />
                        </el-form-item>
                        <el-form-item label="关闭按钮文案">
                            <el-input v-model="submissionServiceData.closedButtonText" />
                        </el-form-item>
                        <el-form-item label="关闭按钮链接">
                            <el-input
                                v-model="submissionServiceData.closedButtonUrl"
                                placeholder="/ 或 https://fsuied.com/products/10"
                            />
                        </el-form-item>

                        <el-divider content-position="left">服务流程</el-divider>
                        <el-form-item label="流程标题">
                            <el-input v-model="submissionServiceData.processTitle" />
                        </el-form-item>
                        <el-form-item label="流程说明">
                            <el-input
                                v-model="submissionServiceData.processDescription"
                                type="textarea"
                                :rows="2"
                            />
                        </el-form-item>
                        <el-form-item label="流程步骤">
                            <el-input
                                v-model="submissionServiceData.processStepsText"
                                type="textarea"
                                :rows="5"
                                placeholder="每行一条，格式：标题|描述"
                            />
                        </el-form-item>

                        <el-divider content-position="left">基础提交收录</el-divider>
                        <p class="section-desc">
                            /submit 固定作为免费收录入口；/submit/services 用于收录与增值服务加购。
                            这里保留模式配置用于历史兼容，新客户默认按免费收录交付。
                        </p>
                        <el-form-item label="开启服务">
                            <el-switch v-model="submissionServiceData.submitEnabled" />
                        </el-form-item>
                        <el-form-item label="投稿模式">
                            <el-radio-group v-model="submissionServiceData.submitMode">
                                <el-radio-button label="paid">付费收录</el-radio-button>
                                <el-radio-button label="free">免费收录</el-radio-button>
                            </el-radio-group>
                            <div class="form-tip">
                                免费模式不会清空原有价格，后续切回付费时可继续使用历史价格。
                            </div>
                        </el-form-item>
                        <el-alert
                            :title="submissionServiceData.submitMode === 'free' ? '当前为免费收录模式' : '当前为付费收录模式'"
                            :description="submissionServiceData.submitMode === 'free'
                                ? '/submit 会固定显示免费提交；/submit/services 可继续叠加置顶推荐或 Banner 位。'
                                : '历史兼容模式：/submit/services 会按这里设置的基础服务价创建订单；/submit 仍固定免费。'"
                            :type="submissionServiceData.submitMode === 'free' ? 'success' : 'info'"
                            :closable="false"
                            show-icon
                            class="submission-mode-alert"
                        />
                        <el-form-item label="服务名称">
                            <el-input v-model="submissionServiceData.submitLabel" />
                        </el-form-item>
                        <el-form-item label="服务标签">
                            <el-input v-model="submissionServiceData.submitBadge" placeholder="如：基础服务" />
                        </el-form-item>
                        <el-form-item label="服务描述">
                            <el-input v-model="submissionServiceData.submitDescription" type="textarea" :rows="2" />
                        </el-form-item>
                        <el-form-item label="价格">
                            <el-input-number
                                v-model="submissionServiceData.submitPrice"
                                :min="0"
                                :max="999999"
                                :step="1"
                                :disabled="submissionServiceData.submitMode === 'free'"
                            />
                            <span class="form-tip">
                                {{ submissionServiceData.submitMode === 'free' ? '免费模式下按 0 元展示，当前价格仅保留作切回付费时使用。' : '这里的价格会直接作为前台展示价和实际下单价。' }}
                            </span>
                        </el-form-item>
                        <el-form-item label="原价">
                            <el-input-number
                                v-model="submissionServiceData.submitOriginalPrice"
                                :min="0"
                                :max="999999"
                                :step="1"
                                :disabled="submissionServiceData.submitMode === 'free'"
                            />
                        </el-form-item>
                        <el-form-item label="按钮文案">
                            <el-input v-model="submissionServiceData.submitCtaText" />
                        </el-form-item>
                        <el-form-item label="权益列表">
                            <el-input
                                v-model="submissionServiceData.submitFeaturesText"
                                type="textarea"
                                :rows="4"
                                placeholder="每行一个权益"
                            />
                        </el-form-item>

                        <el-divider content-position="left">置顶推荐加购</el-divider>
                        <el-form-item label="开启服务">
                            <el-switch v-model="submissionServiceData.topEnabled" />
                        </el-form-item>
                        <el-form-item label="服务名称">
                            <el-input v-model="submissionServiceData.topLabel" />
                        </el-form-item>
                        <el-form-item label="服务标签">
                            <el-input v-model="submissionServiceData.topBadge" placeholder="如：曝光增强" />
                        </el-form-item>
                        <el-form-item label="服务描述">
                            <el-input v-model="submissionServiceData.topDescription" type="textarea" :rows="2" />
                        </el-form-item>
                        <el-form-item label="价格">
                            <el-input-number v-model="submissionServiceData.topPrice" :min="0" :max="999999" :step="1" />
                        </el-form-item>
                        <el-form-item label="原价">
                            <el-input-number v-model="submissionServiceData.topOriginalPrice" :min="0" :max="999999" :step="1" />
                        </el-form-item>
                        <el-form-item label="按钮文案">
                            <el-input v-model="submissionServiceData.topCtaText" />
                        </el-form-item>
                        <el-form-item label="权益列表">
                            <el-input
                                v-model="submissionServiceData.topFeaturesText"
                                type="textarea"
                                :rows="4"
                                placeholder="每行一个权益"
                            />
                        </el-form-item>

                        <el-divider content-position="left">Banner 位加购</el-divider>
                        <el-form-item label="开启服务">
                            <el-switch v-model="submissionServiceData.bannerEnabled" />
                        </el-form-item>
                        <el-form-item label="服务名称">
                            <el-input v-model="submissionServiceData.bannerLabel" />
                        </el-form-item>
                        <el-form-item label="服务标签">
                            <el-input v-model="submissionServiceData.bannerBadge" placeholder="如：高曝光" />
                        </el-form-item>
                        <el-form-item label="服务描述">
                            <el-input v-model="submissionServiceData.bannerDescription" type="textarea" :rows="2" />
                        </el-form-item>
                        <el-form-item label="价格">
                            <el-input-number v-model="submissionServiceData.bannerPrice" :min="0" :max="999999" :step="1" />
                        </el-form-item>
                        <el-form-item label="原价">
                            <el-input-number v-model="submissionServiceData.bannerOriginalPrice" :min="0" :max="999999" :step="1" />
                        </el-form-item>
                        <el-form-item label="按钮文案">
                            <el-input v-model="submissionServiceData.bannerCtaText" />
                        </el-form-item>
                        <el-form-item label="权益列表">
                            <el-input
                                v-model="submissionServiceData.bannerFeaturesText"
                                type="textarea"
                                :rows="4"
                                placeholder="每行一个权益"
                            />
                        </el-form-item>

                        <el-divider content-position="left">提交须知</el-divider>
                        <el-form-item label="须知标题">
                            <el-input v-model="submissionServiceData.submitNoticeTitle" />
                        </el-form-item>
                        <el-form-item label="须知内容">
                            <el-input
                                v-model="submissionServiceData.submitNoticeText"
                                type="textarea"
                                :rows="5"
                                placeholder="每行一条"
                            />
                        </el-form-item>

                        <el-divider content-position="left">FAQ</el-divider>
                        <el-form-item label="FAQ 标题">
                            <el-input v-model="submissionServiceData.faqTitle" />
                        </el-form-item>
                        <el-form-item label="FAQ 内容">
                            <el-input
                                v-model="submissionServiceData.faqText"
                                type="textarea"
                                :rows="5"
                                placeholder="每行一条，格式：问题|答案"
                            />
                        </el-form-item>

                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="submissionServiceLoading"
                                @click="handleSaveSubmissionService"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 支付中心 ==================== -->
                <el-tab-pane label="支付中心" name="paymentConfig">
                    <div class="setting-header">
                        <h2 class="setting-title">支付中心</h2>
                        <p class="setting-desc">
                            全站统一支付接口配置。投稿收录、广告位购买、后续订单都复用这里的支付参数。
                        </p>
                    </div>
                    <el-form :model="paymentConfigData" label-width="140px" class="form-max-700">
                        <el-divider content-position="left">支付总开关</el-divider>
                        <el-form-item label="开启支付中心">
                            <el-switch v-model="paymentConfigData.enabled" />
                        </el-form-item>
                        <el-form-item label="允许支付宝">
                            <el-switch v-model="paymentConfigData.allowAlipay" />
                        </el-form-item>
                        <el-form-item label="允许微信">
                            <el-switch v-model="paymentConfigData.allowWechat" />
                        </el-form-item>
                        <el-form-item label="订单过期时间">
                            <el-input-number
                                v-model="paymentConfigData.orderExpireMinutes"
                                :min="5"
                                :max="180"
                            />
                            <span class="form-tip">分钟</span>
                        </el-form-item>
                        <el-form-item label="回调域名基址">
                            <el-input
                                v-model="paymentConfigData.notifyBaseUrl"
                                placeholder="如：https://hao.uied.cn"
                            />
                        </el-form-item>

                        <el-divider content-position="left">支付宝官方（Page Pay）</el-divider>
                        <el-form-item label="开启支付宝">
                            <el-switch v-model="paymentConfigData.alipayEnabled" />
                        </el-form-item>
                        <el-form-item label="网关地址">
                            <el-input v-model="paymentConfigData.alipayGateway" />
                        </el-form-item>
                        <el-form-item label="APPID">
                            <el-input v-model="paymentConfigData.alipayAppId" />
                        </el-form-item>
                        <el-form-item label="商户ID">
                            <el-input v-model="paymentConfigData.alipaySellerId" />
                        </el-form-item>
                        <el-form-item label="应用私钥">
                            <el-input
                                v-model="paymentConfigData.alipayPrivateKey"
                                type="textarea"
                                :rows="4"
                                placeholder="支持 PEM 或单行密钥"
                            />
                        </el-form-item>
                        <el-form-item label="支付宝公钥">
                            <el-input
                                v-model="paymentConfigData.alipayPublicKey"
                                type="textarea"
                                :rows="4"
                                placeholder="支持 PEM 或单行公钥"
                            />
                        </el-form-item>
                        <el-form-item label="前台回跳地址">
                            <el-input v-model="paymentConfigData.alipayReturnUrl" />
                        </el-form-item>
                        <el-form-item label="异步回调地址">
                            <el-input v-model="paymentConfigData.alipayNotifyUrl" />
                        </el-form-item>

                        <el-divider content-position="left">微信官方（V2 H5）</el-divider>
                        <el-form-item label="开启微信支付">
                            <el-switch v-model="paymentConfigData.wechatEnabled" />
                        </el-form-item>
                        <el-form-item label="APPID">
                            <el-input v-model="paymentConfigData.wechatAppId" />
                        </el-form-item>
                        <el-form-item label="商户号">
                            <el-input v-model="paymentConfigData.wechatMchId" />
                        </el-form-item>
                        <el-form-item label="API Key">
                            <el-input v-model="paymentConfigData.wechatApiKey" />
                        </el-form-item>
                        <el-form-item label="异步回调地址">
                            <el-input v-model="paymentConfigData.wechatNotifyUrl" />
                        </el-form-item>
                        <el-form-item label="场景名称">
                            <el-input v-model="paymentConfigData.wechatSceneName" />
                        </el-form-item>
                        <el-form-item label="本地联调模拟支付">
                            <el-switch v-model="paymentConfigData.wechatMockModeEnabled" />
                            <span class="form-tip">
                                仅建议本地联调用。开启后点击微信支付会走模拟回调并将订单直接置为已支付。
                            </span>
                        </el-form-item>
                        <el-form-item label="模拟支付回跳地址">
                            <el-input
                                v-model="paymentConfigData.wechatMockReturnPath"
                                placeholder="/submit 或 /profile?tab=orders"
                            />
                            <span class="form-tip">
                                支持站内路径或完整 URL，默认回跳到 /submit。
                            </span>
                        </el-form-item>

                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="paymentConfigLoading"
                                @click="handleSavePaymentConfig"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <!-- ==================== 跳转提醒 ==================== -->
                <el-tab-pane label="跳转提醒" name="exitModal">
                    <div class="setting-header">
                        <h2 class="setting-title">跳转提醒</h2>
                        <p class="setting-desc">配置用户点击外部链接时的跳转确认弹窗。</p>
                        <el-alert
                            type="warning"
                            :closable="false"
                            show-icon
                            class="mt-12"
                        >
                            <template #title>
                                <span class="font-500"
                                    >注意：分类区域与热门推荐区域已使用独立的「详情页/直达」逻辑，跳转提醒不参与这两类卡片点击行为</span
                                >
                            </template>
                        </el-alert>
                    </div>
                    <el-form :model="exitModalData" label-width="120px" class="form-max-600">
                        <!-- 提示：当前跳转提醒不参与分类区域与热门推荐卡片点击行为 -->
                        <el-alert
                            type="warning"
                            :closable="false"
                            show-icon
                            class="mb-20"
                        >
                            <template #title>
                                <div class="row-between-center">
                                    <span
                                        >当前配置仅用于其他扩展跳转场景，分类区域与热门推荐卡片点击不会触发此弹窗</span
                                    >
                                    <el-button
                                        type="primary"
                                        size="small"
                                        @click="activeTab = 'pageConfig'"
                                        class="ml-12"
                                    >
                                        前往设置
                                    </el-button>
                                </div>
                            </template>
                        </el-alert>

                        <el-form-item>
                            <template #label
                                ><span>启用弹窗</span
                                ><el-tooltip
                                    content="开启后，用户点击外部链接时会弹出确认提示"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="exitModalData.enabled" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>弹窗标题</span
                                ><el-tooltip content="弹窗顶部显示的标题文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input v-model="exitModalData.title" placeholder="即将离开本站" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>弹窗描述</span
                                ><el-tooltip content="弹窗中显示的提示说明文字" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="exitModalData.description"
                                type="textarea"
                                :rows="2"
                                placeholder="您即将访问外部网站，请注意安全"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>弹窗Logo</span
                                ><el-tooltip
                                    content="用于弹窗顶部品牌展示，建议使用透明背景 PNG"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <div class="w-100">
                                <el-input
                                    v-model="exitModalData.logo"
                                    placeholder="请输入Logo地址或通过素材库选择"
                                />
                                <material-picker v-model="exitModalData.logo" :limit="1">
                                    <el-button class="mt-8">从素材库选择</el-button>
                                </material-picker>
                                <div v-if="exitModalData.logo" class="mt-8">
                                    <el-image
                                        :src="exitModalData.logo"
                                        class="exit-logo-preview-image"
                                        fit="contain"
                                    />
                                </div>
                            </div>
                        </el-form-item>
                        <el-divider content-position="left">协议配置</el-divider>
                        <el-form-item>
                            <template #label
                                ><span>显示协议链接</span
                                ><el-tooltip
                                    content="开启后，在弹窗底部显示用户协议与版权协议入口"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="exitModalData.showAgreementLinks" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>用户协议标题</span
                                ><el-tooltip content="弹窗中展示的用户协议文案" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="exitModalData.userAgreementText"
                                placeholder="用户协议"
                                :disabled="!exitModalData.showAgreementLinks"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>用户协议链接</span
                                ><el-tooltip content="用户协议页面地址（URL）" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="exitModalData.userAgreementUrl"
                                placeholder="https://example.com/user-agreement"
                                :disabled="!exitModalData.showAgreementLinks"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>版权协议标题</span
                                ><el-tooltip content="弹窗中展示的版权协议文案" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="exitModalData.copyrightAgreementText"
                                placeholder="版权协议"
                                :disabled="!exitModalData.showAgreementLinks"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>版权协议链接</span
                                ><el-tooltip content="版权协议页面地址（URL）" placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input
                                v-model="exitModalData.copyrightAgreementUrl"
                                placeholder="https://example.com/copyright-agreement"
                                :disabled="!exitModalData.showAgreementLinks"
                            />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>自动跳转</span
                                ><el-tooltip
                                    content="开启后，倒计时结束将自动跳转到目标网站"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-switch v-model="exitModalData.autoRedirect" />
                        </el-form-item>
                        <el-form-item>
                            <template #label
                                ><span>倒计时(秒)</span
                                ><el-tooltip
                                    content="自动跳转前的等待秒数，建议3-10秒"
                                    placement="top"
                                    ><el-icon class="label-tip-icon"
                                        ><QuestionFilled /></el-icon></el-tooltip
                            ></template>
                            <el-input-number v-model="exitModalData.countdown" :min="1" :max="30" />
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                :loading="exitModalLoading"
                                @click="handleSaveExitModal"
                                >保存</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedSetting">
/**
 * @file views/uied/setting/index.vue
 * @description UIED 站点设置管理 - WordPress主题级别的丰富配置
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
 */
import {
    uiedPublicSettings,
    uiedSiteInfo,
    uiedSaveSiteInfo,
    uiedPageAll,
    uiedSettingGet,
    uiedSettingSave,
    uiedSettingAuthConfigGet,
    uiedSettingAuthConfigUpdate
} from '@/api/uied'
import { QuestionFilled } from '@element-plus/icons-vue'
import Draggable from 'vuedraggable'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_UPDATE_HIGHLIGHTS, normalizeAdminUpdateRoutePath } from '@/config/updateHighlights'
import feedback from '@/utils/feedback'

const route = useRoute()
const router = useRouter()
const activeTab = ref('siteInfo')
const reloadLoading = ref(false)
const saveAllLoading = ref(false)
const lastSavedAt = ref<number | null>(null)
const settingTabNameSet = new Set([
    'siteInfo',
    'appearance',
    'homepage',
    'pageConfig',
    'cardStyle',
    'sidebar',
    'search',
    'authConfig',
    'submissionService',
    'paymentConfig',
    'exitModal'
])
const SETTING_PAGE_ROUTE_PATH = '/system-setting/base-config/setting'

/**
 * 当前版本在“站点设置”页内需要精确标记的 tab 集合。
 * 只从统一更新配置中读取，避免在页面里写死重复逻辑。
 */
const settingUpdateTabSet = computed(() => {
    const normalizedPath = normalizeAdminUpdateRoutePath(SETTING_PAGE_ROUTE_PATH)
    return new Set(
        ADMIN_UPDATE_HIGHLIGHTS.filter(
            (item) => normalizeAdminUpdateRoutePath(item.routePath) === normalizedPath
        )
            .map((item) => String(item.routeQuery?.tab || '').trim())
            .filter(Boolean)
    )
})

/**
 * 判断当前设置页 tab 是否属于本版新增能力。
 * @param tabName 标签名
 */
const isUpdatedSettingTab = (tabName: string) => settingUpdateTabSet.value.has(String(tabName || '').trim())

/**
 * 从路由 query 里解析目标标签，兼容旧入口跳转参数。
 */
const resolveSettingTabFromRoute = (): string => {
    const tab = String(route.query.tab || '').trim()
    if (!tab) return ''
    return settingTabNameSet.has(tab) ? tab : ''
}

/**
 * 将路由中的 tab 同步到当前激活标签，保证“旧入口 -> 新站点设置页”定位准确。
 */
const applyRouteTabToActiveTab = () => {
    const targetTab = resolveSettingTabFromRoute()
    if (!targetTab) return
    if (targetTab === activeTab.value) return
    activeTab.value = targetTab
}

/**
 * 将当前激活标签回写到路由 query，便于刷新后维持当前标签页。
 */
const syncActiveTabToRoute = () => {
    const currentTab = String(activeTab.value || '').trim()
    if (!currentTab || !settingTabNameSet.has(currentTab)) return
    if (String(route.query.tab || '') === currentTab) return
    router
        .replace({
            path: route.path,
            query: {
                ...route.query,
                tab: currentTab
            }
        })
        .catch(() => undefined)
}

// ==================== 站点信息 ====================
const siteInfoLoading = ref(false)
const siteInfoData = reactive({
    siteName: '',
    siteTitle: '',
    siteDescription: '',
    siteKeywords: '',
    logo: '',
    navbarLogoDisplayMode: 'icon_text',
    navbarLogoText: '',
    favicon: '',
    icp: '',
    copyright: '',
    contactEmail: '',
    analyticsCode: ''
})

// ==================== 品牌配置 ====================
const brandConfigLoading = ref(false)
const brandRepoIconOptions = [
    { label: 'GitHub', value: 'github' },
    { label: 'Gitee', value: 'gitee' },
    { label: 'CSDN', value: 'csdn' },
    { label: 'UIED', value: 'uied' }
]

/**
 * 创建 404 快捷入口默认项。
 */
const createBrandQuickLinkItem = () => ({
    label: '',
    to: '',
    newWindow: false
})

/**
 * 创建首页 Banner 兜底卡片默认项。
 */
const createBrandBannerCardItem = (index = 0) => ({
    id: '',
    title: '',
    description: '',
    link: '',
    badge: '',
    color: index % 2 === 0 ? '#2563eb' : '#0f766e',
    newWindow: true
})

/**
 * 创建首页轮播兜底内容默认项。
 */
const createBrandCarouselSlideItem = () => ({
    id: '',
    title: '',
    subtitle: '',
    image: '',
    link: '',
    newWindow: true
})

/**
 * 创建更新记录页仓库链接默认项。
 */
const createBrandRepoLinkItem = () => ({
    name: '',
    url: '',
    iconKey: 'github'
})

/**
 * 创建更新记录页平台链接默认项。
 */
const createBrandPlatformLinkItem = () => ({
    name: '',
    url: ''
})
const defaultBrandConfigData = {
    brandName: 'UIED导航系统',
    officialSiteUrl: 'https://fsuied.com',
    buyUrl: 'https://fsuied.com/products/10',
    supportUrl: 'https://fsuied.com',
    supportLabel: '前往官网咨询',
    supportQq: '403479454',
    supportQqGroup: '1082794860',
    installPageTitle: '安装向导',
    installPageDescription: '正式交付流程：先授权校验，再做数据库测试，最后初始化站点与管理员',
    installSiteName: 'UIED导航系统',
    installSiteTitle: 'UIED导航系统 - 高质量资源导航',
    installSiteDescription: '基于 UIED-NAV 构建的可运营网址导航系统。',
    installSiteKeywords: 'UIED,导航系统,网址导航,AI导航',
    installAdminNickname: '系统管理员',
    authLogoText: 'UIED',
    authLoginTitle: '欢迎回来',
    authLoginSubtitle: '登录以体验更多精彩功能',
    authRegisterTitle: '加入 UIED',
    authRegisterSubtitle: '开启您的设计探索之旅',
    notFoundTitle: '页面不存在或已迁移',
    notFoundDescription: '你访问的链接可能已经下线、改名或暂未开放。你可以返回首页，或直接进入常用入口继续浏览。',
    notFoundSeoTitle: '页面未找到',
    notFoundSeoDescription: '访问的页面不存在或已迁移，请返回首页继续浏览 UIED 导航。',
    notFoundSeoKeywords: '404,页面未找到,导航站',
    notFoundAutoRedirectSeconds: 10,
    notFoundQuickLinks: [
        { label: 'AI导航', to: '/ai', newWindow: false },
        { label: 'UI导航', to: '/uiux', newWindow: false },
        { label: '平面导航', to: '/design', newWindow: false },
        { label: 'MCP中心', to: '/mcp', newWindow: false },
        { label: 'Figma频道', to: '/figma', newWindow: false },
        { label: '热门内容', to: '/p/hot', newWindow: false }
    ],
    homeFallbackBannerCards: [] as Array<ReturnType<typeof createBrandBannerCardItem>>,
    homeFallbackCarouselSlides: [] as Array<ReturnType<typeof createBrandCarouselSlideItem>>,
    changelogAuthorName: 'Tomda',
    changelogAuthorUrl: 'https://tomda.top/',
    changelogAuthorDescription: '开发（AI协助）并记录 UIED-NAV 的开发历程和功能更新。公众号：Tomda',
    changelogBuyButtonText: '购买源码授权',
    changelogRepoLinks: [
        {
            name: 'GitHub 仓库',
            url: 'https://github.com/Tomccc520/UIED-NAV',
            iconKey: 'github'
        },
        { name: 'Gitee 仓库', url: 'https://gitee.com/tomdac/uied-nav', iconKey: 'gitee' },
        {
            name: 'CSDN 博客',
            url: 'https://blog.csdn.net/Tomdac?spm=1000.2115.3001.5343',
            iconKey: 'csdn'
        },
        { name: 'UIED技术团队', url: 'https://fsuied.com/', iconKey: 'uied' }
    ],
    changelogPlatformLinks: [
        { name: 'AI学习平台', url: 'https://www.uied.cn/' },
        { name: 'AI免费工具', url: 'https://uiedtool.com' },
        { name: 'AI资讯热榜', url: 'https://hot.uied.cn' },
        { name: 'AI工具导航', url: 'https://hao.uied.cn/ai' },
        {
            name: 'AI交流群',
            url: 'https://ai.feishu.cn/wiki/CUuaw5ooxiHAkckgtRkcn6rnnVQ?from=from_copylink'
        },
        {
            name: 'AI知识库',
            url: 'https://ai.feishu.cn/wiki/ZjddwTFpWivK6ukwBoDc5DoHnVt?from=from_copylink'
        }
    ]
}
const brandConfigData = reactive(cloneDeep(defaultBrandConfigData))

/**
 * 深拷贝对象/数组，避免响应式引用污染默认值。
 */
function cloneDeep<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
}

/**
 * 规范化品牌配置，确保数组结构、布尔开关与默认文案稳定。
 */
const normalizeBrandConfigData = (config: any) => {
    const source = config && typeof config === 'object' ? config : {}
    const normalizeText = (value: unknown, fallback = '') =>
        String(value || '').trim() || fallback
    const normalizeUrl = (value: unknown, fallback = '') =>
        String(value || '').trim() || fallback
    const normalizeQuickLinks = (value: unknown) => {
        if (Array.isArray(value) && value.length === 0) return []
        const rows = Array.isArray(value) ? value : []
        const list = rows
            .map((item: any, index: number) => {
                const fallback =
                    defaultBrandConfigData.notFoundQuickLinks[
                        index % defaultBrandConfigData.notFoundQuickLinks.length
                    ]
                const label = normalizeText(item?.label, fallback?.label || '')
                const to = normalizeUrl(item?.to, fallback?.to || '')
                if (!label || !to) return null
                return {
                    label,
                    to,
                    newWindow: item?.newWindow === true
                }
            })
            .filter(Boolean)
        return list.length > 0 ? list : cloneDeep(defaultBrandConfigData.notFoundQuickLinks)
    }
    const normalizeBannerCards = (value: unknown) => {
        const rows = Array.isArray(value) ? value : []
        return rows
            .map((item: any, index: number) => {
                const title = normalizeText(item?.title)
                const link = normalizeUrl(item?.link)
                if (!title || !link) return null
                return {
                    id: normalizeText(item?.id, `brand-banner-${index + 1}`),
                    title,
                    description: normalizeText(item?.description),
                    link,
                    badge: normalizeText(item?.badge),
                    color: normalizeText(item?.color, index % 2 === 0 ? '#2563eb' : '#0f766e'),
                    newWindow: item?.newWindow !== false
                }
            })
            .filter(Boolean)
    }
    const normalizeCarouselSlides = (value: unknown) => {
        const rows = Array.isArray(value) ? value : []
        return rows
            .map((item: any, index: number) => {
                const title = normalizeText(item?.title)
                const image = normalizeText(item?.image)
                const link = normalizeUrl(item?.link)
                if (!title || !image || !link) return null
                return {
                    id: normalizeText(item?.id, `brand-carousel-${index + 1}`),
                    title,
                    subtitle: normalizeText(item?.subtitle),
                    image,
                    link,
                    newWindow: item?.newWindow !== false
                }
            })
            .filter(Boolean)
    }
    const normalizeRepoLinks = (value: unknown) => {
        if (Array.isArray(value) && value.length === 0) return []
        const allowSet = new Set(['github', 'gitee', 'csdn', 'uied'])
        const rows = Array.isArray(value) ? value : []
        const list = rows
            .map((item: any, index: number) => {
                const fallback =
                    defaultBrandConfigData.changelogRepoLinks[
                        index % defaultBrandConfigData.changelogRepoLinks.length
                    ]
                const name = normalizeText(item?.name, fallback?.name || '')
                const url = normalizeUrl(item?.url, fallback?.url || '')
                if (!name || !url) return null
                const iconKey = normalizeText(item?.iconKey, fallback?.iconKey || 'github')
                return {
                    name,
                    url,
                    iconKey: allowSet.has(iconKey) ? iconKey : 'github'
                }
            })
            .filter(Boolean)
        return list.length > 0 ? list : cloneDeep(defaultBrandConfigData.changelogRepoLinks)
    }
    const normalizePlatformLinks = (value: unknown) => {
        if (Array.isArray(value) && value.length === 0) return []
        const rows = Array.isArray(value) ? value : []
        const list = rows
            .map((item: any, index: number) => {
                const fallback =
                    defaultBrandConfigData.changelogPlatformLinks[
                        index % defaultBrandConfigData.changelogPlatformLinks.length
                    ]
                const name = normalizeText(item?.name, fallback?.name || '')
                const url = normalizeUrl(item?.url, fallback?.url || '')
                if (!name || !url) return null
                return { name, url }
            })
            .filter(Boolean)
        return list.length > 0 ? list : cloneDeep(defaultBrandConfigData.changelogPlatformLinks)
    }
    return {
        ...cloneDeep(defaultBrandConfigData),
        ...source,
        brandName: normalizeText(source?.brandName, defaultBrandConfigData.brandName),
        officialSiteUrl: normalizeUrl(source?.officialSiteUrl, defaultBrandConfigData.officialSiteUrl),
        buyUrl: normalizeUrl(source?.buyUrl, defaultBrandConfigData.buyUrl),
        supportUrl: normalizeUrl(source?.supportUrl, defaultBrandConfigData.supportUrl),
        supportLabel: normalizeText(source?.supportLabel, defaultBrandConfigData.supportLabel),
        supportQq: normalizeText(source?.supportQq),
        supportQqGroup: normalizeText(source?.supportQqGroup),
        installPageTitle: normalizeText(
            source?.installPageTitle,
            defaultBrandConfigData.installPageTitle
        ),
        installPageDescription: normalizeText(
            source?.installPageDescription,
            defaultBrandConfigData.installPageDescription
        ),
        installSiteName: normalizeText(source?.installSiteName, defaultBrandConfigData.installSiteName),
        installSiteTitle: normalizeText(
            source?.installSiteTitle,
            defaultBrandConfigData.installSiteTitle
        ),
        installSiteDescription: normalizeText(
            source?.installSiteDescription,
            defaultBrandConfigData.installSiteDescription
        ),
        installSiteKeywords: normalizeText(
            source?.installSiteKeywords,
            defaultBrandConfigData.installSiteKeywords
        ),
        installAdminNickname: normalizeText(
            source?.installAdminNickname,
            defaultBrandConfigData.installAdminNickname
        ),
        authLogoText: normalizeText(source?.authLogoText, defaultBrandConfigData.authLogoText),
        authLoginTitle: normalizeText(source?.authLoginTitle, defaultBrandConfigData.authLoginTitle),
        authLoginSubtitle: normalizeText(
            source?.authLoginSubtitle,
            defaultBrandConfigData.authLoginSubtitle
        ),
        authRegisterTitle: normalizeText(
            source?.authRegisterTitle,
            defaultBrandConfigData.authRegisterTitle
        ),
        authRegisterSubtitle: normalizeText(
            source?.authRegisterSubtitle,
            defaultBrandConfigData.authRegisterSubtitle
        ),
        notFoundTitle: normalizeText(source?.notFoundTitle, defaultBrandConfigData.notFoundTitle),
        notFoundDescription: normalizeText(
            source?.notFoundDescription,
            defaultBrandConfigData.notFoundDescription
        ),
        notFoundSeoTitle: normalizeText(
            source?.notFoundSeoTitle,
            defaultBrandConfigData.notFoundSeoTitle
        ),
        notFoundSeoDescription: normalizeText(
            source?.notFoundSeoDescription,
            defaultBrandConfigData.notFoundSeoDescription
        ),
        notFoundSeoKeywords: normalizeText(
            source?.notFoundSeoKeywords,
            defaultBrandConfigData.notFoundSeoKeywords
        ),
        notFoundAutoRedirectSeconds: Number.isFinite(Number(source?.notFoundAutoRedirectSeconds))
            ? Math.max(3, Math.min(30, Number(source.notFoundAutoRedirectSeconds)))
            : defaultBrandConfigData.notFoundAutoRedirectSeconds,
        notFoundQuickLinks: normalizeQuickLinks(source?.notFoundQuickLinks),
        homeFallbackBannerCards: normalizeBannerCards(source?.homeFallbackBannerCards),
        homeFallbackCarouselSlides: normalizeCarouselSlides(source?.homeFallbackCarouselSlides),
        changelogAuthorName: normalizeText(
            source?.changelogAuthorName,
            defaultBrandConfigData.changelogAuthorName
        ),
        changelogAuthorUrl: normalizeUrl(
            source?.changelogAuthorUrl,
            defaultBrandConfigData.changelogAuthorUrl
        ),
        changelogAuthorDescription: normalizeText(
            source?.changelogAuthorDescription,
            defaultBrandConfigData.changelogAuthorDescription
        ),
        changelogBuyButtonText: normalizeText(
            source?.changelogBuyButtonText,
            defaultBrandConfigData.changelogBuyButtonText
        ),
        changelogRepoLinks: normalizeRepoLinks(source?.changelogRepoLinks),
        changelogPlatformLinks: normalizePlatformLinks(source?.changelogPlatformLinks)
    }
}

// ==================== 外观配置 ====================
const appearanceLoading = ref(false)
const FONT_PRESET_DEFAULT = 'lexend'
const fontPresetOptions = [
    {
        value: 'lexend',
        label: 'Lexend（默认）',
        fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    {
        value: 'system',
        label: '系统字体',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    {
        value: 'pingfang',
        label: '苹方 / 中文优先',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif'
    },
    {
        value: 'harmony',
        label: 'HarmonyOS Sans',
        fontFamily: '"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    {
        value: 'misans',
        label: 'MiSans',
        fontFamily: '"MiSans", "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    {
        value: 'sourcehan',
        label: '思源黑体',
        fontFamily: '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", sans-serif'
    },
    {
        value: 'alibaba',
        label: '阿里巴巴普惠体',
        fontFamily: '"Alibaba PuHuiTi 3.0", "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    {
        value: 'custom',
        label: '自定义字体栈',
        fontFamily: ''
    }
]
const appearanceData = reactive({
    primaryColor: '#0066ff',
    backgroundColor: '#f6f8fb',
    cardBackgroundColor: '#ffffff',
    textPrimaryColor: '#333333',
    fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    baseFontSize: 16,
    borderRadius: 12,
    contentMaxWidth: 1200,
    customCss: ''
})

/**
 * 解析当前字体值匹配的预设键，便于后台展示当前方案。
 */
const resolveFontPresetByFamily = (fontFamily: unknown): string => {
    const normalized = String(fontFamily || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    if (!normalized) return FONT_PRESET_DEFAULT
    const matched = fontPresetOptions.find(item =>
        item.value !== 'custom'
        && String(item.fontFamily || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase() === normalized
    )
    return matched?.value || 'custom'
}

/**
 * 外观配置字体方案：预设和自定义输入共用一条配置，不新增重复字段。
 */
const appearanceFontPreset = computed({
    get: () => resolveFontPresetByFamily(appearanceData.fontFamily),
    set: (value: string) => {
        handleAppearanceFontPresetChange(value)
    }
})

/**
 * 切换字体预设方案，自动回填推荐字体栈。
 */
const handleAppearanceFontPresetChange = (presetValue: string) => {
    const matched = fontPresetOptions.find(item => item.value === presetValue)
    if (!matched) return
    if (presetValue === 'custom') return
    appearanceData.fontFamily = matched.fontFamily
}

// ==================== 首页配置 ====================
const homepageLoading = ref(false)
const defaultNavSwitchItems = [
    { slug: 'uiux', name: 'UI导航', icon: 'Figma', visible: true, sort: 10 },
    { slug: 'ai', name: 'AI导航', icon: 'AI', visible: true, sort: 20 },
    { slug: 'design', name: '平面导航', icon: 'Design', visible: true, sort: 30 },
    { slug: '3d', name: '三维导航', icon: '3D', visible: true, sort: 40 },
    { slug: 'ecommerce', name: '电商导航', icon: 'Ecommerce', visible: true, sort: 50 },
    { slug: 'interior', name: '室内导航', icon: 'Design', visible: true, sort: 60 },
    { slug: 'font', name: '字体导航', icon: 'Font', visible: true, sort: 70 }
]
const homepageData = reactive({
    homePageSlug: '',
    heroBannerEnabled: true,
    heroBgType: 'default',
    heroBgValue: '',
    heroDisplayMode: 'search',
    heroIconClickMode: 'direct',
    heroShowStats: true,
    heroShowHotTags: true,
    bannerCardsEnabled: true,
    hotRecommendationsEnabled: true,
    hotRecommendationsTitle: '热门推荐',
    topAdEnabled: false,
    topAdCode: '',
    homeCarouselEnabled: true,
    homeCarouselSort: 10,
    homeRecommendationEnabled: true,
    homeRecommendationSort: 20,
    dailyNewEnabled: true,
    dailyNewDisplayLabel: '每日上新',
    dailyNewDisplayPath: '/p/hot?tab=daily-new',
    dailyNewDisplayPlacements: ['nav_quick_entry'],
    dailyNewDisplaySort: 86,
    dailyNewDisplayOpenInNewTab: false,
    dailyNewDefaultDays: 7,
    dailyNewPageKicker: 'Daily Fresh',
    dailyNewPageTitle: '每日上新网址',
    dailyNewPageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
    navSwitchItems: defaultNavSwitchItems.map((item) => ({ ...item }))
})

const pageOptionsLoading = ref(false)
const pageOptions = ref<Array<{ id: number; name: string; slug: string }>>([])

/**
 * 规范化首页页面下拉选项，统一字段类型
 */
const normalizeHomepagePageOptions = (list: unknown): Array<{ id: number; name: string; slug: string }> => {
    if (!Array.isArray(list)) return []
    return list
        .map((item: any) => ({
            id: Number(item?.id || 0),
            name: String(item?.name || '').trim(),
            slug: String(item?.slug || '').trim()
        }))
        .filter((item) => item.id > 0 && item.slug.length > 0)
}

/**
 * 拉取页面管理列表，供“首页页面”下拉动态选择
 */
const loadHomepagePageOptions = async (silent = true) => {
    pageOptionsLoading.value = true
    try {
        const res = await uiedPageAll()
        pageOptions.value = normalizeHomepagePageOptions(res)
        if (!silent) feedback.msgSuccess('页面列表已刷新')
    } catch (error) {
        console.error('加载页面列表失败:', error)
        if (!silent) feedback.msgError('加载页面列表失败')
    } finally {
        pageOptionsLoading.value = false
    }
}

/**
 * 下拉展开时自动刷新页面列表，保证与页面管理新增项同步
 */
const handleHomepagePageDropdownVisible = (visible: boolean) => {
    if (!visible) return
    loadHomepagePageOptions(true)
}

/**
 * 当前首页 slug 可能已被删除，补一个提示选项避免值丢失
 */
const homepageSelectMissingOption = computed(() => {
    const slug = String(homepageData.homePageSlug || '').trim()
    if (!slug) return null
    const exists = pageOptions.value.some((item) => item.slug === slug)
    if (exists) return null
    return {
        slug,
        label: `${slug}（页面已删除，请重新选择）`
    }
})

/**
 * 规范化导航切换配置项，确保显示开关和排序字段完整
 */
const normalizeNavSwitchItems = (items: unknown) => {
    const list = Array.isArray(items) && items.length > 0 ? items : defaultNavSwitchItems
    return list
        .map((item: any, index: number) => ({
            slug: String(
                item?.slug || defaultNavSwitchItems[index % defaultNavSwitchItems.length].slug
            ),
            name: String(
                item?.name || defaultNavSwitchItems[index % defaultNavSwitchItems.length].name
            ),
            icon: String(
                item?.icon || defaultNavSwitchItems[index % defaultNavSwitchItems.length].icon
            ),
            visible: item?.visible !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10
        }))
        .sort((a, b) => a.sort - b.sort)
}

/**
 * 导航切换预览数据（按排序字段实时排序并过滤隐藏项）。
 */
const visibleNavSwitchPreviewItems = computed(() =>
    normalizeNavSwitchItems(homepageData.navSwitchItems).filter((item) => item.visible !== false)
)

/**
 * 导航切换预览中当前触发器显示项（取第一个可见项）。
 */
const currentNavSwitchPreviewItem = computed(
    () => visibleNavSwitchPreviewItems.value[0] || normalizeNavSwitchItems(homepageData.navSwitchItems)[0]
)

/**
 * 处理导航切换拖拽排序，拖拽后按 10 递增重新写入 sort 值。
 */
const handleNavSwitchSortEnd = () => {
    homepageData.navSwitchItems = normalizeNavSwitchItems(homepageData.navSwitchItems).map(
        (item, index) => ({
            ...item,
            sort: (index + 1) * 10
        })
    )
}

/**
 * 规范化首页配置，确保轮播/推荐区和导航切换项可后台控制
 */
const normalizeHomepageConfigData = (config: any) => ({
    ...homepageData,
    ...config,
    homePageSlug: String(config?.homePageSlug || '').trim(),
    heroIconClickMode: String(config?.heroIconClickMode || '').trim() === 'detail' ? 'detail' : 'direct',
    homeCarouselEnabled: config?.homeCarouselEnabled !== false,
    homeRecommendationEnabled: config?.homeRecommendationEnabled !== false,
    homeCarouselSort: Number.isFinite(Number(config?.homeCarouselSort))
        ? Number(config.homeCarouselSort)
        : 10,
    homeRecommendationSort: Number.isFinite(Number(config?.homeRecommendationSort))
        ? Number(config.homeRecommendationSort)
        : 20,
    dailyNewEnabled: config?.dailyNewEnabled !== false,
    dailyNewDisplayLabel:
        String(config?.dailyNewDisplayLabel || '').trim() || '每日上新',
    dailyNewDisplayPath: (() => {
        const text = String(config?.dailyNewDisplayPath || '').trim()
        if (!text) return '/p/hot?tab=daily-new'
        if (text === '/p/daily-new' || text === '/daily-new') return '/p/hot?tab=daily-new'
        if (/^(https?:)?\/\//i.test(text)) return text
        return text.startsWith('/') ? text : `/${text}`
    })(),
    dailyNewDisplayPlacements: (() => {
        const allowSet = new Set(['nav_quick_entry', 'home_menu', 'footer_link'])
        const rows = Array.isArray(config?.dailyNewDisplayPlacements)
            ? config.dailyNewDisplayPlacements
            : []
        const list = rows
            .map((item: any) => String(item || '').trim())
            .filter((item: string) => allowSet.has(item))
        return list.length > 0 ? Array.from(new Set(list)) : ['nav_quick_entry']
    })(),
    dailyNewDisplaySort: Number.isFinite(Number(config?.dailyNewDisplaySort))
        ? Math.max(1, Math.min(9999, Number(config.dailyNewDisplaySort)))
        : 86,
    dailyNewDisplayOpenInNewTab: config?.dailyNewDisplayOpenInNewTab === true,
    dailyNewDefaultDays: Number.isFinite(Number(config?.dailyNewDefaultDays))
        ? Math.max(1, Math.min(30, Number(config.dailyNewDefaultDays)))
        : 1,
    dailyNewPageKicker:
        String(config?.dailyNewPageKicker || '').trim() || 'Daily Fresh',
    dailyNewPageTitle:
        String(config?.dailyNewPageTitle || '').trim() || '每日上新网址',
    dailyNewPageDescription:
        String(config?.dailyNewPageDescription || '').trim() ||
        '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
    navSwitchItems: normalizeNavSwitchItems(config?.navSwitchItems)
})

// ==================== 页面配置 ====================
const pageConfigLoading = ref(false)
interface CategorySvgLibraryItem {
    key: string
    label: string
    svg: string
}

/**
 * 清洗 SVG 字符串，去除脚本与内联事件，避免配置注入风险。
 */
const sanitizeSvgMarkup = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return ''
    const sanitized = text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
        .trim()
    return sanitized.toLowerCase().startsWith('<svg') ? sanitized : ''
}

/**
 * 规范化 SVG 图标库，兼容数组/对象/JSON 字符串格式。
 */
const normalizeCategorySvgLibrary = (value: unknown): CategorySvgLibraryItem[] => {
    let source = value
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source)
        } catch (_error) {
            source = []
        }
    }
    const rows = Array.isArray(source)
        ? source
        : source && typeof source === 'object'
        ? Object.keys(source as Record<string, unknown>).map((key) => ({
              key,
              svg: (source as Record<string, unknown>)[key]
          }))
        : []
    return rows
        .map((item: any, index: number) => {
            const key = String(item?.key || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 40)
            if (!key) return null
            const svg = sanitizeSvgMarkup(item?.svg)
            if (!svg) return null
            const label = String(item?.label || key).trim().slice(0, 40) || key
            const sort = Number.isFinite(Number(item?.sort)) ? Number(item.sort) : index + 1
            return { key, label, svg, sort }
        })
        .filter((item): item is CategorySvgLibraryItem & { sort: number } => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map(({ key, label, svg }) => ({ key, label, svg }))
}

const pageConfigData = reactive({
    websiteClickMode: 'detail',
    showDirectArrow: false,
    detailPageNewWindow: false,
    directArrowNewWindow: true,
    viewMoreNewWindow: false,
    pageSize: 20,
    categoryPaginationThreshold: 120,
    categoryPaginationPageSize: 24,
    hotRecommendationClickMode: 'detail', // 热门推荐独立配置
    appendRefEnabled: false,
    appendRefValue: '',
    sortZeroNewFirstEnabled: false,
    categorySvgLibrary: [] as CategorySvgLibraryItem[]
})

/**
 * 规范化分类区域点击模式
 * 兼容历史值：directExternal -> direct
 */
const normalizeWebsiteClickMode = (mode: unknown): 'detail' | 'direct' => {
    if (mode === 'direct' || mode === 'directExternal') return 'direct'
    return 'detail'
}

/**
 * 规范化热门推荐点击模式
 * 兼容历史值：modal -> detail
 */
const normalizeHotRecommendationClickMode = (mode: unknown): 'detail' | 'direct' => {
    if (mode === 'direct') return 'direct'
    return 'detail'
}

/**
 * 规范化页面配置，确保分类区域与热门推荐点击行为独立且语义一致
 */
const normalizePageConfigData = (config: any) => ({
    ...config,
    websiteClickMode: normalizeWebsiteClickMode(config?.websiteClickMode),
    hotRecommendationClickMode: normalizeHotRecommendationClickMode(
        config?.hotRecommendationClickMode
    ),
    viewMoreNewWindow: config?.viewMoreNewWindow === true,
    pageSize: Number.isFinite(Number(config?.pageSize))
        ? Math.max(10, Math.min(100, Number(config.pageSize)))
        : 20,
    categoryPaginationThreshold: Number.isFinite(Number(config?.categoryPaginationThreshold))
        ? Math.max(24, Math.min(2000, Number(config.categoryPaginationThreshold)))
        : 120,
    categoryPaginationPageSize: Number.isFinite(Number(config?.categoryPaginationPageSize))
        ? Math.max(8, Math.min(120, Number(config.categoryPaginationPageSize)))
        : 24,
    appendRefEnabled: config?.appendRefEnabled === true,
    appendRefValue: String(config?.appendRefValue || '').trim(),
    sortZeroNewFirstEnabled: config?.sortZeroNewFirstEnabled === true,
    categorySvgLibrary: normalizeCategorySvgLibrary(config?.categorySvgLibrary)
})

// ==================== 卡片样式 ====================
const cardStyleLoading = ref(false)
const cardStyleData = reactive({
    defaultLayout: 'grid',
    gridColumns: 4,
    showDescription: true,
    maxDescriptionLines: 2,
    showTags: true,
    showFavicon: true,
    showUrl: false,
    hoverEffect: 'translateUp'
})

// ==================== 侧边栏配置 ====================
const sidebarLoading = ref(false)
const sidebarData = reactive({
    enabled: true,
    position: 'left',
    width: 240,
    showCategories: true,
    showCategoryCount: true,
    expandSubCategories: false,
    sticky: true
})

// ==================== 搜索配置 ====================
const searchLoading = ref(false)
const searchData = reactive({
    enabled: true,
    placeholder: '搜索网站名称...',
    debounceDelay: 300,
    websiteSearchEnabled: true,
    articleSearchEnabled: true,
    aiSearchEnabled: true,
    aiSearchBtnText: 'AI 搜索',
    heroTitle: '全站搜索',
    heroDescriptionTemplate: '收录 {count} 个优质网站资源',
    heroHighlightText: '',
    hotSearchTagsText: 'AI绘画\nChatGPT\nFigma\n免费工具\nUI设计\nMidjourney\n字体\n图标库\nSVG',
    searchDisabledText: '站内搜索功能已关闭',
    aiSearchDisabledText: 'AI 搜索功能已关闭，请在后台配置中开启后再使用。',
    aiResultSummaryTemplate: 'AI 智能推荐找到 {count} 个结果{extra}',
    aiKeywordResultSummaryTemplate: '关键词匹配找到 {count} 个结果',
    aiSemanticResultSummaryTemplate: 'AI 语义扩展已返回 {count} 个结果{extra}',
    aiNoResultText: 'AI 未找到相关结果，请尝试其他描述',
    aiFallbackErrorText: 'AI 搜索暂时不可用，请稍后重试',
    aiCacheSuffixText: '（缓存）',
    highlightKeyword: true,
    resultsPerPage: 20
})

/**
 * 规范化搜索配置，统一 AI 搜索文案模板与分页范围。
 */
const normalizeSearchConfigData = (config: any) => ({
    /**
     * 规范化搜索页热门标签兜底词，兼容数组与多行文本格式。
     */
    hotSearchTags: (() => {
        const sourceList = Array.isArray(config?.hotSearchTags)
            ? config.hotSearchTags
            : Array.isArray(config?.hotSearchTagsText)
            ? config.hotSearchTagsText
            : String(config?.hotSearchTagsText || config?.hotSearchTags || '')
                  .split(/[，,\n|]+/)
                  .map((item: any) => String(item || '').trim())
                  .filter(Boolean)
        const normalized = Array.from(
            new Set(
                sourceList
                    .map((item: any) => String(item || '').trim().slice(0, 20))
                    .filter(Boolean)
            )
        )
        return normalized.length > 0
            ? normalized.slice(0, 20)
            : ['AI绘画', 'ChatGPT', 'Figma', '免费工具', 'UI设计', 'Midjourney', '字体', '图标库', 'SVG']
    })(),
    enabled: config?.enabled !== false,
    placeholder: String(config?.placeholder || '搜索网站名称...').trim() || '搜索网站名称...',
    debounceDelay: Number.isFinite(Number(config?.debounceDelay))
        ? Math.max(100, Math.min(2000, Number(config.debounceDelay)))
        : 300,
    websiteSearchEnabled: config?.websiteSearchEnabled !== false,
    articleSearchEnabled: config?.articleSearchEnabled !== false,
    aiSearchEnabled: config?.aiSearchEnabled !== false,
    aiSearchBtnText: String(config?.aiSearchBtnText || 'AI 搜索').trim() || 'AI 搜索',
    heroTitle: String(config?.heroTitle || '全站搜索').trim() || '全站搜索',
    heroDescriptionTemplate:
        String(config?.heroDescriptionTemplate || '收录 {count} 个优质网站资源').trim()
        || '收录 {count} 个优质网站资源',
    heroHighlightText: String(config?.heroHighlightText || '').trim(),
    hotSearchTagsText: (() => {
        const sourceList = Array.isArray(config?.hotSearchTags)
            ? config.hotSearchTags
            : String(config?.hotSearchTagsText || config?.hotSearchTags || '')
                  .split(/[，,\n|]+/)
                  .map((item: any) => String(item || '').trim())
                  .filter(Boolean)
        const normalized = Array.from(new Set(sourceList.map((item: any) => String(item || '').trim()).filter(Boolean)))
        return normalized.length > 0
            ? normalized.join('\n')
            : 'AI绘画\nChatGPT\nFigma\n免费工具\nUI设计\nMidjourney\n字体\n图标库\nSVG'
    })(),
    searchDisabledText: String(config?.searchDisabledText || '站内搜索功能已关闭').trim()
        || '站内搜索功能已关闭',
    aiSearchDisabledText: String(
        config?.aiSearchDisabledText || 'AI 搜索功能已关闭，请在后台配置中开启后再使用。'
    ).trim() || 'AI 搜索功能已关闭，请在后台配置中开启后再使用。',
    aiResultSummaryTemplate: String(
        config?.aiResultSummaryTemplate || 'AI 智能推荐找到 {count} 个结果{extra}'
    ).trim() || 'AI 智能推荐找到 {count} 个结果{extra}',
    aiKeywordResultSummaryTemplate: String(
        config?.aiKeywordResultSummaryTemplate || '关键词匹配找到 {count} 个结果'
    ).trim() || '关键词匹配找到 {count} 个结果',
    aiSemanticResultSummaryTemplate: String(
        config?.aiSemanticResultSummaryTemplate || 'AI 语义扩展已返回 {count} 个结果{extra}'
    ).trim() || 'AI 语义扩展已返回 {count} 个结果{extra}',
    aiNoResultText: String(config?.aiNoResultText || 'AI 未找到相关结果，请尝试其他描述').trim()
        || 'AI 未找到相关结果，请尝试其他描述',
    aiFallbackErrorText: String(
        config?.aiFallbackErrorText || 'AI 搜索暂时不可用，请稍后重试'
    ).trim() || 'AI 搜索暂时不可用，请稍后重试',
    aiCacheSuffixText: String(config?.aiCacheSuffixText || '（缓存）').trim() || '（缓存）',
    highlightKeyword: config?.highlightKeyword !== false,
    resultsPerPage: Number.isFinite(Number(config?.resultsPerPage))
        ? Math.max(10, Math.min(100, Number(config.resultsPerPage)))
        : 20
})

/**
 * 构建搜索配置保存载荷，剔除仅供后台表单使用的 UI 字段。
 */
const buildSearchConfigPayload = () => {
    const normalized = normalizeSearchConfigData(cloneConfig(searchData))
    const { hotSearchTagsText, ...payload } = normalized
    return payload
}

// ==================== 用户认证 ====================
const authConfigLoading = ref(false)
const WECHAT_OPEN_PLATFORM_CALLBACK_PATH = '/api/auth/wechat/open-platform/callback'
const QQ_OAUTH_CALLBACK_PATH = '/api/auth/qq/callback'
const WECHAT_OFFICIAL_OAUTH_CALLBACK_PATH = '/api/auth/wechat/official-account/login/callback'
const WECHAT_OFFICIAL_EVENT_CALLBACK_PATH = '/api/auth/wechat/official-account/event'
const defaultAuthConfig = {
    enable_register: 1,
    enable_login: 1,
    enable_user_center: 1,
    register_close_message: '注册功能暂时关闭',
    login_close_message: '系统维护中，暂时无法登录',
    user_center_close_message: '个人中心功能暂时关闭',
    userCenterModules: {
        profile: true,
        messages: true,
        orders: false,
        submissions: true,
        collections: true,
        likes: true,
        comments: true,
        loginLogs: true,
        security: true
    },
    wechatWebsiteLogin: {
        enabled: false,
        appId: '',
        appSecret: ''
    },
    qqLogin: {
        enabled: false,
        appId: '',
        appKey: ''
    },
    wechatOfficialAccountLogin: {
        enabled: false,
        appId: '',
        appSecret: '',
        domainVerifyFileName: '',
        domainVerifyFileContent: '',
        scanAutoLoginEnabled: false,
        scanAutoLoginPrompt: '扫码关注公众号后可自动完成登录，请根据页面提示继续操作。',
        callbackToken: '',
        encodingAESKey: ''
    }
}
const authConfigData = reactive(JSON.parse(JSON.stringify(defaultAuthConfig)))

/**
 * 生成后台当前域名下的完整回调地址预览。
 */
const buildAuthConfigPreviewUrl = (path: string) => {
    const normalizedPath = String(path || '').trim()
    if (!normalizedPath) return ''
    if (typeof window === 'undefined') return normalizedPath
    return `${window.location.origin}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
}

const wechatOpenPlatformCallbackPreview = computed(() =>
    buildAuthConfigPreviewUrl(WECHAT_OPEN_PLATFORM_CALLBACK_PATH)
)
const qqOauthCallbackPreview = computed(() =>
    buildAuthConfigPreviewUrl(QQ_OAUTH_CALLBACK_PATH)
)
const wechatOfficialOauthCallbackPreview = computed(() =>
    buildAuthConfigPreviewUrl(WECHAT_OFFICIAL_OAUTH_CALLBACK_PATH)
)
const wechatOfficialEventCallbackPreview = computed(() =>
    buildAuthConfigPreviewUrl(WECHAT_OFFICIAL_EVENT_CALLBACK_PATH)
)
const wechatOfficialVerifyFilePreview = computed(() => {
    const fileName = String(authConfigData.wechatOfficialAccountLogin?.domainVerifyFileName || '').trim()
    if (!fileName) return ''
    if (typeof window === 'undefined') return `/${fileName}`
    return `${window.location.origin}/${fileName.replace(/^\/+/, '')}`
})

/**
 * 规范化认证配置，统一登录/注册/个人中心开关语义。
 */
const normalizeAuthConfigData = (config: any) => {
    /**
     * 规范化微信公众号域名校验文件名，仅允许 MP_verify_*.txt。
     */
    const normalizeWechatVerifyFileName = (value: any) => {
        const text = String(value || '').trim()
        if (!text) return ''
        return /^MP_verify_[A-Za-z0-9_-]+\.txt$/i.test(text) ? text : ''
    }
    /**
     * 规范化微信公众号回调校验 Token。
     */
    const normalizeCallbackToken = (value: any) => String(value || '').trim().slice(0, 120)
    /**
     * 规范化微信公众号 EncodingAESKey，未满足 43 位时置空。
     */
    const normalizeEncodingAESKey = (value: any) => {
        const text = String(value || '').trim()
        return /^[A-Za-z0-9]{43}$/.test(text) ? text : ''
    }
    const websiteLogin = {
        ...defaultAuthConfig.wechatWebsiteLogin,
        ...(config?.wechatWebsiteLogin || {})
    }
    const qqLogin = {
        ...defaultAuthConfig.qqLogin,
        ...(config?.qqLogin || {})
    }
    const officialAccountLogin = {
        ...defaultAuthConfig.wechatOfficialAccountLogin,
        ...(config?.wechatOfficialAccountLogin || {})
    }
    /**
     * 规范化个人中心模块开关，保证字段完整且均为布尔值。
     */
    const normalizeUserCenterModules = (modules: any) => {
        const source = modules && typeof modules === 'object' ? modules : {}
        const defaults = defaultAuthConfig.userCenterModules
        const normalizedModules = {
            profile: source.profile !== false && defaults.profile !== false,
            messages: source.messages !== false && defaults.messages !== false,
            orders: source.orders === true || defaults.orders === true,
            submissions: source.submissions !== false && defaults.submissions !== false,
            collections: source.collections !== false && defaults.collections !== false,
            likes: source.likes !== false && defaults.likes !== false,
            comments: source.comments !== false && defaults.comments !== false,
            loginLogs: source.loginLogs !== false && defaults.loginLogs !== false,
            security: source.security !== false && defaults.security !== false
        }
        if (!Object.values(normalizedModules).some(Boolean)) {
            normalizedModules.profile = true
        }
        return normalizedModules
    }
    return {
        ...defaultAuthConfig,
        ...config,
        enable_register: config?.enable_register === 0 ? 0 : 1,
        enable_login: config?.enable_login === 0 ? 0 : 1,
        enable_user_center: config?.enable_user_center === 0 ? 0 : 1,
        userCenterModules: normalizeUserCenterModules(config?.userCenterModules),
        register_close_message:
            String(config?.register_close_message || '').trim() ||
            defaultAuthConfig.register_close_message,
        login_close_message:
            String(config?.login_close_message || '').trim() ||
            defaultAuthConfig.login_close_message,
        user_center_close_message:
            String(config?.user_center_close_message || '').trim() ||
            defaultAuthConfig.user_center_close_message,
        wechatWebsiteLogin: {
            enabled: websiteLogin?.enabled === true,
            appId: String(websiteLogin?.appId || '').trim().slice(0, 120),
            appSecret: String(websiteLogin?.appSecret || '').trim().slice(0, 255)
        },
        qqLogin: {
            enabled: qqLogin?.enabled === true,
            appId: String(qqLogin?.appId || '').trim().slice(0, 120),
            appKey: String(qqLogin?.appKey || '').trim().slice(0, 255)
        },
        wechatOfficialAccountLogin: {
            enabled: officialAccountLogin?.enabled === true,
            appId: String(officialAccountLogin?.appId || '').trim().slice(0, 120),
            appSecret: String(officialAccountLogin?.appSecret || '').trim().slice(0, 255),
            domainVerifyFileName: normalizeWechatVerifyFileName(
                officialAccountLogin?.domainVerifyFileName
            ),
            domainVerifyFileContent: String(
                officialAccountLogin?.domainVerifyFileContent || ''
            )
                .trim()
                .slice(0, 5000),
            scanAutoLoginEnabled: officialAccountLogin?.scanAutoLoginEnabled === true,
            scanAutoLoginPrompt:
                String(officialAccountLogin?.scanAutoLoginPrompt || '').trim() ||
                defaultAuthConfig.wechatOfficialAccountLogin.scanAutoLoginPrompt,
            callbackToken: normalizeCallbackToken(officialAccountLogin?.callbackToken),
            encodingAESKey: normalizeEncodingAESKey(officialAccountLogin?.encodingAESKey)
        }
    }
}

// ==================== 投稿与支付 ====================
const submissionServiceLoading = ref(false)
const defaultSubmissionServiceData = {
    enabled: true,
    pageEyebrow: 'Website Submission',
    pageTitle: '网站收录',
    pageSubtitle: '免费收录与商业增值服务分离：基础提交走网站收录，置顶推荐与 Banner 曝光在服务页加购。',
    pageDescription: '提交后进入审核与收录流程，商业服务页用于新品上线、首页曝光与短期活动冲刺，可按需购买置顶推荐和 Banner 运营位。',
    heroHighlightsText: '人工审核收录\n支持置顶推荐与 Banner 加购\n个人中心可追踪进度',
    containerMaxWidth: 1280,
    pricingTitle: '收录与增值服务',
    processTitle: '服务流程',
    processDescription: '从提交资料、创建订单到人工审核上线，整条链路都可以按后台配置推进。',
    processStepsText: '填写站点资料|提交网址、分类、简介与基础联系方式。\n选择服务方案|免费收录走 /submit；商业服务页用于选择置顶推荐或 Banner 位。\n支付与审核|勾选收费加购后系统会创建订单；完成支付后进入人工审核与排期。\n收录上线|审核通过后正式上线展示，并可在个人中心查看记录。',
    submitNoticeTitle: '提交须知',
    submitNoticeText: '请确保提交的网站内容合法合规，且能稳定访问。\n免费基础收录请使用 /submit；本页主要用于置顶推荐、Banner 位等增值服务下单。\n置顶推荐和 Banner 位属于附加曝光，不替代收录审核标准。\n如果涉及排期或活动推广，请填写有效联系方式便于沟通。',
    faqTitle: '常见问题',
    closedTitle: '提交服务暂未开放',
    closedDescription: '当前站点已暂停新的提交与收录申请，请稍后再试或联系运营团队。',
    closedButtonText: '返回首页',
    closedButtonUrl: '/',
    submitEnabled: true,
    submitMode: 'free',
    submitLabel: '免费提交收录',
    submitBadge: '基础服务',
    submitDescription: '提交后进入人工审核、信息完善与正式收录流程，是所有投稿的基础服务。',
    submitPrice: 39,
    submitOriginalPrice: 59,
    submitCtaText: '免费提交',
    submitFeaturesText: '站点进入人工审核与分类收录流程\n支持 AI 补全站点信息与基础内容优化\n审核通过后进入站内搜索与列表展示',
    topEnabled: true,
    topLabel: '置顶推荐加购',
    topBadge: '曝光增强',
    topDescription: '适合希望在分类页或推荐区获得更高排序与额外曝光的产品。',
    topPrice: 99,
    topOriginalPrice: 129,
    topCtaText: '勾选加购',
    topFeaturesText: '优先进入推荐位与更高排序\n适合新品冷启动与短期活动推广\n可与 Banner 位叠加购买',
    bannerEnabled: true,
    bannerLabel: 'Banner 运营位加购',
    bannerBadge: '高曝光',
    bannerDescription: '适合重点推广活动，可额外购买 Banner 位置用于首页或频道页运营展示。',
    bannerPrice: 199,
    bannerOriginalPrice: 299,
    bannerCtaText: '勾选加购',
    bannerFeaturesText: '支持首页或频道 Banner 位展示\n适合重点活动、新品发布与商业推广\n由运营同学排期后投放',
    faqText: '提交后多久审核？|通常 1-3 个工作日完成审核。\n置顶推荐和 Banner 位何时生效？|支付成功后由运营排期，审核通过后按配置执行。\n支持哪些支付方式？|支持支付宝和微信支付。',
}
const submissionServiceData = reactive({ ...defaultSubmissionServiceData })

const paymentConfigLoading = ref(false)
const defaultPaymentConfigData = {
    enabled: false,
    allowAlipay: true,
    allowWechat: true,
    orderExpireMinutes: 30,
    notifyBaseUrl: '',
    alipayEnabled: false,
    alipayGateway: 'https://openapi.alipay.com/gateway.do',
    alipayAppId: '',
    alipaySellerId: '',
    alipayPrivateKey: '',
    alipayPublicKey: '',
    alipayReturnUrl: '',
    alipayNotifyUrl: '',
    wechatEnabled: false,
    wechatAppId: '',
    wechatMchId: '',
    wechatApiKey: '',
    wechatNotifyUrl: '',
    wechatSceneName: 'UIED支付中心',
    wechatMockModeEnabled: false,
    wechatMockReturnPath: '/submit',
}
const paymentConfigData = reactive({ ...defaultPaymentConfigData })

/**
 * 多行文本拆分为字符串数组
 */
const parseLines = (value: unknown): string[] =>
    String(value || '')
        .split('\n')
        .map((item) => String(item || '').trim())
        .filter(Boolean)

/**
 * 投稿流程文本解析为结构化数据，格式：标题|描述
 */
const parseSubmissionProcessText = (
    value: unknown
): Array<{ title: string; description: string; sort: number; enabled: boolean }> =>
    String(value || '')
        .split('\n')
        .map((line, index) => {
            const [title = '', description = ''] = String(line || '').split('|')
            const safeTitle = String(title || '').trim()
            const safeDescription = String(description || '').trim()
            if (!safeTitle || !safeDescription) return null
            return {
                title: safeTitle,
                description: safeDescription,
                sort: (index + 1) * 10,
                enabled: true,
            }
        })
        .filter(
            (
                item
            ): item is {
                title: string
                description: string
                sort: number
                enabled: boolean
            } => Boolean(item)
        )

/**
 * FAQ 文本解析为结构化数据，格式：问题|答案
 */
const parseFaqText = (value: unknown): Array<{ question: string; answer: string; sort: number; enabled: boolean }> =>
    String(value || '')
        .split('\n')
        .map((line, index) => {
            const [question = '', answer = ''] = String(line || '').split('|')
            const q = String(question || '').trim()
            const a = String(answer || '').trim()
            if (!q || !a) return null
            return {
                question: q,
                answer: a,
                sort: (index + 1) * 10,
                enabled: true,
            }
        })
        .filter((item): item is { question: string; answer: string; sort: number; enabled: boolean } => Boolean(item))

/**
 * 将 FAQ 结构化数据格式化为可编辑文本
 */
const formatFaqText = (items: any[]): string => {
    if (!Array.isArray(items)) return ''
    return items
        .map((item) => {
            const q = String(item?.question || '').trim()
            const a = String(item?.answer || '').trim()
            if (!q || !a) return ''
            return `${q}|${a}`
        })
        .filter(Boolean)
        .join('\n')
}

/**
 * 将投稿流程结构化数据格式化为可编辑文本
 */
const formatSubmissionProcessText = (items: any[]): string => {
    if (!Array.isArray(items)) return ''
    return items
        .map((item) => {
            const title = String(item?.title || '').trim()
            const description = String(item?.description || '').trim()
            if (!title || !description) return ''
            return `${title}|${description}`
        })
        .filter(Boolean)
        .join('\n')
}

/**
 * 规范化投稿与支付配置（后台表单视图）
 */
const normalizeSubmissionServiceData = (config: any) => {
    const source = config && typeof config === 'object' ? config : {}
    const submitService = source?.submitService || source?.aiGrowthService || {}
    const topAddon = source?.topRecommendAddon || source?.paidBoostService || {}
    const bannerAddon = source?.bannerAddon || {}
    const submitFeaturesText = Array.isArray(submitService.features)
        ? submitService.features.map((item: any) => String(item || '').trim()).filter(Boolean).join('\n')
        : defaultSubmissionServiceData.submitFeaturesText
    const topFeaturesText = Array.isArray(topAddon.features)
        ? topAddon.features.map((item: any) => String(item || '').trim()).filter(Boolean).join('\n')
        : defaultSubmissionServiceData.topFeaturesText
    const bannerFeaturesText = Array.isArray(bannerAddon.features)
        ? bannerAddon.features.map((item: any) => String(item || '').trim()).filter(Boolean).join('\n')
        : defaultSubmissionServiceData.bannerFeaturesText
    return {
        ...defaultSubmissionServiceData,
        ...source,
        pageEyebrow: String(source?.pageEyebrow || defaultSubmissionServiceData.pageEyebrow),
        pageTitle: String(source?.pageTitle || defaultSubmissionServiceData.pageTitle),
        pageSubtitle: String(source?.pageSubtitle || defaultSubmissionServiceData.pageSubtitle),
        pageDescription: String(source?.pageDescription || defaultSubmissionServiceData.pageDescription),
        heroHighlightsText: Array.isArray(source?.heroHighlights)
            ? source.heroHighlights.map((item: any) => String(item || '').trim()).filter(Boolean).join('\n')
            : defaultSubmissionServiceData.heroHighlightsText,
        containerMaxWidth: Number.isFinite(Number(source?.containerMaxWidth))
            ? Number(source.containerMaxWidth)
            : defaultSubmissionServiceData.containerMaxWidth,
        pricingTitle: String(source?.pricingTitle || defaultSubmissionServiceData.pricingTitle),
        processTitle: String(source?.processTitle || defaultSubmissionServiceData.processTitle),
        processDescription: String(
            source?.processDescription || defaultSubmissionServiceData.processDescription
        ),
        processStepsText: Array.isArray(source?.processSteps)
            ? formatSubmissionProcessText(source.processSteps)
            : defaultSubmissionServiceData.processStepsText,
        submitNoticeTitle: String(
            source?.submitNoticeTitle || defaultSubmissionServiceData.submitNoticeTitle
        ),
        submitNoticeText: Array.isArray(source?.submitNotices)
            ? source.submitNotices.map((item: any) => String(item || '').trim()).filter(Boolean).join('\n')
            : defaultSubmissionServiceData.submitNoticeText,
        faqTitle: String(source?.faqTitle || defaultSubmissionServiceData.faqTitle),
        closedTitle: String(source?.closedTitle || defaultSubmissionServiceData.closedTitle),
        closedDescription: String(
            source?.closedDescription || defaultSubmissionServiceData.closedDescription
        ),
        closedButtonText: String(
            source?.closedButtonText || defaultSubmissionServiceData.closedButtonText
        ),
        closedButtonUrl: String(
            source?.closedButtonUrl || defaultSubmissionServiceData.closedButtonUrl
        ),
        submitEnabled: submitService?.enabled !== false,
        submitMode: String(submitService?.mode || defaultSubmissionServiceData.submitMode) === 'free'
            ? 'free'
            : 'paid',
        submitLabel: String(submitService?.label || defaultSubmissionServiceData.submitLabel),
        submitBadge: String(submitService?.badge || defaultSubmissionServiceData.submitBadge),
        submitDescription: String(submitService?.description || defaultSubmissionServiceData.submitDescription),
        submitPrice: Number.isFinite(Number(submitService?.price)) ? Number(submitService.price) : defaultSubmissionServiceData.submitPrice,
        submitOriginalPrice: Number.isFinite(Number(submitService?.originalPrice))
            ? Number(submitService.originalPrice)
            : defaultSubmissionServiceData.submitOriginalPrice,
        submitCtaText: String(submitService?.ctaText || defaultSubmissionServiceData.submitCtaText),
        submitFeaturesText: submitFeaturesText || defaultSubmissionServiceData.submitFeaturesText,
        topEnabled: topAddon?.enabled !== false,
        topLabel: String(topAddon?.label || defaultSubmissionServiceData.topLabel),
        topBadge: String(topAddon?.badge || defaultSubmissionServiceData.topBadge),
        topDescription: String(topAddon?.description || defaultSubmissionServiceData.topDescription),
        topPrice: Number.isFinite(Number(topAddon?.price))
            ? Number(topAddon.price)
            : defaultSubmissionServiceData.topPrice,
        topOriginalPrice: Number.isFinite(Number(topAddon?.originalPrice))
            ? Number(topAddon.originalPrice)
            : defaultSubmissionServiceData.topOriginalPrice,
        topCtaText: String(topAddon?.ctaText || defaultSubmissionServiceData.topCtaText),
        topFeaturesText: topFeaturesText || defaultSubmissionServiceData.topFeaturesText,
        bannerEnabled: bannerAddon?.enabled !== false,
        bannerLabel: String(bannerAddon?.label || defaultSubmissionServiceData.bannerLabel),
        bannerBadge: String(bannerAddon?.badge || defaultSubmissionServiceData.bannerBadge),
        bannerDescription: String(bannerAddon?.description || defaultSubmissionServiceData.bannerDescription),
        bannerPrice: Number.isFinite(Number(bannerAddon?.price))
            ? Number(bannerAddon.price)
            : defaultSubmissionServiceData.bannerPrice,
        bannerOriginalPrice: Number.isFinite(Number(bannerAddon?.originalPrice))
            ? Number(bannerAddon.originalPrice)
            : defaultSubmissionServiceData.bannerOriginalPrice,
        bannerCtaText: String(bannerAddon?.ctaText || defaultSubmissionServiceData.bannerCtaText),
        bannerFeaturesText: bannerFeaturesText || defaultSubmissionServiceData.bannerFeaturesText,
        faqText: Array.isArray(source?.faqItems)
            ? formatFaqText(source.faqItems)
            : defaultSubmissionServiceData.faqText,
    }
}

/**
 * 将后台表单数据转换为后端持久化结构
 */
const buildSubmissionServicePayload = () => ({
    enabled: submissionServiceData.enabled !== false,
    pageEyebrow: String(submissionServiceData.pageEyebrow || '').trim(),
    pageTitle: String(submissionServiceData.pageTitle || '').trim(),
    pageSubtitle: String(submissionServiceData.pageSubtitle || '').trim(),
    pageDescription: String(submissionServiceData.pageDescription || '').trim(),
    heroHighlights: parseLines(submissionServiceData.heroHighlightsText),
    containerMaxWidth: Number(submissionServiceData.containerMaxWidth || 1200),
    pricingTitle: String(submissionServiceData.pricingTitle || '').trim(),
    processTitle: String(submissionServiceData.processTitle || '').trim(),
    processDescription: String(submissionServiceData.processDescription || '').trim(),
    processSteps: parseSubmissionProcessText(submissionServiceData.processStepsText),
    submitNoticeTitle: String(submissionServiceData.submitNoticeTitle || '').trim(),
    submitNotices: parseLines(submissionServiceData.submitNoticeText),
    faqTitle: String(submissionServiceData.faqTitle || '').trim(),
    closedTitle: String(submissionServiceData.closedTitle || '').trim(),
    closedDescription: String(submissionServiceData.closedDescription || '').trim(),
    closedButtonText: String(submissionServiceData.closedButtonText || '').trim(),
    closedButtonUrl: String(submissionServiceData.closedButtonUrl || '').trim(),
    submitService: {
        enabled: submissionServiceData.submitEnabled !== false,
        key: 'submission',
        mode: String(submissionServiceData.submitMode || '').trim() === 'free' ? 'free' : 'paid',
        label: String(submissionServiceData.submitLabel || '').trim(),
        badge: String(submissionServiceData.submitBadge || '').trim(),
        description: String(submissionServiceData.submitDescription || '').trim(),
        price: Number(submissionServiceData.submitPrice || 0),
        originalPrice: Number(submissionServiceData.submitOriginalPrice || 0),
        ctaText: String(submissionServiceData.submitCtaText || '').trim(),
        features: parseLines(submissionServiceData.submitFeaturesText),
    },
    topRecommendAddon: {
        enabled: submissionServiceData.topEnabled !== false,
        key: 'top_recommendation',
        label: String(submissionServiceData.topLabel || '').trim(),
        badge: String(submissionServiceData.topBadge || '').trim(),
        description: String(submissionServiceData.topDescription || '').trim(),
        price: Number(submissionServiceData.topPrice || 0),
        originalPrice: Number(submissionServiceData.topOriginalPrice || 0),
        ctaText: String(submissionServiceData.topCtaText || '').trim(),
        features: parseLines(submissionServiceData.topFeaturesText),
    },
    bannerAddon: {
        enabled: submissionServiceData.bannerEnabled !== false,
        key: 'banner_slot',
        label: String(submissionServiceData.bannerLabel || '').trim(),
        badge: String(submissionServiceData.bannerBadge || '').trim(),
        description: String(submissionServiceData.bannerDescription || '').trim(),
        price: Number(submissionServiceData.bannerPrice || 0),
        originalPrice: Number(submissionServiceData.bannerOriginalPrice || 0),
        ctaText: String(submissionServiceData.bannerCtaText || '').trim(),
        features: parseLines(submissionServiceData.bannerFeaturesText),
    },
    faqItems: parseFaqText(submissionServiceData.faqText),
})

/**
 * 规范化全站支付配置（后台表单视图）
 */
const normalizePaymentConfigData = (config: any) => {
    const source = config && typeof config === 'object' ? config : {}
    const alipay = source?.alipay || {}
    const wechat = source?.wechat || {}
    return {
        ...defaultPaymentConfigData,
        ...source,
        enabled: source?.enabled === true,
        allowAlipay: source?.allowAlipay !== false,
        allowWechat: source?.allowWechat !== false,
        orderExpireMinutes: Number.isFinite(Number(source?.orderExpireMinutes))
            ? Number(source.orderExpireMinutes)
            : defaultPaymentConfigData.orderExpireMinutes,
        notifyBaseUrl: String(source?.notifyBaseUrl || ''),
        alipayEnabled: alipay?.enabled === true,
        alipayGateway: String(alipay?.gateway || defaultPaymentConfigData.alipayGateway),
        alipayAppId: String(alipay?.appId || ''),
        alipaySellerId: String(alipay?.sellerId || ''),
        alipayPrivateKey: String(alipay?.privateKey || ''),
        alipayPublicKey: String(alipay?.alipayPublicKey || ''),
        alipayReturnUrl: String(alipay?.returnUrl || ''),
        alipayNotifyUrl: String(alipay?.notifyUrl || ''),
        wechatEnabled: wechat?.enabled === true,
        wechatAppId: String(wechat?.appId || ''),
        wechatMchId: String(wechat?.mchId || ''),
        wechatApiKey: String(wechat?.apiKey || ''),
        wechatNotifyUrl: String(wechat?.notifyUrl || ''),
        wechatSceneName: String(wechat?.sceneName || defaultPaymentConfigData.wechatSceneName),
        wechatMockModeEnabled: wechat?.mockModeEnabled === true,
        wechatMockReturnPath: String(
            wechat?.mockReturnPath || defaultPaymentConfigData.wechatMockReturnPath
        ),
    }
}

/**
 * 将支付中心表单数据转换为后端持久化结构
 */
const buildPaymentConfigPayload = () => ({
    enabled: paymentConfigData.enabled === true,
    allowAlipay: paymentConfigData.allowAlipay !== false,
    allowWechat: paymentConfigData.allowWechat !== false,
    orderExpireMinutes: Number(paymentConfigData.orderExpireMinutes || 30),
    notifyBaseUrl: String(paymentConfigData.notifyBaseUrl || '').trim(),
    alipay: {
        enabled: paymentConfigData.alipayEnabled === true,
        gateway: String(paymentConfigData.alipayGateway || '').trim(),
        appId: String(paymentConfigData.alipayAppId || '').trim(),
        sellerId: String(paymentConfigData.alipaySellerId || '').trim(),
        privateKey: String(paymentConfigData.alipayPrivateKey || '').trim(),
        alipayPublicKey: String(paymentConfigData.alipayPublicKey || '').trim(),
        returnUrl: String(paymentConfigData.alipayReturnUrl || '').trim(),
        notifyUrl: String(paymentConfigData.alipayNotifyUrl || '').trim(),
    },
    wechat: {
        enabled: paymentConfigData.wechatEnabled === true,
        appId: String(paymentConfigData.wechatAppId || '').trim(),
        mchId: String(paymentConfigData.wechatMchId || '').trim(),
        apiKey: String(paymentConfigData.wechatApiKey || '').trim(),
        notifyUrl: String(paymentConfigData.wechatNotifyUrl || '').trim(),
        tradeType: 'MWEB',
        sceneName: String(paymentConfigData.wechatSceneName || '').trim(),
        mockModeEnabled: paymentConfigData.wechatMockModeEnabled === true,
        mockReturnPath: String(paymentConfigData.wechatMockReturnPath || '').trim(),
    },
})

// ==================== 跳转提醒 ====================
const exitModalLoading = ref(false)
const defaultExitModalConfig = {
    enabled: true,
    title: '即将离开本站',
    description: '您即将访问外部网站，请注意安全',
    autoRedirect: true,
    countdown: 5,
    logo: '',
    showAgreementLinks: false,
    userAgreementText: '用户协议',
    userAgreementUrl: '',
    copyrightAgreementText: '版权协议',
    copyrightAgreementUrl: ''
}
const exitModalData = reactive({ ...defaultExitModalConfig })

/**
 * 规范化跳转弹窗配置，确保协议与品牌字段完整
 */
const normalizeExitModalConfigData = (config: any) => ({
    ...defaultExitModalConfig,
    ...config,
    enabled: config?.enabled !== false,
    autoRedirect: config?.autoRedirect !== false,
    countdown: Number.isFinite(Number(config?.countdown))
        ? Math.max(1, Math.min(30, Number(config.countdown)))
        : 5,
    logo: String(config?.logo || ''),
    showAgreementLinks: config?.showAgreementLinks === true,
    userAgreementText: String(config?.userAgreementText || '用户协议'),
    userAgreementUrl: String(config?.userAgreementUrl || ''),
    copyrightAgreementText: String(config?.copyrightAgreementText || '版权协议'),
    copyrightAgreementUrl: String(config?.copyrightAgreementUrl || '')
})

// ==================== 快照与比对 ====================
const snapshotData = reactive({
    siteInfo: '',
    brandConfig: '',
    appearance: '',
    homepage: '',
    pageConfig: '',
    cardStyle: '',
    sidebar: '',
    search: '',
    authConfig: '',
    submissionService: '',
    paymentConfig: '',
    exitModal: ''
})

/**
 * 深拷贝配置对象，避免响应式引用污染快照
 */
const cloneConfig = <T>(data: T): T => JSON.parse(JSON.stringify(data))

/**
 * 序列化配置对象，用于判断是否有改动
 */
const serializeConfig = (data: unknown): string => JSON.stringify(data ?? {})

/**
 * 获取当前页面配置的标准化序列化值
 */
const getSerializedPageConfig = (): string => {
    const normalized = normalizePageConfigData(cloneConfig(pageConfigData))
    return serializeConfig(normalized)
}

/**
 * 刷新本地快照
 */
const refreshSnapshot = () => {
    snapshotData.siteInfo = serializeConfig(cloneConfig(siteInfoData))
    snapshotData.brandConfig = serializeConfig(normalizeBrandConfigData(cloneConfig(brandConfigData)))
    snapshotData.appearance = serializeConfig(cloneConfig(appearanceData))
    snapshotData.homepage = serializeConfig(cloneConfig(homepageData))
    snapshotData.pageConfig = getSerializedPageConfig()
    snapshotData.cardStyle = serializeConfig(cloneConfig(cardStyleData))
    snapshotData.sidebar = serializeConfig(cloneConfig(sidebarData))
    snapshotData.search = serializeConfig(cloneConfig(searchData))
    snapshotData.authConfig = serializeConfig(normalizeAuthConfigData(cloneConfig(authConfigData)))
    snapshotData.submissionService = serializeConfig(buildSubmissionServicePayload())
    snapshotData.paymentConfig = serializeConfig(buildPaymentConfigPayload())
    snapshotData.exitModal = serializeConfig(cloneConfig(exitModalData))
}

/**
 * 读取指定快照对象
 */
const readSnapshotObject = (value: string): Record<string, any> => {
    try {
        return value ? JSON.parse(value) : {}
    } catch (error) {
        console.warn('解析配置快照失败:', error)
        return {}
    }
}

/**
 * 判断指定标签是否有改动
 */
const hasTabChanges = (tab: string): boolean => {
    if (tab === 'siteInfo')
        return serializeConfig(cloneConfig(siteInfoData)) !== snapshotData.siteInfo
    if (tab === 'brandConfig')
        return (
            serializeConfig(normalizeBrandConfigData(cloneConfig(brandConfigData))) !==
            snapshotData.brandConfig
        )
    if (tab === 'appearance')
        return serializeConfig(cloneConfig(appearanceData)) !== snapshotData.appearance
    if (tab === 'homepage')
        return serializeConfig(cloneConfig(homepageData)) !== snapshotData.homepage
    if (tab === 'pageConfig') return getSerializedPageConfig() !== snapshotData.pageConfig
    if (tab === 'cardStyle')
        return serializeConfig(cloneConfig(cardStyleData)) !== snapshotData.cardStyle
    if (tab === 'sidebar') return serializeConfig(cloneConfig(sidebarData)) !== snapshotData.sidebar
    if (tab === 'search') return serializeConfig(cloneConfig(searchData)) !== snapshotData.search
    if (tab === 'authConfig')
        return (
            serializeConfig(normalizeAuthConfigData(cloneConfig(authConfigData))) !==
            snapshotData.authConfig
        )
    if (tab === 'submissionService')
        return serializeConfig(buildSubmissionServicePayload()) !== snapshotData.submissionService
    if (tab === 'paymentConfig')
        return serializeConfig(buildPaymentConfigPayload()) !== snapshotData.paymentConfig
    if (tab === 'exitModal')
        return serializeConfig(cloneConfig(exitModalData)) !== snapshotData.exitModal
    return false
}

const hasPendingChanges = computed(
    () =>
        hasTabChanges('siteInfo') ||
        hasTabChanges('brandConfig') ||
        hasTabChanges('appearance') ||
        hasTabChanges('homepage') ||
        hasTabChanges('pageConfig') ||
        hasTabChanges('cardStyle') ||
        hasTabChanges('sidebar') ||
        hasTabChanges('search') ||
        hasTabChanges('authConfig') ||
        hasTabChanges('submissionService') ||
        hasTabChanges('paymentConfig') ||
        hasTabChanges('exitModal')
)

const hasCurrentTabChanges = computed(() => hasTabChanges(activeTab.value))

const lastSavedAtText = computed(() => {
    if (!lastSavedAt.value) return '未保存'
    return new Date(lastSavedAt.value).toLocaleString()
})

/**
 * 标记已保存并更新快照
 */
const markSaved = () => {
    lastSavedAt.value = Date.now()
    refreshSnapshot()
}

// ==================== 加载函数 ====================
/**
 * 应用公开设置到本地表单
 */
const applyPublicSettings = (settings: Record<string, any>) => {
    if (settings.siteInfo) Object.assign(siteInfoData, settings.siteInfo)
    if (settings.brand) Object.assign(brandConfigData, normalizeBrandConfigData(settings.brand))
    if (settings.appearance) Object.assign(appearanceData, settings.appearance)
    if (settings.homepage)
        Object.assign(homepageData, normalizeHomepageConfigData(settings.homepage))
    if (settings.pageGlobal)
        Object.assign(pageConfigData, normalizePageConfigData(settings.pageGlobal))
    if (settings.cardStyle) Object.assign(cardStyleData, settings.cardStyle)
    if (settings.sidebar) Object.assign(sidebarData, settings.sidebar)
    if (settings.search) Object.assign(searchData, settings.search)
    if (settings.authConfig)
        Object.assign(authConfigData, normalizeAuthConfigData(settings.authConfig))
    if (settings.submissionService)
        Object.assign(
            submissionServiceData,
            normalizeSubmissionServiceData(settings.submissionService)
        )
    if (settings.payment)
        Object.assign(paymentConfigData, normalizePaymentConfigData(settings.payment))
    if (settings.exitModal || settings.popup)
        Object.assign(exitModalData, normalizeExitModalConfigData(settings.exitModal || settings.popup))
}

/**
 * 一次性加载全部站点配置
 */
const loadAllSettings = async (silent = false) => {
    reloadLoading.value = true
    try {
        const [settings] = await Promise.all([uiedPublicSettings(), loadHomepagePageOptions(true)])
        if (settings) applyPublicSettings(settings)
        await Promise.all([loadSubmissionService(), loadPaymentConfig()])
        refreshSnapshot()
        if (!silent) feedback.msgSuccess('配置已刷新')
    } catch (error) {
        console.error('加载公开设置失败，回退分项加载:', error)
        await Promise.all([
            loadSiteInfo(),
            loadBrandConfig(),
            loadAppearance(),
            loadHomepage(),
            loadPageConfig(),
            loadCardStyle(),
            loadSidebar(),
            loadSearch(),
            loadAuthConfig(),
            loadSubmissionService(),
            loadPaymentConfig(),
            loadExitModal(),
            loadHomepagePageOptions(true)
        ])
        refreshSnapshot()
        if (!silent) feedback.msgWarning('公开配置加载失败，已使用分项加载')
    } finally {
        reloadLoading.value = false
    }
}

const loadSiteInfo = async () => {
    try {
        const res = await uiedSiteInfo()
        if (res) Object.assign(siteInfoData, res)
    } catch (e) {
        console.error('加载站点信息失败', e)
    }
}
const loadAppearance = async () => {
    try {
        const res = await uiedSettingGet({ key: 'appearanceConfig' })
        if (res) Object.assign(appearanceData, res)
    } catch (e) {
        console.error('加载外观配置失败', e)
    }
}

/**
 * 加载品牌配置（安装页/404/更新记录等统一品牌默认值）。
 */
const loadBrandConfig = async () => {
    try {
        const res = await uiedSettingGet({ key: 'brandConfig' })
        if (res) Object.assign(brandConfigData, normalizeBrandConfigData(res))
    } catch (e) {
        console.error('加载品牌配置失败', e)
    }
}
const loadHomepage = async () => {
    try {
        const res = await uiedSettingGet({ key: 'homepageConfig' })
        if (res) Object.assign(homepageData, normalizeHomepageConfigData(res))
    } catch (e) {
        console.error('加载首页配置失败', e)
    }
}
const loadPageConfig = async () => {
    try {
        const res = await uiedSettingGet({ key: 'pageGlobalConfig' })
        if (res) Object.assign(pageConfigData, normalizePageConfigData(res))
    } catch (e) {
        console.error('加载页面配置失败', e)
    }
}
const loadCardStyle = async () => {
    try {
        const res = await uiedSettingGet({ key: 'cardStyleConfig' })
        if (res) Object.assign(cardStyleData, res)
    } catch (e) {
        console.error('加载卡片样式失败', e)
    }
}
const loadSidebar = async () => {
    try {
        const res = await uiedSettingGet({ key: 'sidebarConfig' })
        if (res) Object.assign(sidebarData, res)
    } catch (e) {
        console.error('加载侧边栏配置失败', e)
    }
}
const loadSearch = async () => {
    try {
        const res = await uiedSettingGet({ key: 'searchConfig' })
        if (res) Object.assign(searchData, normalizeSearchConfigData(res))
    } catch (e) {
        console.error('加载搜索配置失败', e)
    }
}
/**
 * 加载认证配置（登录/注册/个人中心）
 */
const loadAuthConfig = async () => {
    try {
        const res = await uiedSettingAuthConfigGet()
        if (res) Object.assign(authConfigData, normalizeAuthConfigData(res))
    } catch (e) {
        console.error('加载认证配置失败', e)
    }
}
const loadExitModal = async () => {
    try {
        const res = await uiedSettingGet({ key: 'exitModalConfig' })
        if (res) Object.assign(exitModalData, normalizeExitModalConfigData(res))
    } catch (e) {
        console.error('加载跳转提醒配置失败', e)
    }
}

/**
 * 加载投稿与支付配置
 */
const loadSubmissionService = async () => {
    try {
        const res = await uiedSettingGet({ key: 'submissionServiceConfig' })
        if (res) Object.assign(submissionServiceData, normalizeSubmissionServiceData(res))
    } catch (e) {
        console.error('加载投稿与支付配置失败', e)
    }
}

/**
 * 加载支付中心配置
 */
const loadPaymentConfig = async () => {
    try {
        const res = await uiedSettingGet({ key: 'paymentConfig' })
        if (res) Object.assign(paymentConfigData, normalizePaymentConfigData(res))
    } catch (e) {
        console.error('加载支付中心配置失败', e)
    }
}

// ==================== 保存函数 ====================
const handleSaveSiteInfo = async () => {
    siteInfoLoading.value = true
    try {
        await uiedSaveSiteInfo(siteInfoData)
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存站点信息失败:', error)
        feedback.msgError('保存失败')
    } finally {
        siteInfoLoading.value = false
    }
}

/**
 * 保存品牌配置，统一收口前台写死品牌文案与兜底内容。
 */
const handleSaveBrandConfig = async () => {
    brandConfigLoading.value = true
    try {
        await uiedSettingSave({
            brandConfig: normalizeBrandConfigData(cloneConfig(brandConfigData))
        })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存品牌配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        brandConfigLoading.value = false
    }
}
const handleSaveAppearance = async () => {
    appearanceLoading.value = true
    try {
        await uiedSettingSave({ appearanceConfig: appearanceData })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存外观配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        appearanceLoading.value = false
    }
}
const handleSaveHomepage = async () => {
    homepageLoading.value = true
    try {
        await uiedSettingSave({
            homepageConfig: normalizeHomepageConfigData(cloneConfig(homepageData))
        })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存首页配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        homepageLoading.value = false
    }
}
const handleSavePageConfig = async () => {
    pageConfigLoading.value = true
    try {
        await uiedSettingSave({ pageGlobalConfig: normalizePageConfigData(pageConfigData) })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存页面配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        pageConfigLoading.value = false
    }
}
const handleSaveCardStyle = async () => {
    cardStyleLoading.value = true
    try {
        await uiedSettingSave({ cardStyleConfig: cardStyleData })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存卡片样式失败:', error)
        feedback.msgError('保存失败')
    } finally {
        cardStyleLoading.value = false
    }
}
const handleSaveSidebar = async () => {
    sidebarLoading.value = true
    try {
        await uiedSettingSave({ sidebarConfig: sidebarData })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存侧边栏配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        sidebarLoading.value = false
    }
}
const handleSaveSearch = async () => {
    searchLoading.value = true
    try {
        await uiedSettingSave({ searchConfig: buildSearchConfigPayload() })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存搜索配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        searchLoading.value = false
    }
}
/**
 * 保存认证配置（登录/注册/个人中心）
 */
const handleSaveAuthConfig = async () => {
    authConfigLoading.value = true
    try {
        await uiedSettingAuthConfigUpdate(normalizeAuthConfigData(authConfigData))
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存认证配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        authConfigLoading.value = false
    }
}
const handleSaveExitModal = async () => {
    exitModalLoading.value = true
    try {
        await uiedSettingSave({ exitModalConfig: exitModalData })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存跳转提醒配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        exitModalLoading.value = false
    }
}

/**
 * 保存投稿与支付配置
 */
const handleSaveSubmissionService = async () => {
    submissionServiceLoading.value = true
    try {
        await uiedSettingSave({
            submissionServiceConfig: buildSubmissionServicePayload()
        })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存投稿与支付配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        submissionServiceLoading.value = false
    }
}

/**
 * 保存支付中心配置
 */
const handleSavePaymentConfig = async () => {
    paymentConfigLoading.value = true
    try {
        await uiedSettingSave({
            paymentConfig: buildPaymentConfigPayload()
        })
        markSaved()
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存支付中心配置失败:', error)
        feedback.msgError('保存失败')
    } finally {
        paymentConfigLoading.value = false
    }
}

/**
 * 保存全部配置（售卖版推荐工作流）
 */
const handleSaveAll = async () => {
    saveAllLoading.value = true
    try {
        await Promise.all([
            uiedSaveSiteInfo(siteInfoData),
            uiedSettingSave({
                appearanceConfig: appearanceData,
                homepageConfig: normalizeHomepageConfigData(cloneConfig(homepageData)),
                pageGlobalConfig: normalizePageConfigData(pageConfigData),
                cardStyleConfig: cardStyleData,
                sidebarConfig: sidebarData,
                searchConfig: buildSearchConfigPayload(),
                submissionServiceConfig: buildSubmissionServicePayload(),
                paymentConfig: buildPaymentConfigPayload(),
                exitModalConfig: exitModalData
            }),
            uiedSettingAuthConfigUpdate(normalizeAuthConfigData(authConfigData))
        ])
        markSaved()
        feedback.msgSuccess('全部配置保存成功')
    } catch (error) {
        console.error('保存全部配置失败:', error)
        feedback.msgError('保存失败，请检查配置后重试')
    } finally {
        saveAllLoading.value = false
    }
}

/**
 * 重置当前标签配置为最近一次快照
 */
const handleResetCurrentTab = () => {
    const tab = activeTab.value
    if (!hasTabChanges(tab)) return

    if (tab === 'siteInfo') Object.assign(siteInfoData, readSnapshotObject(snapshotData.siteInfo))
    if (tab === 'brandConfig')
        Object.assign(
            brandConfigData,
            normalizeBrandConfigData(readSnapshotObject(snapshotData.brandConfig))
        )
    if (tab === 'appearance')
        Object.assign(appearanceData, readSnapshotObject(snapshotData.appearance))
    if (tab === 'homepage')
        Object.assign(
            homepageData,
            normalizeHomepageConfigData(readSnapshotObject(snapshotData.homepage))
        )
    if (tab === 'pageConfig')
        Object.assign(
            pageConfigData,
            normalizePageConfigData(readSnapshotObject(snapshotData.pageConfig))
        )
    if (tab === 'cardStyle')
        Object.assign(cardStyleData, readSnapshotObject(snapshotData.cardStyle))
    if (tab === 'sidebar') Object.assign(sidebarData, readSnapshotObject(snapshotData.sidebar))
    if (tab === 'search') Object.assign(searchData, readSnapshotObject(snapshotData.search))
    if (tab === 'authConfig')
        Object.assign(
            authConfigData,
            normalizeAuthConfigData(readSnapshotObject(snapshotData.authConfig))
        )
    if (tab === 'submissionService')
        Object.assign(
            submissionServiceData,
            normalizeSubmissionServiceData(readSnapshotObject(snapshotData.submissionService))
        )
    if (tab === 'paymentConfig')
        Object.assign(
            paymentConfigData,
            normalizePaymentConfigData(readSnapshotObject(snapshotData.paymentConfig))
        )
    if (tab === 'exitModal')
        Object.assign(exitModalData, readSnapshotObject(snapshotData.exitModal))

    feedback.msgSuccess('当前标签已重置')
}

/**
 * 重新加载全部配置
 */
const handleReloadAll = async () => {
    await loadAllSettings(false)
}

/**
 * 监听地址栏 tab 参数变化（例如旧入口重定向），实时切换标签。
 */
watch(
    () => route.query.tab,
    () => {
        applyRouteTabToActiveTab()
    }
)

/**
 * 监听标签切换，同步写入地址栏 query，保持可分享/可刷新状态。
 */
watch(
    () => activeTab.value,
    () => {
        syncActiveTabToRoute()
    }
)

// ==================== 初始化 ====================
onMounted(() => {
    applyRouteTabToActiveTab()
    syncActiveTabToRoute()
    loadAllSettings(true)
})
</script>

<style scoped>
.setting-tabs :deep(.el-tabs__header) {
    width: 130px;
}
.setting-tabs :deep(.el-tabs__item) {
    text-align: left;
    padding: 0 16px;
}
.form-tip {
    color: #909399;
    font-size: 12px;
    margin-left: 12px;
    line-height: 1.5;
}
.section-desc {
    color: #909399;
    font-size: 13px;
    margin: -8px 0 16px 0;
    padding-left: 2px;
    line-height: 1.6;
}
.submission-mode-alert {
    margin-bottom: 18px;
}

/* 新增：设置页面头部样式 */
.setting-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
}
.setting-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}
.setting-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0;
}
.setting-title-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 22px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.14);
}
.setting-desc {
    font-size: 14px;
    color: #606266;
    margin: 0;
    line-height: 1.6;
}
.setting-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.setting-tab-label__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.10);
    border: 1px solid rgba(37, 99, 235, 0.12);
}

/* 优化：问号提示图标样式 */
.label-tip-icon {
    margin-left: 6px;
    cursor: help;
    color: #c0c4cc;
    font-size: 15px;
    vertical-align: -2px;
    transition: all 0.2s ease;
    opacity: 0.7;
}
.label-tip-icon:hover {
    color: #409eff;
    opacity: 1;
    transform: scale(1.1);
}

.setting-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.toolbar-time {
    color: #909399;
    font-size: 12px;
}

.behavior-preview p {
    margin: 2px 0;
    line-height: 1.6;
    color: #606266;
}

.nav-switch-setting-table {
    width: 100%;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    overflow: hidden;
}

.nav-switch-setting-header,
.nav-switch-setting-row {
    display: grid;
    grid-template-columns: 36px 1fr 1.2fr 1.2fr 90px 120px;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
}

.nav-switch-setting-header {
    background: #f5f7fa;
    color: #606266;
    font-size: 12px;
    font-weight: 600;
}

.nav-switch-setting-row {
    border-top: 1px solid #f0f2f5;
}

.nav-switch-row-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    cursor: move;
    user-select: none;
    font-size: 14px;
}

:deep(.nav-switch-setting-row--ghost) {
    background: #f5f7fa;
    opacity: 0.75;
}

.nav-switch-live-preview {
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed #dcdfe6;
    border-radius: 8px;
    background: #fafafa;
}

.nav-switch-live-preview__title {
    font-size: 12px;
    color: #606266;
    margin-bottom: 8px;
}

.nav-switch-trigger-preview__button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    background: #fff;
    color: #303133;
}

.nav-switch-trigger-preview__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 54px;
    height: 24px;
    border-radius: 12px;
    font-size: 12px;
    color: #606266;
    background: #f4f4f5;
}

.nav-switch-trigger-preview__name {
    flex: 1;
    text-align: left;
    font-size: 13px;
    font-weight: 600;
}

.nav-switch-trigger-preview__arrow {
    color: #909399;
}

.nav-switch-trigger-preview__dropdown {
    margin-top: 8px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
}

.nav-switch-trigger-preview__option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-top: 1px solid #f2f2f2;
}

.nav-switch-trigger-preview__option:first-child {
    border-top: none;
}

.nav-switch-trigger-preview__option-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 20px;
    border-radius: 10px;
    font-size: 11px;
    color: #606266;
    background: #f4f4f5;
}

.nav-switch-trigger-preview__option-name {
    flex: 1;
    font-size: 13px;
    color: #303133;
}

.form-max-600 {
    max-width: 600px;
}

.form-max-650 {
    max-width: 650px;
}

.form-max-700 {
    max-width: 700px;
}

.row-start-gap-12 {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.row-center-gap-12 {
    display: flex;
    align-items: center;
    gap: 12px;
}

.row-between-center {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.flex-1 {
    flex: 1;
}

.w-100 {
    width: 100%;
}

.input-w-140 {
    width: 140px;
}

.input-w-200 {
    width: 200px;
}

.input-w-300 {
    width: 300px;
}

.mt-8 {
    margin-top: 8px;
}

.mt-12 {
    margin-top: 12px;
}

.mb-16 {
    margin-bottom: 16px;
}

.mb-20 {
    margin-bottom: 20px;
}

.ml-12 {
    margin-left: 12px;
}

.font-500 {
    font-weight: 500;
}

.logo-preview-image {
    max-width: 200px;
    max-height: 50px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 4px;
}

.favicon-preview-image {
    width: 32px;
    height: 32px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 2px;
}

.exit-logo-preview-image {
    width: 120px;
    height: 40px;
}

.brand-array-block {
    margin-bottom: 20px;
}

.brand-array-block__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
}

.brand-array-card {
    padding: 14px;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    background: #fafafa;
    margin-bottom: 12px;
}

.brand-array-card__grid {
    display: grid;
    gap: 12px;
    margin-bottom: 12px;
}

.brand-array-card__grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.brand-array-card__grid--three {
    grid-template-columns: 1fr 1.2fr 220px;
}

.brand-array-card__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
}

.font-preview-panel {
    margin-top: 10px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid #e4ebf3;
    background: #f8fbfd;
}

.font-preview-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: #606266;
    margin-bottom: 10px;
}

.font-preview-panel__header strong {
    font-size: 13px;
    color: #303133;
}

.font-preview-panel__content {
    display: grid;
    gap: 8px;
    color: #303133;
    line-height: 1.8;
}

.font-preview-panel__content p {
    margin: 0;
}

</style>
