// frontend/components/theme-toggle.tsx
"use client" // 声明为客户端组件

import { Moon, Sun } from "lucide-react"; // 从 lucide-react 导入图标
import { useTheme } from "next-themes"; // 从 next-themes 导入 useTheme hook

import { Button } from "@/components/ui/button"; // 导入 shadcn/ui 的 Button 组件
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // 导入 shadcn/ui 的 DropdownMenu 组件

// ThemeToggle 组件定义
export function ThemeToggle() {
    const { setTheme } = useTheme(); // 使用 useTheme hook 获取设置主题的函数

    return (
        <DropdownMenu>
            {/* DropdownMenuTrigger 作为触发器，包裹一个 Button 组件 */}
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="切换主题"> {/* 无障碍标签 */}
                    {/* 太阳图标，在亮色模式下显示 */}
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    {/* 月亮图标，在暗色模式下显示 */}
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">切换主题</span> {/* 屏幕阅读器文本 */}
                </Button>
            </DropdownMenuTrigger>
            {/* DropdownMenuContent 是下拉菜单的内容部分 */}
            <DropdownMenuContent align="end"> {/* align="end" 使菜单右对齐 */}
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    明亮模式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    暗黑模式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    跟随系统
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}