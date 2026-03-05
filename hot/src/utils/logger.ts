/**
 * @file logger.ts
 * @description 日志工具
 */

const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // 即使在生产环境，严重错误可能也需要保留，或者发送到监控系统
    // 这里遵循用户要求，在生产环境不输出到控制台
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  }
};

export default logger; 