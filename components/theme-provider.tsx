// frontend/components/theme-provider.tsx
"use client" // 声明为客户端组件

import { ThemeProvider as NextThemesProvider } from "next-themes"; // 从 next-themes 导入 ThemeProvider
import { type ThemeProviderProps } from "next-themes/dist/types"; // 导入 next-themes 的 Props 类型

// ThemeProvider 组件，封装了 NextThemesProvider
// 它接收与 NextThemesProvider 相同的 props
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}