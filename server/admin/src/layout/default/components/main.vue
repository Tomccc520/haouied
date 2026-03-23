<template>
    <main class="main-wrap h-full bg-page">
        <el-scrollbar>
            <div class="p-4">
                <router-view v-if="isRouteShow" v-slot="{ Component, route }">
                    <keep-alive :include="includeList" :max="20">
                        <component
                            v-if="!isRouterViewComponent(Component)"
                            :is="Component"
                            :key="route.fullPath"
                        />
                    </keep-alive>
                    <component
                        v-if="isRouterViewComponent(Component)"
                        :is="Component"
                        :key="route.fullPath"
                    />
                </router-view>
            </div>
        </el-scrollbar>
    </main>
</template>

<script setup lang="ts">
import useAppStore from '@/stores/modules/app'
import useTabsStore from '@/stores/modules/multipleTabs'
import useSettingStore from '@/stores/modules/setting'
const appStore = useAppStore()
const tabsStore = useTabsStore()
const settingStore = useSettingStore()
const isRouteShow = computed(() => appStore.isRouteShow)
const includeList = computed(() => (settingStore.openMultipleTabs ? tabsStore.getCacheTabList : []))

/**
 * 判断当前路由组件是否为 RouterView 占位组件。
 * RouterView 不应被 keep-alive 直接包裹，否则会触发 Vue Router 警告。
 * @param component 路由组件
 */
const isRouterViewComponent = (component: unknown): boolean => {
    const name = String((component as any)?.name || '').trim()
    return name === 'RouterView'
}
</script>

<style></style>
