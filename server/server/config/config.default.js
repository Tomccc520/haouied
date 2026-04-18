const path = require('path');
const {
    resolveUploadsAbsoluteDirByInput,
} = require('../app/util/uploadsPathUtil');
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
    /**
       * built-in config
       * @type {{security: {csrf: {headerName: string}}}}
       **/
    const config = exports = {
        security: {
            csrf: {
                enable: false,
            },
        },
    };


    // 验证规则
    config.validate = {
        convert: true,
        widelyUndefined: true,
    };

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1634002379446_8360';

    // add your middleware config here
    config.middleware = ['authority', 'seoRewrite', 'auth', 'commercialActivationGuard', 'systemResponseNormalizer'];

    // add your user config here
    const userConfig = {
        // myAppName: 'egg',
    };

    config.cors = {
        origin: '*',
        allowMethods: 'GET, PUT, POST,DELETE, PATCH',
    };

    // config.io = {
    //     init: {}, // passed to engine.io
    //     namespace: {
    //         '/': {
    //             connectionMiddleware: ['auth'], // 这个是连接中间件， 只在connection的时候触发
    //             packetMiddleware: ['auth'],  // 这个会在每次消息的时候触发
    //         }
    //     },
    // }

    config.cluster = {
        listen: {
            path: '',
            port: 8002,
            hostname: '0.0.0.0',
        },
    };

    config.session = {
        key: 'EGG_SESS_TOKEN',
        maxAge: 1000 * 3600, // 1 天
        httpOnly: true,
        encrypt: true,
    };

    // 商业版许可证签名密钥（建议在部署环境通过环境变量配置）
    config.uiedLicenseSignSecret = process.env.UIED_LICENSE_SIGN_SECRET || '';
    // 对外授权激活接口签名密钥（默认可与 License 签名密钥一致）
    config.uiedLicenseApiSignSecret = String(process.env.UIED_LICENSE_API_SIGN_SECRET || '').trim();
    // 是否允许本地签发许可证（仅 fsuied.com 授权中心应开启）
    config.uiedEnableLocalLicenseSign = String(process.env.UIED_ENABLE_LOCAL_LICENSE_SIGN || '').trim().toLowerCase() === 'true';
    // 按授权码激活：fsuied.com 授权中心接口地址
    config.uiedLicenseActivateEndpoint = String(process.env.UIED_LICENSE_ACTIVATE_ENDPOINT || 'https://fsuied.com/api/license/detail').trim();
    // 按授权码激活：请求方式（GET/POST）
    config.uiedLicenseActivateMethod = String(process.env.UIED_LICENSE_ACTIVATE_METHOD || 'GET').trim().toUpperCase();
    // 按授权码激活：可选鉴权 Token（Bearer）
    config.uiedLicenseActivateToken = String(process.env.UIED_LICENSE_ACTIVATE_TOKEN || '').trim();
    // 按授权码激活：项目编码（默认 fsuied）
    config.uiedLicenseProjectCode = String(process.env.UIED_LICENSE_PROJECT_CODE || 'fsuied').trim().toLowerCase();
    // 本地授权文件路径（支持绝对路径；相对路径默认基于 server 目录）
    config.uiedLicenseFilePath = String(process.env.UIED_LICENSE_FILE_PATH || 'licenses/my.license').trim();
    // 按授权码激活：超时时间（毫秒）
    config.uiedLicenseActivateTimeout = Number(process.env.UIED_LICENSE_ACTIVATE_TIMEOUT || 10000) || 10000;
    // 按授权码激活：本地联调时是否允许不安全 TLS（仅开发环境建议开启）
    config.uiedLicenseActivateAllowInsecureTls = String(process.env.UIED_LICENSE_ACTIVATE_ALLOW_INSECURE_TLS || '').trim().toLowerCase() === 'true';
    // 是否要求安装后先导入付费许可证再使用后台业务能力（默认开启）
    config.uiedRequirePaidLicenseActivation = String(process.env.UIED_REQUIRE_PAID_LICENSE_ACTIVATION || 'true').trim().toLowerCase() !== 'false';

    /**
     * 解析上传目录绝对路径（支持传 uploads 父目录或 uploads 目录本身）。
     * 该目录用于素材上传与截图缓存，建议线上指向项目外持久化目录。
     */
    const uploadsAbsDir = resolveUploadsAbsoluteDirByInput(
        appInfo.baseDir,
        process.env.UIED_UPLOADS_ABS_DIR || ''
    );
    config.uiedUploadsAbsDir = uploadsAbsDir;

    const defaultStaticRoot = path.join(appInfo.baseDir, 'app/public');
    const defaultUploadsRoot = path.join(defaultStaticRoot, 'uploads');
    const staticDirs = [defaultStaticRoot];
    if (uploadsAbsDir !== defaultUploadsRoot) {
        staticDirs.push({
            prefix: '/public/uploads',
            dir: uploadsAbsDir,
        });
    }

    // 设置静态目录
    config.static = {
        prefix: '/public',
        dir: staticDirs,
        dynamic: true, // 如果当前访问的静态资源没有缓存，则缓存静态文件，和`preload`配合使用；
        preload: false,
        maxAge: 31536000, // in prod env, 0 in other envs
        buffer: true, // in prod env, false in other envs
        maxFiles: 1000,
    }

    config.multipart = {
        // 表单 Field 文件名长度限制
        fieldNameSize: 100,
        // 表单 Field 内容大小
        fieldSize: '100kb',
        // 表单 Field 最大个数
        fields: 10,
        // 单个文件大小
        fileSize: '10mb',
        // 允许上传的最大文件数
        files: 10,
        whitelist: ['.txt', '.png', '.jpeg', '.jpg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.zip', '.xls', '.ppt', '.doc', '.docx', '.pdf', '.xls', '.xlsx', '.mp4', '.wmv', '.avi', '.mov', '.flv', '.rmvb'],
    };

    config.security = {
        csrf: {
            enable: false,
            ignoreJSON: true,
        },
        domainWhiteList: [],
    };
    config.cors = {
        origin: '*',
        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    };

    const view = exports = {
        defaultViewEngine: 'nunjucks',
        mapping: {
            '.tpl': 'nunjucks',
        },
    };

    return {
        ...config,
        ...userConfig,
        ...view,
    };
};
