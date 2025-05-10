// frontend/components/PriceChart.tsx
'use client'; // 声明为客户端组件

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Plot from 'react-plotly.js'; // react-plotly.js 提供了 Plotly.js 的 React 封装
import type { Data, Layout, Config } from 'plotly.js'; // 导入 Plotly.js 的核心类型
import { useSocket } from '@/contexts/SocketContext'; // 导入 Socket Context Hook
import { cn } from '@/lib/utils'; // 导入 cn 工具函数
import { QuoteData } from '@/app/tasks/page'; // 从 page.tsx 导入 QuoteData 类型 (或定义在共享类型文件)

const MAX_DATA_POINTS = 180; // 图表上显示的最大数据点数量 (例如，3分钟的秒级数据)

interface PriceChartProps {
    taskId: number; // 当前图表对应的任务 ID
    symbol: string; // 当前图表对应的交易标的
}

const PriceChart = React.memo(function PriceChart({ taskId, symbol }: PriceChartProps) {
    const { socket, isConnected } = useSocket(); // 从 Context 获取 socket 和连接状态

    // 使用 useMemo 缓存初始图表数据 trace 的定义，避免不必要的重计算
    const initialTrace = useMemo<Data[]>(() => [{
        x: [], // X 轴数据 (时间)
        y: [], // Y 轴数据 (价格)
        type: 'scatter', // 图表类型：散点图
        mode: 'lines',   // 连接模式：以线条连接散点
        name: '价格',    // 图例中此 trace 的名称
        line: { color: 'hsl(var(--primary))', width: 1.5 } // 线条样式，使用 CSS 变量定义颜色
    }], []);
    const [chartData, setChartData] = useState<Data[]>(initialTrace); // 存储图表数据状态

    // 使用 useMemo 缓存初始图表布局的定义
    const initialLayout = useMemo<Partial<Layout>>(() => ({
        autosize: true, // 图表自动适应容器大小
        margin: { l: 50, r: 20, t: 55, b: 40 }, // 图表边距 (左, 右, 上, 下)
        xaxis: {
            type: 'date', // X 轴数据类型为日期时间
            tickformat: '%H:%M:%S', // X 轴刻度标签显示格式 (时:分:秒)
            color: 'hsl(var(--muted-foreground))', // X 轴刻度及标题颜色
            gridcolor: 'hsl(var(--border))',       // X 轴网格线颜色
            showgrid: true,  // 是否显示 X 轴网格线
            zeroline: false, // 是否显示 X 轴的零基线 (通常对价格图无用)
            // autorange: true, // 自动调整范围，也可以手动设置范围
        },
        yaxis: {
            title: { text: '价格', font: { color: 'hsl(var(--muted-foreground))', size: 12 } }, // Y 轴标题
            color: 'hsl(var(--muted-foreground))', // Y 轴刻度及标题颜色
            gridcolor: 'hsl(var(--border))',       // Y 轴网格线颜色
            showgrid: true,  // 是否显示 Y 轴网格线
            zeroline: false, // 是否显示 Y 轴的零基线
            fixedrange: false, // false 允许用户通过滚轮或拖拽缩放/平移 Y 轴
            // autorange: true, // Y 轴也自动调整范围
        },
        plot_bgcolor: 'hsl(var(--card))',    // 绘图区域的背景色 (图表内部)
        paper_bgcolor: 'hsl(var(--card))',   // 整个图表画布的背景色 (包括边距)
        legend: { font: { color: 'hsl(var(--foreground))' }, orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center' }, // 图例配置
        datarevision: 0, // 用于 Plotly.react 性能优化，当数据变化时递增此值
    }), []);

    const [chartLayout, setChartLayout] = useState<Partial<Layout>>(() => ({
        ...initialLayout,
        title: { text: `价格走势: ${symbol}`, font: { color: 'hsl(var(--foreground))', size: 14 } } // 动态设置图表标题
    }));

    const plotRef = useRef<Plot | null>(null); // 创建对 Plotly 组件实例的引用 (可选，用于高级操作)

    // Effect Hook: 当交易标的 (symbol) 变化时，更新图表标题并重置图表数据
    useEffect(() => {
        setChartLayout(prevLayout => ({
            ...prevLayout,
            title: { ...prevLayout.title, text: `价格走势: ${symbol}` }
        }));
        setChartData(initialTrace); // 重置数据为初始状态
    }, [symbol, initialTrace]); // 依赖 symbol 和 initialTrace (initialTrace因useMemo是稳定的)

    // Effect Hook: 处理从 Socket 接收到的行情数据更新
    useEffect(() => {
        if (!socket || !isConnected || !taskId) return; // 确保 Socket 连接正常且任务 ID 有效

        const handleQuoteUpdate = (quoteData: QuoteData) => {
            // 校验数据是否属于当前任务，并且价格和时间戳有效
            if (quoteData.task_id === taskId &&
                quoteData.last_price !== null &&
                typeof quoteData.last_price !== 'undefined' &&
                quoteData.datetime) {

                const newTime = new Date(quoteData.datetime); // 将 ISO 时间字符串转换为 Date 对象
                const newPrice = parseFloat(quoteData.last_price.toString()); // 确保价格是数字

                // 更新图表数据 (函数式更新，以获取最新的 state)
                setChartData(prevChartDataArray => {
                    const currentTrace = prevChartDataArray[0]; // 假设只有一个数据系列 (trace)
                    // 追加新的时间点和价格点 (注意类型转换，Plotly.js 的 x, y 通常是数组)
                    const newX = [...(currentTrace.x as any[] || []), newTime];
                    const newY = [...(currentTrace.y as any[] || []), newPrice];

                    // 保持数据点数量在 MAX_DATA_POINTS 以内，移除最旧的数据点
                    if (newX.length > MAX_DATA_POINTS) {
                        newX.shift();
                        newY.shift();
                    }
                    return [{ ...currentTrace, x: newX, y: newY }]; // 返回包含更新后 trace 的新数组
                });
                // 增加 datarevision 值，通知 Plotly 数据已更改，触发重绘和可能的 Y 轴范围自动调整
                setChartLayout(prev => ({ ...prev, datarevision: (prev.datarevision || 0) + 1 }));
            }
        };

        socket.on('quote_update', handleQuoteUpdate); // 订阅 'quote_update' 事件
        // 清理函数：当组件卸载或依赖项变化时，取消事件订阅
        return () => { if (socket) socket.off('quote_update', handleQuoteUpdate); };
    }, [socket, isConnected, taskId]); // 依赖 Socket 状态和任务 ID

    // (可选) Effect Hook: 监听窗口大小变化以手动触发 Plotly 图表重绘
    // react-plotly.js 的 useResizeHandler={true} 通常能处理，但有时需要显式调用
    useEffect(() => {
        const handleResize = () => {
            if (plotRef.current && plotRef.current.el && typeof Plotly !== 'undefined') {
                (Plotly as any).Plots.resize(plotRef.current.el); // 手动调整图表大小
            }
        };
        window.addEventListener('resize', handleResize);
        // 清理函数：移除事件监听器
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Plotly 图表配置对象
    const plotlyConfig = useMemo<Partial<Config>>(() => ({
        responsive: true,         // 使图表响应式布局
        displayModeBar: false,    // 隐藏 Plotly 默认的模式栏 (包含下载、缩放等工具按钮)
        staticPlot: false,        // false 允许图表交互 (如缩放、平移)，true 则为静态图
        // scrollZoom: true,      // (可选) 允许通过滚轮缩放
    }), []);

    return (
        // 图表容器样式
        <div className={cn(
            "w-full h-60 md:h-72 my-3 rounded-lg border border-border overflow-hidden shadow-sm bg-card", // 使用主题颜色
            "transition-all duration-300 ease-in-out" // (可选) 添加过渡效果
        )}>
            <Plot
                ref={plotRef} // 传递 ref
                data={chartData} // 传递图表数据
                layout={chartLayout} // 传递图表布局
                config={plotlyConfig} // 传递图表配置
                useResizeHandler={true} // 让 react-plotly.js 自动处理窗口大小变化
                style={{ width: '100%', height: '100%' }} // 确保图表填满其容器
                className="w-full h-full"
            />
        </div>
    );
});
PriceChart.displayName = 'PriceChart'; // 设置组件在 React DevTools 中的显示名称
export default PriceChart;