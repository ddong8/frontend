// frontend/app/tasks/page.tsx
'use client'; // 声明为客户端组件，因为包含大量交互和状态管理

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic'; // 用于动态导入组件 (如 Plotly 图表)
import { useSocket } from '@/contexts/SocketContext'; // 导入自定义的 Socket Context Hook
import { toast } from "sonner"; // 导入 Sonner Toast 通知库
import { Loader2, Play, StopCircle, AlertTriangle, PlusCircle, ListChecks, RefreshCw } from "lucide-react"; // 从 lucide-react 导入图标

// 导入 shadcn/ui 组件 (确保路径别名 @/ 正确配置)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- 类型定义 ---
// 任务状态枚举，应与后端 models.py 中的 TaskStatus 保持一致
export enum TaskStatusEnum {
    PENDING = "pending",
    RUNNING = "running",
    STOPPED = "stopped",
    ERROR = "error",
}

// 任务数据结构接口
export interface Task {
    id: number;
    name: string;
    symbol: string;
    status: TaskStatusEnum;
    created_at: string; // API 通常返回 ISO 格式的日期字符串
    updated_at?: string | null; // 可选的更新时间
}

// 创建任务时发送到后端的请求体结构
interface TaskCreatePayload {
    name: string;
    symbol: string;
}

// 从后端 Socket 推送的行情数据结构
export interface QuoteData {
    task_id: number;
    symbol: string;
    last_price: number | null; // 最新价可能为 null
    ask_price1?: number | null; // 卖一价 (可选)
    bid_price1?: number | null; // 买一价 (可选)
    volume?: number | null; // 成交量 (可选)
    datetime: string; // 行情时间戳 (ISO 格式字符串)
}

// --- 常量定义 ---
// 后端 API 基础 URL，从环境变量读取，提供默认值
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

// --- 动态导入图表组件 ---
// PriceChart 组件只在客户端渲染，并显示加载状态
const DynamicPriceChart = dynamic(() => import('@/components/PriceChart'), {
    ssr: false, // 禁止服务器端渲染此组件
    loading: () => ( // 加载图表时的占位符 UI
        <div className="flex items-center justify-center h-60 md:h-72 text-sm text-muted-foreground bg-muted/30 rounded-md animate-pulse"> {/* 使用 muted 背景和 pulse 动画 */}
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载行情图表...
        </div>
    )
});

// --- TaskForm 组件 ---
interface TaskFormProps {
    onTaskCreated: (newTask: Task) => void; // 任务创建成功后的回调函数
}

