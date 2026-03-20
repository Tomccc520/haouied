import { merge } from 'lodash'
import configs from '@/config'
import { Axios } from './axios'
import { ContentTypeEnum, RequestCodeEnum, RequestMethodsEnum } from '@/enums/requestEnums'
import type { AxiosHooks } from './type'
import { clearAuthInfo, getToken } from '../auth'
import feedback from '../feedback'
import NProgress from 'nprogress'
import { AxiosError, type AxiosRequestConfig } from 'axios'
import router from '@/router'
import { PageEnum } from '@/enums/pageEnum'

const TOKEN_EXPIRED_CODE_SET = new Set<number>([
    RequestCodeEnum.TOKEN_EMPTY,
    RequestCodeEnum.TOKEN_INVALID
])
let authExpiredDialogVisible = false

/**
 * 解析商业版功能拦截 403 错误（用于显示更友好的提示）
 */
function parseCommercialFeatureGuardError(error: any) {
    const status = Number(error?.response?.status || 0)
    const body = error?.response?.data || {}
    if (status !== 403 || Number(body?.code || 0) !== 403) return null
    const featureKey = String(body?.data?.featureKey || '').trim()
    if (!featureKey) return null
    return {
        featureKey,
        edition:
            String(body?.data?.edition || 'free')
                .trim()
                .toLowerCase() || 'free'
    }
}

/**
 * 提取接口异常消息（优先后端 message / msg）
 */
function extractResponseErrorMessage(error: any): string {
    const body = error?.response?.data || {}
    return String(body?.msg || body?.message || error?.msg || error?.message || '').trim()
}

/**
 * 解析登录态失效异常（token 为空/无效、会话过期等）
 */
function parseAuthExpiredError(error: any) {
    const status = Number(error?.response?.status || 0)
    const body = error?.response?.data || {}
    const code = Number(body?.code || 0)
    const featureKey = String(body?.data?.featureKey || '').trim()
    if (status !== 401 && status !== 403) return null
    // 商业版功能拦截 403（含 featureKey）不走登录态失效逻辑
    if (status === 403 && code === RequestCodeEnum.NO_PERMISSTION && featureKey) return null

    const rawMessage = extractResponseErrorMessage(error).toLowerCase()
    const maybeExpiredByMessage = /token参数为空|token参数无效|token|登录状态|会话|session|expired/.test(
        rawMessage
    )
    if (!TOKEN_EXPIRED_CODE_SET.has(code) && !maybeExpiredByMessage) return null

    return {
        message: '登录状态已过期，请重新登录后继续操作'
    }
}

/**
 * 统一展示登录过期弹窗，避免并发请求下重复弹出
 */
async function showAuthExpiredDialog(message: string) {
    if (authExpiredDialogVisible) return
    authExpiredDialogVisible = true
    try {
        await feedback.alertWarning(message || '登录状态已过期，请重新登录后继续操作')
    } catch (_error) {
        // 用户关闭弹窗时无需额外处理
    } finally {
        authExpiredDialogVisible = false
        if (router.currentRoute.value.path !== PageEnum.LOGIN) {
            router.push({ path: PageEnum.LOGIN })
        }
    }
}

/**
 * 统一处理登录态失效：清理本地登录态 + 友好弹窗 + 跳转登录页
 */
function handleAuthExpiredError(error: any): boolean {
    const expiredState = parseAuthExpiredError(error)
    if (!expiredState) return false
    clearAuthInfo()
    const message = String(expiredState.message || '登录状态已过期，请重新登录后继续操作').trim()
    error.message = message
    ;(error as any).__uiedHandled = true
    void showAuthExpiredDialog(message)
    return true
}

