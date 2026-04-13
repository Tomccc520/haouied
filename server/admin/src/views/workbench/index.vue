<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-03
 */
-->
<template>
    <div class="workbench">
        <div class="md:flex">
            <el-card class="!border-none mb-4 md:mr-4" shadow="never">
                <template #header>
                    <span class="card-title">版本信息</span>
                </template>
                <div>
                    <div class="flex leading-9">
                        <div class="w-20 flex-none">当前版本</div>
                        <span> {{ workbenchData.version.version }}</span>
                    </div>
                    <div class="flex leading-9">
                        <div class="w-20 flex-none">基于框架</div>
                        <span> {{ workbenchData.version.based }}</span>
                    </div>
                    <div class="flex leading-9">
                        <div class="w-20 felx-none">获取渠道</div>
                        <div>
                            <a
                                :href="frontendOfficialUrl"
                                target="_blank"
                            >
                                <el-button type="success" size="small">官网</el-button>
                            </a>
                            <a
                                class="ml-3"
                                :href="workbenchData.version.channel.docs || defaultChannelLinks.docs"
                                target="_blank"
                            >
                                <el-button type="primary" size="small">文档</el-button>
                            </a>
                        </div>
                    </div>
                    <div class="flex leading-9 items-center">
                        <div class="w-20 flex-none">本版新增</div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="workbench-update-pill">本版 {{ adminUpdateCount }} 项</span>
                            <el-button type="primary" plain size="small" @click="openAdminUpdateLog">
                                查看更新记录
                            </el-button>
                        </div>
                    </div>
                </div>
            </el-card>
            <el-card class="!border-none mb-4 flex-1" shadow="never">
                <template #header>
                    <div>
                        <span class="card-title">今日数据</span>
                        <span class="text-tx-secondary text-xs ml-4">
                            更新时间：{{ workbenchData.today.time }}
                        </span>
                    </div>
                </template>

                <div class="flex flex-wrap">
                    <div class="w-1/2 md:w-1/4">
                        <div class="leading-10">新增网站(个)</div>
                        <div class="text-6xl">{{ workbenchData.today.todayVisits }}</div>
                        <div class="text-tx-secondary text-xs">
                            网站总数：{{ workbenchData.today.totalVisits }}
                        </div>
                    </div>
                    <div class="w-1/2 md:w-1/4">
                        <div class="leading-10">新增文章(篇)</div>
                        <div class="text-6xl">{{ workbenchData.today.todaySales }}</div>
                        <div class="text-tx-secondary text-xs">
                            文章总数：{{ workbenchData.today.totalSales }}
                        </div>
                    </div>
                    <div class="w-1/2 md:w-1/4">
                        <div class="leading-10">新增评论(条)</div>
                        <div class="text-6xl">{{ workbenchData.today.todayOrder }}</div>
                        <div class="text-tx-secondary text-xs">
                            评论总数：{{ workbenchData.today.totalOrder }}
                        </div>
                    </div>
                    <div class="w-1/2 md:w-1/4">
                        <div class="leading-10">后台登录(次)</div>
                        <div class="text-6xl">{{ workbenchData.today.todayUsers }}</div>
                        <div class="text-tx-secondary text-xs">
                            累计登录：{{ workbenchData.today.totalUsers }}
                        </div>
                    </div>
                </div>
            </el-card>
        </div>
        <div class="function mb-4">
            <el-card class="flex-1 !border-none" shadow="never">
                <template #header>
                    <span>常用功能</span>
                </template>
                <div class="flex flex-wrap">
                    <div
                        v-for="item in workbenchData.menu"
                        class="md:w-[12.5%] w-1/4 flex flex-col items-center"
                        :key="item"
                    >
                        <router-link :to="item.url" class="mb-3 flex flex-col items-center">
                            <img width="40" height="40" :src="item.image" />
                            <div class="mt-2">{{ item.name }}</div>
                        </router-link>
                    </div>
                </div>
            </el-card>
        </div>
        <div class="mb-4">
            <el-card class="workbench-updates !border-none" shadow="never">
                <template #header>
                    <div class="workbench-updates__header">
                        <div>
                            <div class="workbench-updates__title">本版更新</div>
                            <div class="workbench-updates__subtitle">
                                v{{ adminUpdateVersion }} 重点能力与快捷跳转
                            </div>
                        </div>
                        <el-button type="primary" plain size="small" @click="openAdminUpdateLog">
                            查看完整更新记录
                        </el-button>
                    </div>
                </template>
                <div class="workbench-updates__grid">
                    <div
                        v-for="item in adminUpdateHighlights"
                        :key="item.id"
                        class="workbench-updates__item"
                    >
                        <div class="workbench-updates__item-head">
                            <div class="workbench-updates__item-title-row">
                                <div class="workbench-updates__item-title">{{ item.title }}</div>
                                <span class="workbench-updates__item-badge">新</span>
                            </div>
                            <div class="workbench-updates__item-group">
                                {{ getAdminUpdateGroupLabel(item.group) }}
                            </div>
                        </div>
                        <div class="workbench-updates__item-desc">{{ item.description }}</div>
                        <div class="workbench-updates__item-action">
                            <el-button type="primary" link @click="jumpToAdminUpdate(item)">
                                {{ item.actionText || '立即前往' }}
                            </el-button>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>
        <div class="md:flex">
            <el-card class="flex-1 !border-none md:mr-4 mb-4" shadow="never">
                <template #header>
                    <span>后台登录趋势（近15天）</span>
                </template>
                <div>
                    <v-charts
                        style="height: 350px"
                        :option="workbenchData.visitorOption"
                        :autoresize="true"
                    />
                </div>
            </el-card>
            <el-card class="!border-none mb-4" shadow="never">
                <template #header>
                    <span>服务支持</span>
                </template>
                <div>
                    <div v-for="(item, index) in workbenchData.support" :key="index">
                        <div
                            class="pb-8 pt-8"
                            :class="{
                                'border-b border-br': index == 0
                            }"
                        >
                            <div>
                                <div class="text-base font-medium">{{ item.title }}</div>
                                <div class="text-tx-regular text-xs mt-2 whitespace-pre-line">
                                    {{ item.desc }}
                                </div>
                                <div v-if="item.link" class="mt-3">
                                    <a :href="item.link" target="_blank" rel="noopener noreferrer">
                                        <el-button type="primary" size="small">
                                            {{ item.actionText || '立即前往' }}
                                        </el-button>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script lang="ts" setup name="workbench">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-03
 */
