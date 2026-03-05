// 全局类型声明

// 声明lodash模块
declare module 'lodash/throttle' {
  interface ThrottleSettings {
    leading?: boolean;
    trailing?: boolean;
  }

  function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: ThrottleSettings
  ): T & { cancel(): void; flush(): void };

  export = throttle;
}

// 声明rc-virtual-list模块
declare module 'rc-virtual-list' {
  import React from 'react';
  
  interface VirtualListProps {
    data: any[];
    height: number;
    itemHeight: number;
    itemKey: string;
    children: (item: any, index: number) => React.ReactNode;
  }
  
  const VirtualList: React.FC<VirtualListProps>;
  
  export default VirtualList;
} 