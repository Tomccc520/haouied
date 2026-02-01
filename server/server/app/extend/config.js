'use strict';
// 生成一个1024长度的密钥对
// const nodeRSA = require("node-rsa");
// const key = new nodeRSA({b: 1024})
// const publicKey = key.exportKey('pkcs8-public') // 公钥
// const privateKey = key.exportKey('pkcs8-private') // 私钥
const path = require('path');
const runPath = path.dirname(path.dirname(__filename));

const rsa = {
  publicKey: '-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCGZ9nIiSJT+N66Y44G4R1exi9Zg7C141cCzHL9avlYdpxGHtXUWvUX2wcOXe2AtCTH54cBVbWdudlFpN0M2PBUDfFE+rx5KzRWqDm3vAolAb8Tr7+LHVLdcPGc3j8h/XUnsM6rVCxDGM/PcdMp1sM5Nec5BJ3oGwCgt92HgT8BtwIDAQAB-----END PUBLIC KEY-----',
  privateKey: '[REDACTED_PRIVATE_KEY]',
  // 角色缓存键
  backstageRolesKey: 'backstage:roles',
  // 令牌缓存键
  backstageTokenKey: 'backstage:token:',
  // 令牌的集合
  backstageTokenSet: 'backstage:token:set:',
  // Redis键前缀
  redisPrefix: 'Like:',
  // 管理缓存键
  backstageManageKey: 'backstage:manage',
  // 用户sessionKey
  superAdminId: 1,
  reqAdminIdKey: 'admin_id',
  reqRoleIdKey: 'role',
  reqUsernameKey: 'username',
  reqNicknameKey: 'nickname',

  dbTablePrefix: 'la_',

  genConfig: {
    // 基础包名
    packageName: 'gencode',
    // 是否去除表前缀
    isRemoveTablePrefix: true,
    // 生成代码根路径
    genRootPath: '/tmp/target',
  },

  nodeConstants: {
    typeString: 'string', // 字符串类型
    typeFloat: 'float64', // 浮点型
    typeInt: 'int', // 整型
    typeDate: 'core.TsTime', // 时间类型
  },

  genConstants: {
    UTF8: 'utf-8', // 编码
    tplCrud: 'crud', // 单表 (增删改查)
    tplTree: 'tree', // 树表 (增删改查)
    queryLike: 'LIKE', // 模糊查询
    queryEq: '=', // 相等查询
    qequire: 1, // 需要的
  },

  sqlConstants: {
    // 数据库字符串类型
    columnTypeStr: [ 'char', 'varchar', 'nvarchar', 'varchar2' ],
    // 数据库文本类型
    columnTypeText: [ 'tinytext', 'text', 'mediumtext', 'longtext' ],
    // 数据库时间类型
    columnTypeTime: [ 'datetime', 'time', 'date', 'timestamp' ],
    // 数据库数字类型
    columnTypeNumber: [
      'tinyint',
      'smallint',
      'mediumint',
      'int',
      'integer',
      'bit',
      'bigint',
      'float',
      'double',
      'decimal',
    ],
    // 时间日期字段名
    columnTimeName: [
      'create_time',
      'update_time',
      'delete_time',
      'start_time',
      'end_time',
    ],
    // 页面不需要插入字段
    columnNameNotAdd: [
      'id',
      'is_delete',
      'create_time',
      'update_time',
      'delete_time',
    ],
    // 页面不需要编辑字段
    columnNameNotEdit: [ 'is_delete', 'create_time', 'update_time', 'delete_time' ],
    // 页面不需要列表字段
    columnNameNotList: [
      'id',
      'intro',
      'content',
      'is_delete',
      'delete_time',
    ],
    // 页面不需要查询字段
    columnNameNotQuery: [
      'is_delete',
      'create_time',
      'update_time',
      'delete_time',
    ],
  },

  // HtmlConstants HTML相关常量
  htmlConstants: {
    htmlInput: 'input', // 文本框
    htmlTextarea: 'textarea', // 文本域
    htmlSelect: 'select', // 下拉框
    htmlRadio: 'radio', // 单选框
    htmlDatetime: 'datetime', // 日期控件
    htmlImageUpload: 'imageUpload', // 图片上传控件
    htmlFileUpload: 'fileUpload', // 文件上传控件
    htmlEditor: 'editor', // 富文本控件
  },

  // 免登录验证
  notLoginUri: [
    'system:login', // 登录接口
    'common:index:config', // 配置接口
  ],

  // 免权限验证
  notAuthUri: [
    'system:logout', // 退出登录
    'system:menu:menus', // 系统菜单
    'system:menu:route', // 菜单路由
    'system:admin:upInfo', // 管理员更新
    'system:admin:self', // 管理员信息
    'system:role:all', // 所有角色
    'system:post:all', // 所有岗位
    'system:dept:list', // 所有部门
    'setting:dict:type:all', // 所有字典类型
    'setting:dict:data:all', // 所有字典数据
    'article:cate:all', // 所有文章分类
  ],

  publicUrl: 'http://127.0.0.1:8001',
  // 资源访问前缀
  publicPrefix: '/api/uploads',
  // 版本
  version: 'v1.0.0',

  rootPath: runPath,
};

module.exports = rsa;