import { getWorkbench } from '@/api/app'
import vCharts from 'vue-echarts'
import menu_admin from './image/menu_admin.png'
import menu_role from './image/menu_role.png'
import menu_dept from './image/menu_dept.png'
import menu_dict from './image/menu_dict.png'
import menu_generator from './image/menu_generator.png'
import menu_file from './image/menu_file.png'
import menu_auth from './image/menu_auth.png'
import menu_web from './image/menu_web.png'
import {
    ADMIN_UPDATE_GROUP_LABELS,
    ADMIN_UPDATE_HIGHLIGHTS,
    ADMIN_UPDATE_HIGHLIGHT_COUNT,
    CURRENT_ADMIN_UPDATE_VERSION,
    type AdminUpdateHighlightItem
} from '@/config/updateHighlights'

const defaultChannelLinks = {
    docs: 'https://fsuied.com'
}

const router = useRouter()
const adminUpdateCount = ADMIN_UPDATE_HIGHLIGHT_COUNT
const adminUpdateVersion = CURRENT_ADMIN_UPDATE_VERSION
const adminUpdateHighlights = ADMIN_UPDATE_HIGHLIGHTS.slice(0, 6)

/**
 * 官方支持信息（工作台固定展示）
 */
const supportInfo = {
    siteUrl: 'https://fsuied.com',
    productUrl: 'https://fsuied.com/products/10',
    qqGroup: '1082794860',
    qqContact: '403479454'
}

/**
 * 计算前端官网地址（优先读取环境变量，默认本地前端开发地址）
 */
const frontendOfficialUrl = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3003').replace(
    /\/$/,
    ''
)

/**
 * 打开后台更新记录页：便于从工作台直接查看本版新增能力。
 */
const openAdminUpdateLog = () => {
    router.push('/uied/update-log')
}

/**
 * 获取后台更新项分组名称。
 * @param group 更新项分组标识
 */
const getAdminUpdateGroupLabel = (group: AdminUpdateHighlightItem['group']) => {
    return ADMIN_UPDATE_GROUP_LABELS[group] || '本版更新'
}

/**
 * 从工作台直接跳转到指定新增功能页。
 * @param item 后台更新项
 */
const jumpToAdminUpdate = (item: AdminUpdateHighlightItem) => {
    router.push({
        path: item.routePath,
        query: item.routeQuery || {}
    })
}

