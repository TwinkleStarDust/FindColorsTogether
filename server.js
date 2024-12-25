const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 启用CORS
app.use(cors());

// 提供静态文件服务
app.use(express.static('public'));

// 存储连接的客户端
let desktopSocket = null;
let mobileSocket = null;

io.on('connection', (socket) => {
    console.log('新客户端连接:', socket.id);

    // 监听手机端就绪事件
    socket.on('mobile-ready', () => {
        console.log('手机端已就绪:', socket.id);
        mobileSocket = socket;
        
        // 如果桌面端已连接，通知桌面端手机已就绪
        if (desktopSocket) {
            desktopSocket.emit('mobile-connected');
        }
    });

    // 监听游戏开始事件
    socket.on('game-start', (data) => {
        console.log('游戏开始:', data);
        if (mobileSocket) {
            mobileSocket.emit('game-start', data);
        }
    });

    // 监听游戏结束事件
    socket.on('game-end', () => {
        console.log('游戏结束');
        if (mobileSocket) {
            mobileSocket.emit('game-end');
        }
    });

    // 监听游戏重置事件
    socket.on('game-reset', () => {
        console.log('游戏重置');
        if (mobileSocket) {
            mobileSocket.emit('game-reset');
        }
    });

    // 监听照片捕获事件
    socket.on('photo-captured', (data) => {
        console.log('收到照片数据');
        if (desktopSocket) {
            desktopSocket.emit('photo-captured', data);
        }
    });

    // 监听分数更新事件
    socket.on('score-update', (data) => {
        console.log('分数更新:', data);
        if (mobileSocket) {
            mobileSocket.emit('score-update', data);
        }
    });

    // 监听断开连接事件
    socket.on('disconnect', () => {
        console.log('客户端断开连接:', socket.id);
        if (socket === mobileSocket) {
            mobileSocket = null;
            if (desktopSocket) {
                desktopSocket.emit('mobile-disconnected');
            }
        } else if (socket === desktopSocket) {
            desktopSocket = null;
        }
    });

    // 根据页面URL判断是桌面端还是手机端
    const referer = socket.handshake.headers.referer || '';
    if (referer.includes('mobile.html')) {
        // 这是手机端
        mobileSocket = socket;
    } else {
        // 这是桌面端
        desktopSocket = socket;
        // 如果手机端已经连接，立即发送通知
        if (mobileSocket) {
            socket.emit('mobile-connected');
        }
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
}); 