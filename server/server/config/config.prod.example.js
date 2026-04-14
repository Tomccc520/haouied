module.exports = appInfo => {
    const config = {}

    /**
     * 解析端口号并做兜底。
     * @param {string|undefined} value 端口字符串
     * @param {number} fallback 默认端口
     * @returns {number}
     */
    const resolvePort = (value, fallback) => {
        const nextPort = Number(value)
        return Number.isFinite(nextPort) && nextPort > 0 ? nextPort : fallback
    }

    config.sequelize = {
        dialect: 'mysql',
        host: process.env.UIED_DB_HOST || '127.0.0.1',
        port: resolvePort(process.env.UIED_DB_PORT, 3308),
        username: process.env.UIED_DB_USER || 'uied',
        password: process.env.UIED_DB_PASSWORD || 'uied123456',
        database: process.env.UIED_DB_NAME || 'uied_nav',
        define: { // model的全局配置
            timestamps: true, // 添加create,update,delete时间戳
            paranoid: false, // 添加软删除
            freezeTableName: true, // 防止修改表名为复数
            underscored: false // 防止驼峰式字段被默认转为下划线
        }
    }

    config.redis = {
        client: {
            port: resolvePort(process.env.UIED_REDIS_PORT, 6380),
            host: process.env.UIED_REDIS_HOST || '127.0.0.1',
            password: process.env.UIED_REDIS_PASSWORD || '',
            db: resolvePort(process.env.UIED_REDIS_DB, 0)
        }
    }

    /**
     * 可选：独立上传目录（推荐配置到项目外，升级时素材不受影响）。
     */
    const uploadsAbsDir = String(process.env.UIED_UPLOADS_ABS_DIR || '').trim()
    if (uploadsAbsDir) {
        config.uiedUploadsAbsDir = uploadsAbsDir
    }

    return config
}
