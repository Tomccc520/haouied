declare module 'lodash' {
  // 定义throttle函数
  export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: ThrottleSettings
  ): T & { cancel(): void; flush(): void };

  // 定义ThrottleSettings接口
  export interface ThrottleSettings {
    leading?: boolean;
    trailing?: boolean;
  }

  // 其他可能需要的函数也可以在这里声明
} 