// 处理axios的钩子函数
const axiosHooks: AxiosHooks = {
    requestInterceptorsHook(config) {
        NProgress.start()
        const { withToken, isParamsToData } = config.requestOptions
        const params = config.params || {}
        const headers = config.headers || {}

        // 添加token
        if (withToken) {
            const token = getToken()
            headers.token = token
        }
        // POST请求下如果无data，则将params视为data
        if (
            isParamsToData &&
            !Reflect.has(config, 'data') &&
            config.method?.toUpperCase() === RequestMethodsEnum.POST
        ) {
            config.data = params
            config.params = {}
        }
        config.headers = headers
        return config
    },
    requestInterceptorsCatchHook(err) {
        NProgress.done()
        return err
    },
    async responseInterceptorsHook(response) {
        NProgress.done()
        const { isTransformResponse, isReturnDefaultResponse } = response.config.requestOptions

        //返回默认响应，当需要获取响应头及其他数据时可使用
        if (isReturnDefaultResponse) {
            return response
        }
        // 是否需要对数据进行处理
        if (!isTransformResponse) {
            return response.data
        }
        const { code, data, show, msg, message } = response.data || {}
        const messageText = String(msg || message || '').trim()
        switch (code) {
            case RequestCodeEnum.SUCCESS:
                if (show) {
                    messageText && feedback.msgSuccess(messageText)
                }
                return data

            case RequestCodeEnum.PARAMS_TYPE_ERROR:
            case RequestCodeEnum.PARAMS_VALID_ERROR:
            case RequestCodeEnum.REQUEST_METHOD_ERROR:
            case RequestCodeEnum.ASSERT_ARGUMENT_ERROR:
            case RequestCodeEnum.ASSERT_MYBATIS_ERROR:
            case RequestCodeEnum.LOGIN_ACCOUNT_ERROR:
            case RequestCodeEnum.LOGIN_DISABLE_ERROR:
            case RequestCodeEnum.NO_PERMISSTION:
            case RequestCodeEnum.FAILED:
            case RequestCodeEnum.SYSTEM_ERROR:
                messageText && feedback.msgError(messageText)
                return Promise.reject(data)

            case RequestCodeEnum.TOKEN_INVALID:
            case RequestCodeEnum.TOKEN_EMPTY:
                clearAuthInfo()
                void showAuthExpiredDialog(
                    messageText || '登录状态已过期，请重新登录后继续操作'
                )
                return Promise.reject({
                    code,
                    data,
                    message: messageText || '登录状态已过期，请重新登录后继续操作',
                    __uiedHandled: true
                })

            default:
                /**
                 * 兼容后端返回 code=1001/1002 等历史业务码：
                 * 非 200 一律视为失败并提示 message，避免登录页“无提示失败”。
                 */
                if (Number(code) !== RequestCodeEnum.SUCCESS) {
                    feedback.msgError(messageText || `请求失败（${String(code || 'UNKNOWN')}）`)
                    return Promise.reject({
                        code,
                        data,
                        message: messageText || '请求失败'
                    })
                }
                return data
        }
    },
    responseInterceptorsCatchHook(error) {
        NProgress.done()
        if (error.code === AxiosError.ERR_CANCELED) return Promise.reject(error)
        if (handleAuthExpiredError(error)) return Promise.reject(error)

        const featureDenied = parseCommercialFeatureGuardError(error)
        if (featureDenied) {
            feedback.msgError(
                `当前版本未授权该功能（${
                    featureDenied.featureKey
                }，当前版本：${featureDenied.edition.toUpperCase()}）`
            )
        } else {
            const errorMessage = extractResponseErrorMessage(error)
            errorMessage && feedback.msgError(errorMessage)
        }
        return Promise.reject(error)
    }
}

const defaultOptions: AxiosRequestConfig = {
    timeout: configs.timeout,
    // 基础接口地址
    baseURL: configs.baseUrl,
    headers: { 'Content-Type': ContentTypeEnum.JSON, version: configs.version },

    // 处理 axios的钩子函数
    axiosHooks: axiosHooks,
    // 每个接口可以单独配置
    requestOptions: {
        // 是否将params视为data参数，仅限post请求
        isParamsToData: true,
        //是否返回默认的响应
        isReturnDefaultResponse: false,
        // 需要对返回数据进行处理
        isTransformResponse: true,
        // 接口拼接地址
        urlPrefix: configs.urlPrefix,
        // 忽略重复请求
        ignoreCancelToken: false,
        // 是否携带token
        withToken: true,
        // 开启请求超时重新发起请求请求机制
        isOpenRetry: true,
        // 重新请求次数
        retryCount: 2
    }
}

function createAxios(opt?: Partial<AxiosRequestConfig>) {
    return new Axios(
        // 深度合并
        merge(defaultOptions, opt || {})
    )
}
const request = createAxios()
export default request