function TaskForm({ onTaskCreated }: TaskFormProps) {
    const [name, setName] = useState<string>(''); // 任务名称状态
    const [symbol, setSymbol] = useState<string>(''); // 交易标的状态
    const [formError, setFormError] = useState<string>(''); // 表单级别的错误信息状态
    const [isLoading, setIsLoading] = useState<boolean>(false); // 表单提交时的加载状态

    // 表单提交处理函数
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // 阻止表单的默认提交行为
        // 前端简单校验
        if (!name.trim() || !symbol.trim()) {
            setFormError("任务名称和交易标的均不能为空。");
            toast.error("输入校验失败", { description: "任务名称和交易标的均不能为空。" });
            return;
        }
        setFormError(''); // 清除之前的错误信息
        setIsLoading(true); // 设置为加载中

        try {
            const payload: TaskCreatePayload = { name, symbol }; // 构建请求体
            const response = await fetch(`${API_BASE_URL}/tasks`, { // 发送 POST 请求到后端 API
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) { // 检查 HTTP 响应状态码
                const errData = await response.json().catch(() => ({ detail: "无法解析错误响应。" })); // 尝试解析错误体
                throw new Error(errData.detail || `创建任务失败 (HTTP ${response.status})`);
            }

            const newTask: Task = await response.json(); // 解析成功的响应为 Task 类型
            onTaskCreated(newTask); // 调用父组件的回调函数，传递新创建的任务
            toast.success(`任务 "${newTask.name}" 已成功创建!`); // 显示成功通知
            setName(''); setSymbol(''); // 清空表单字段
        } catch (err: any) { // 捕获并处理错误
            setFormError(err.message);
            toast.error("创建任务时发生错误", { description: err.message });
        } finally {
            setIsLoading(false); // 清除加载状态
        }
    };

    return (
        <Card className="w-full max-w-lg shadow-lg border border-border/80"> {/* 添加边框和阴影 */}
            <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5 text-primary" /> {/* 图标 */}
                    创建新的交易任务
                </CardTitle>
                <CardDescription>填写任务详情以配置您的自动化交易策略。</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5"> {/* 增加垂直间距 */}
                    {formError && (
                        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md flex items-start">
                            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" /> {/* 图标 */}
                            <span>{formError}</span>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="taskName">任务名称</Label>
                        <Input
                            id="taskName"
                            placeholder="例如：铁矿石日内波动策略"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            required // HTML5 表单校验
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="taskSymbol">交易标的 (合约代码)</Label>
                        <Input
                            id="taskSymbol"
                            placeholder="例如：DCE.i2409"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            格式示例: SHFE.rb2410 (上期所螺纹钢), CZCE.MA409 (郑商所甲醇), INE.sc2403 (能源中心原油)。请注意区分大小写和交易所代码。
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? '正在创建...' : '创建任务'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// --- TaskItem 组件 ---
interface TaskItemProps {
    task: Task; // 当前任务的数据
    onTaskUpdate: (updatedTask: Task) => void; // 任务状态更新后的回调
}

const TaskItem = React.memo(function TaskItem({ task, onTaskUpdate }: TaskItemProps) {
    const { socket, isConnected, emitEvent } = useSocket(); // 使用 Socket Context
    const [isProcessing, setIsProcessing] = useState<boolean>(false); // 启动/停止操作的加载状态
    const [currentQuoteForDisplay, setCurrentQuoteForDisplay] = useState<QuoteData | null>(null); // 用于显示文本行情的当前数据

    // 处理启动/停止任务的动作
    const handleAction = useCallback(async (action: 'start' | 'stop') => {
        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/${action}`, { method: 'POST' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: "无法解析错误响应。" }));
                throw new Error(errData.detail || `操作任务失败 (HTTP ${response.status})`);
            }
            const updatedTask: Task = await response.json();
            onTaskUpdate(updatedTask); // 更新父组件中的任务列表
            toast.success(`任务 "${updatedTask.name}" 已成功${action === 'start' ? '启动' : '停止'}.`);
        } catch (err: any) {
            toast.error(`操作任务 "${task.name}" 时失败`, { description: err.message });
        } finally {
            setIsProcessing(false);
        }
    }, [task.id, task.name, onTaskUpdate]); // 依赖项确保函数引用在 props 未变时稳定

    // Effect Hook: 处理 Socket.IO 房间加入/离开及行情数据订阅
    useEffect(() => {
        if (!socket || !isConnected || !task) return; // 前置条件检查

        const handleQuoteUpdate = (data: QuoteData) => {
            if (data.task_id === task.id) { // 只处理与当前任务 ID 匹配的行情数据
                setCurrentQuoteForDisplay(data);
            }
        };

        if (task.status === TaskStatusEnum.RUNNING) { // 如果任务当前状态是运行中
            emitEvent('join_task_room', { task_id: task.id }); // 发送事件加入该任务的 Socket 房间
            socket.on('quote_update', handleQuoteUpdate); // 监听该任务的行情更新
            // 返回一个清理函数，在组件卸载或依赖项变化前执行
            return () => {
                socket.off('quote_update', handleQuoteUpdate); // 取消行情更新的监听
                emitEvent('leave_task_room', { task_id: task.id }); // 发送事件离开该任务的 Socket 房间
                setCurrentQuoteForDisplay(null); // 清理显示的行情数据
            };
        } else {
            setCurrentQuoteForDisplay(null); // 如果任务未运行，确保清理行情数据
        }
    }, [socket, isConnected, task, emitEvent]); // 依赖项

    // 根据任务状态返回 Badge 组件的变体 (样式)
    const getStatusVariant = (status: TaskStatusEnum): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case TaskStatusEnum.RUNNING: return "default"; // 例如，shadcn/ui 的 primary 颜色
            case TaskStatusEnum.STOPPED: return "secondary";
            case TaskStatusEnum.PENDING: return "outline";
            case TaskStatusEnum.ERROR: return "destructive";
            default: return "secondary";
        }
    };

    return (
        <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 border border-border/80">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-2 hover:line-clamp-none transition-all"> {/* 鼠标悬浮时显示完整标题 */}
                        {task.name}
                    </CardTitle>
                    <Badge variant={getStatusVariant(task.status)} className="capitalize whitespace-nowrap px-2.5 py-1 text-xs"> {/* 调整 Badge 样式 */}
                        {task.status === TaskStatusEnum.ERROR && <AlertTriangle className="h-3.5 w-3.5 mr-1 inline-block" />} {/* 错误状态图标 */}
                        {task.status}
                    </Badge>
                </div>
                <CardDescription className="text-xs pt-1 font-mono">{task.symbol}</CardDescription> {/* 合约代码用等宽字体 */}
            </CardHeader>

            <CardContent className="pt-0 pb-4 flex-grow space-y-3">
                {/* 文本行情显示区域 */}
                {task.status === TaskStatusEnum.RUNNING && currentQuoteForDisplay && (
                    <div className="text-xs space-y-1 border-t border-border/60 pt-3 mt-2">
                        <div className="flex justify-between">
                            <span>最新价:</span>
                            <span className="font-semibold text-primary">{currentQuoteForDisplay.last_price?.toFixed(2) ?? 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2">
                            <span>卖一: {currentQuoteForDisplay.ask_price1?.toFixed(2) ?? 'N/A'}</span>
                            <span>买一: {currentQuoteForDisplay.bid_price1?.toFixed(2) ?? 'N/A'}</span>
                        </div>
                        <p className="text-muted-foreground">
                            行情时间: {currentQuoteForDisplay.datetime ? new Date(currentQuoteForDisplay.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}
                        </p>
                    </div>
                )}

                {/* 图表显示区域 */}
                {task.status === TaskStatusEnum.RUNNING && socket && isConnected && (
                    <DynamicPriceChart taskId={task.id} symbol={task.symbol} />
                )}

                {/* 错误状态提示 */}
                {task.status === TaskStatusEnum.ERROR && (
                    <p className="text-xs text-destructive mt-2 flex items-center">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        任务执行发生错误，请检查后端日志获取详细信息。
                    </p>
                )}

                {/* 任务非运行时的占位/提示信息 */}
                {(task.status === TaskStatusEnum.PENDING || task.status === TaskStatusEnum.STOPPED) && !currentQuoteForDisplay && (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground bg-muted/40 rounded-md p-3 text-center">
                        {task.status === TaskStatusEnum.PENDING ? "任务等待启动指令..." : "任务当前已停止运行。"}
                    </div>
                )}
            </CardContent>

            <Separator className="my-0" /> {/* 卡片底部操作按钮前的分隔线 */}
            <CardFooter className="pt-3 pb-3">
                {task.status !== TaskStatusEnum.RUNNING ? (
                    <Button
                        onClick={() => handleAction('start')}
                        disabled={isProcessing || task.status === TaskStatusEnum.ERROR} // 错误状态下也禁止启动
                        size="sm"
                        className="w-full"
                    >
                        <Play className="mr-2 h-4 w-4" /> 启动任务
                    </Button>
                ) : (
                    <Button
                        onClick={() => handleAction('stop')}
                        disabled={isProcessing}
                        variant="outline" // 停止按钮用 outline 样式
                        size="sm"
                        className="w-full"
                    >
                        <StopCircle className="mr-2 h-4 w-4" /> 停止任务
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
});
TaskItem.displayName = 'TaskItem'; // React DevTools 中显示的组件名称

// --- TasksPage 主页面组件 ---
export default function TasksPage(): JSX.Element {
    const [tasks, setTasks] = useState<Task[]>([]); // 存储从 API 获取的任务列表
    const [isLoading, setIsLoading] = useState<boolean>(true); // 页面初始数据加载状态
    const [fetchError, setFetchError] = useState<string>(''); // 获取任务列表时的错误信息
    const { socket, isConnected, connectSocket } = useSocket(); // 使用 Socket Context

    // 获取任务列表的 memoized 函数
    const fetchTasks = useCallback(async (showToast: boolean = false) => {
        setIsLoading(true); setFetchError('');
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `获取任务列表失败 (HTTP ${response.status})`);
            }
            const data: Task[] = await response.json();
            setTasks(data.sort((a, b) => b.id - a.id)); // 按 ID 降序排列
            if (showToast) toast.success("任务列表已刷新。");
        } catch (err: any) {
            setFetchError(err.message);
            if (showToast) toast.error("刷新任务列表失败", { description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, []); // 空依赖数组，因为此函数不依赖外部变量来构建其逻辑

    // Effect Hook: 组件首次挂载时获取任务列表，并确保 Socket 连接
    useEffect(() => {
        fetchTasks(); // 首次加载任务
        if (socket && !isConnected && !socket.connecting) { // 如果 socket 存在但未连接且不在连接中
            connectSocket(); // 尝试连接 Socket
        }
    }, [fetchTasks, socket, isConnected, connectSocket]); // 依赖项

    // 任务创建成功后的回调函数
    const handleTaskCreated = useCallback((newTask: Task) => {
        setTasks(prevTasks => [newTask, ...prevTasks].sort((a, b) => b.id - a.id)); // 将新任务添加到列表顶部
    }, []);

    // 任务状态更新 (如启动/停止) 后的回调函数
    const handleTaskUpdate = useCallback((updatedTask: Task) => {
        setTasks(prevTasks =>
            prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t).sort((a, b) => b.id - a.id) // 更新列表中对应的任务项
        );
    }, []);

    // 页面内容渲染
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            {/* 页面头部 */}
            <header className="mb-10 text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-sky-500 to-green-500"> {/* 渐变色标题 */}
                    自动化交易任务中心
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                    高效配置、实时监控并灵活管理您的 TQSDK 量化交易策略。行情图表一目了然，任务启停一键掌控。
                </p>
            </header>

            {/* 创建任务表单区域 */}
            <section id="create-task" className="mb-12 flex justify-center">
                <TaskForm onTaskCreated={handleTaskCreated} />
            </section>

            <Separator className="my-10 bg-border/70" /> {/* 分隔线 */}

            {/* 任务仪表盘区域 */}
            <section id="task-dashboard" aria-labelledby="dashboard-title">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <h2 id="dashboard-title" className="text-2xl font-semibold flex items-center">
                        <ListChecks className="mr-3 h-6 w-6 text-primary" /> {/* 图标 */}
                        任务仪表盘
                    </h2>
                    <Button variant="outline" onClick={() => fetchTasks(true)} disabled={isLoading && tasks.length > 0}>
                        {isLoading && tasks.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        刷新列表
                    </Button>
                </div>

                {/* 加载状态 */}
                {isLoading && tasks.length === 0 && ( // 仅在初始加载且无数据显示全屏加载
                    <div className="flex items-center justify-center min-h-[300px]"> {/* 设置最小高度 */}
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                )}

                {/* 错误状态 */}
                {fetchError && !isLoading && (
                    <div className="text-center text-destructive py-6 bg-destructive/10 rounded-md border border-destructive/30">
                        <AlertTriangle className="inline h-5 w-5 mr-2" />获取任务列表时发生错误: {fetchError}
                    </div>
                )}

                {/* 无任务状态 */}
                {!fetchError && !isLoading && tasks.length === 0 && (
                    <div className="text-center text-muted-foreground py-12 bg-card border border-border/60 rounded-lg shadow-sm">
                        <ListChecks className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                        <p className="text-lg font-medium">当前没有交易任务。</p>
                        <p className="text-sm">请通过上方的表单创建您的第一个自动化交易任务。</p>
                    </div>
                )}

                {/* 任务列表 */}
                {!fetchError && tasks.length > 0 && (
                    <div className="grid gap-5 md:gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"> {/* 响应式网格布局 */}
                        {tasks.map(task => (
                            <TaskItem key={task.id} task={task} onTaskUpdate={handleTaskUpdate} />
                        ))}
                    </div>
                )}
            </section>

            {/* 页面底部 */}
            <footer className="text-center text-xs sm:text-sm text-muted-foreground mt-16 py-8 border-t border-border/40">
                智能交易终端 © {new Date().getFullYear()} | 技术栈: TQSDK, FastAPI, Next.js, TypeScript, shadcn/ui, Plotly.js
            </footer>
        </div>
    );
}