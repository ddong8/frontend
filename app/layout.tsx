// 正确或更安全的示例
// frontend/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster as SonnerToaster } from "@/components/ui/sonner"; // 假设你使用 sonner
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: '智能交易终端',
    template: '%s | 智能交易终端',
  },
  description: '基于 TQSDK, FastAPI, Next.js 和 TypeScript 构建的先进量化交易监控平台。',
  // ... 其他 metadata
};

export const viewport: Viewport = {
  // ... viewport 配置
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // 确保 <html> 标签和它的直接子元素 <head> 和 <body> 之间没有多余的空格或文本
    // 属性换行是没问题的，但标签之间的直接文本或大量空格不行
    <html lang="zh-CN" suppressHydrationWarning>
      {/* 
        注意：<head /> 标签是 Next.js App Router 提供的特殊组件，它会自动处理 head 内容的填充。
        你不需要手动创建 <meta>, <title> (除非特定情况) 等标签在这里，
        因为 `metadata` 对象会负责生成它们。
        确保这里没有其他内容。
      */}
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased selection:bg-primary/20",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
              <div className="container flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-6">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                  <span className="font-bold text-xl tracking-tight">🚀 智能交易终端</span>
                </Link>
                <nav className="flex items-center space-x-4">
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
            <SonnerToaster richColors closeButton position="bottom-right" theme="system" />
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}