// 工作台展示数据
const workbenchData: any = reactive({
    version: {
        version: '', // 版本号
        website: '', // 官网
        based: '',
        channel: {
            website: '',
            docs: ''
        }
    },
    support: [
        {
            title: '商业授权',
            desc: `购买地址：${supportInfo.productUrl}
版本策略：Pro / Enterprise（永久授权）
Pro：限制 3 个域名绑定
Enterprise：源码交付，不限制域名`,
            link: supportInfo.productUrl,
            actionText: '前往购买'
        },
        {
            title: '服务支持',
            desc: `授权入口：工作中心 -> 授权中心
激活前将限制后台功能访问
客服 QQ：${supportInfo.qqContact}
官方 QQ 群：${supportInfo.qqGroup}`,
            link: supportInfo.siteUrl,
            actionText: '联系官方支持'
        }
    ],
    today: {
        time: '--',
        todayVisits: 0,
        totalVisits: 0,
        todaySales: 0,
        totalSales: 0,
        todayOrder: 0,
        totalOrder: 0,
        todayUsers: 0,
        totalUsers: 0
    }, // 今日数据
    menu: [
        {
            name: '管理员',
            image: menu_admin,
            url: '/permission/admin'
        },
        {
            name: '角色管理',
            image: menu_role,
            url: '/permission/role'
        },
        {
            name: '部门管理',
            image: menu_dept,
            url: '/organization/department'
        },
        {
            name: '字典管理',
            image: menu_dict,
            url: '/dev_tools/dict'
        },
        {
            name: '代码生成器',
            image: menu_generator,
            url: '/dev_tools/code'
        },
        {
            name: '素材中心',
            image: menu_file,
            url: '/material/index'
        },
        {
            name: '菜单权限',
            image: menu_auth,
            url: '/permission/menu'
        },
        {
            name: '网站信息',
            image: menu_web,
            url: '/setting/website/information'
        }
    ], // 常用功能
    visitor: [], // 访问量
    article: [], // 文章阅读量

    visitorOption: {
        xAxis: {
            type: 'category',
            data: [0]
        },
        yAxis: {
            type: 'value'
        },
        legend: {
            data: ['登录次数']
        },
        itemStyle: {
            // 点的颜色。
            color: 'red'
        },
        tooltip: {
            trigger: 'axis'
        },
        series: [
            {
                name: '登录次数',
                data: [0],
                type: 'line',
                smooth: true
            }
        ]
    }
})

/**
 * 拉取工作台首页数据并同步图表
 */
const getData = async () => {
    const res = await getWorkbench()
    workbenchData.version = {
        ...workbenchData.version,
        ...(res.version || {}),
        channel: {
            ...workbenchData.version.channel,
            ...(res.version?.channel || {})
        }
    }
    workbenchData.today = {
        ...workbenchData.today,
        ...(res.today || {})
    }
    workbenchData.visitor = res.visitor || { date: [], list: [] }

    // 清空echarts 数据
    workbenchData.visitorOption.xAxis.data = []
    workbenchData.visitorOption.series[0].data = []

    // 写入从后台拿来的数据
    workbenchData.visitorOption.xAxis.data = Array.isArray(res?.visitor?.date) ? res.visitor.date : []
    workbenchData.visitorOption.series[0].data = Array.isArray(res?.visitor?.list) ? res.visitor.list : []
}

getData()
</script>

<style lang="scss" scoped>
.workbench-update-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.10);
    border: 1px solid rgba(37, 99, 235, 0.14);
}

.workbench-updates {
    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    &__title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
    }

    &__subtitle {
        margin-top: 4px;
        font-size: 12px;
        color: #6b7280;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
    }

    &__item {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 164px;
        padding: 15px;
        border-radius: 14px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }

    &__item-head {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    &__item-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    &__item-title {
        font-size: 15px;
        font-weight: 600;
        color: #111827;
    }

    &__item-badge {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.10);
        border: 1px solid rgba(37, 99, 235, 0.14);
    }

    &__item-group {
        font-size: 12px;
        color: var(--el-color-primary);
    }

    &__item-desc {
        flex: 1;
        font-size: 13px;
        line-height: 1.75;
        color: #4b5563;
    }

    &__item-action {
        display: flex;
        justify-content: flex-start;
    }
}

@media (max-width: 768px) {
    .workbench-updates {
        &__header {
            flex-direction: column;
            align-items: flex-start;
        }
    }
}
</style>
