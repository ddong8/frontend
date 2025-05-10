// frontend/contexts/SocketContext.tsx
'use client'; // 声明为客户端组件

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client'; // 导入 Socket.IO 客户端和 Socket 类型

// 从环境变量获取 Socket 服务器 URL，提供一个默认值
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:8000";

// 定义 Socket Context 的类型接口
interface SocketContextType {
    socket: Socket | null; // Socket.IO 客户端实例，初始可能为 null
    isConnected: boolean; // 表示当前是否已连接到服务器
    connectSocket: () => void; // 手动连接 Socket 的函数
    disconnectSocket: () => void; // 手动断开 Socket 的函数
    emitEvent: <T = any>(eventName: string, data?: T, ackCallback?: (response: any) => void) => void; // 发送 Socket 事件的函数
}

// 创建 Socket Context，初始值为 null
const SocketContext = createContext<SocketContextType | null>(null);

// 自定义 Hook，用于在组件中方便地访问 Socket Context
export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) { // 如果在 SocketProvider 外部调用此 Hook，则抛出错误
        throw new Error('useSocket 必须在 SocketProvider 组件内部使用');
    }
    return context;
};

// SocketProvider 组件的 Props 类型接口
interface SocketProviderProps {
    children: ReactNode; // 子组件，必须是 ReactNode 类型
}

// SocketProvider 组件：提供 Socket 实例和相关操作给其子组件树
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null); // 存储 Socket 实例的状态
    const [isConnected, setIsConnected] = useState<boolean>(false); // 存储连接状态的状态

    // useEffect Hook：在组件首次挂载时初始化 Socket 连接
    useEffect(() => {
        console.info(`[SocketContext] 正在初始化 Socket 连接，目标服务器: ${SOCKET_SERVER_URL}`);
        const newSocketInstance: Socket = io(SOCKET_SERVER_URL, {
            path: "/ws/socket.io",          // 后端 Socket.IO 服务的挂载路径
            transports: ['websocket'],      // 优先使用 WebSocket 传输
            autoConnect: false,             // 不在实例创建时自动连接
            reconnectionAttempts: 5,        // 自动重连尝试次数
            reconnectionDelay: 3000,        // 每次重连之间的延迟（毫秒）
        });
        setSocket(newSocketInstance); // 将创建的 Socket 实例存入 state

        // --- 定义 Socket 事件的回调函数 ---
        const handleConnect = () => {
            console.log('[SocketContext] Socket 已成功连接, SID:', newSocketInstance.id);
            setIsConnected(true);
        };
        const handleDisconnect = (reason: Socket.DisconnectReason) => {
            console.warn('[SocketContext] Socket 已断开连接, 原因:', reason);
            setIsConnected(false);
            // 如果是服务器主动断开连接，可以根据需要决定是否自动重连
            // if (reason === "io server disconnect") { newSocketInstance.connect(); }
        };
        const handleConnectError = (error: Error) => {
            console.error('[SocketContext] Socket 连接时发生错误:', error.message);
            setIsConnected(false);
        };
        const handleReconnectAttempt = (attempt: number) => {
            console.info(`[SocketContext] Socket 正在尝试第 ${attempt} 次重连...`);
        };
        const handleReconnectFailed = () => {
            console.error('[SocketContext] Socket 所有重连尝试均失败。');
        };

        // --- 为 Socket 实例绑定事件监听器 ---
        newSocketInstance.on('connect', handleConnect);
        newSocketInstance.on('disconnect', handleDisconnect);
        newSocketInstance.on('connect_error', handleConnectError);
        newSocketInstance.on('reconnect_attempt', handleReconnectAttempt);
        newSocketInstance.on('reconnect_failed', handleReconnectFailed);

        // --- 组件卸载时的清理函数 ---
        return () => {
            console.info("[SocketContext] 正在清理 Socket 连接资源...");
            // 移除所有绑定的事件监听器，防止内存泄漏
            newSocketInstance.off('connect', handleConnect);
            newSocketInstance.off('disconnect', handleDisconnect);
            newSocketInstance.off('connect_error', handleConnectError);
            newSocketInstance.off('reconnect_attempt', handleReconnectAttempt);
            newSocketInstance.off('reconnect_failed', handleReconnectFailed);
            if (newSocketInstance.connected) { // 如果 Socket 仍然连接，则主动断开
                newSocketInstance.disconnect();
            }
        };
    }, []); // 空依赖数组表示此 effect 只在组件挂载和卸载时运行一次

    // --- Context 提供的方法 ---
    // 手动连接 Socket
    const connectSocket = useCallback(() => {
        if (socket && !socket.connected && !socket.connecting) { // 检查 Socket 实例是否存在且未连接也未在连接中
            console.info("[SocketContext] 正在尝试手动连接 Socket...");
            socket.connect();
        }
    }, [socket]);

    // 手动断开 Socket
    const disconnectSocket = useCallback(() => {
        if (socket && socket.connected) { // 检查 Socket 实例是否存在且已连接
            console.info("[SocketContext] 正在尝试手动断开 Socket...");
            socket.disconnect();
        }
    }, [socket]);

    // 发送 Socket 事件 (使用泛型 T 增强类型安全性)
    const emitEvent = useCallback(<T = any>(
        eventName: string,
        data?: T,
        ackCallback?: (response: any) => void
    ) => {
        if (socket && socket.connected) { // 确保 Socket 存在且已连接
            socket.emit(eventName, data, ackCallback);
        } else {
            console.warn(`[SocketContext] Socket 未连接，无法发送事件: ${eventName}`);
        }
    }, [socket, isConnected]); // 依赖 socket 和 isConnected 状态

    // Context Provider 提供的值
    const contextValue: SocketContextType = { socket, isConnected, connectSocket, disconnectSocket, emitEvent };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};