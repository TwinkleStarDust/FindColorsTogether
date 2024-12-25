let socket;
let video;
let canvas;
let isPlaying = false;
let targetColor = null;
let soundManager;

function setup() {
    // 创建画布并设置大小
    const container = document.getElementById('camera-preview');
    canvas = createCanvas(container.offsetWidth, container.offsetWidth * 9/16);
    canvas.parent('camera-preview');
    
    // 初始化音效管理器
    soundManager = new SoundManager();
    
    // 初始化摄像头
    initCamera();
    
    // 初始化Socket.io连接
    initSocketConnection();
    
    // 设置拍照按钮事件
    setupCaptureButton();
}

function draw() {
    // 绘制摄像头画面
    if (video && video.loadedmetadata) {
        // 计算视频显示尺寸
        const videoRatio = video.width / video.height;
        const canvasRatio = width / height;
        let drawWidth, drawHeight, x, y;
        
        if (videoRatio > canvasRatio) {
            drawHeight = height;
            drawWidth = video.width * (drawHeight / video.height);
            x = (width - drawWidth) / 2;
            y = 0;
        } else {
            drawWidth = width;
            drawHeight = video.height * (drawWidth / video.width);
            x = 0;
            y = (height - drawHeight) / 2;
        }
        
        // 绘制视频
        image(video, x, y, drawWidth, drawHeight);
        
        // 如果游戏正在进行，绘制目标颜色提示
        if (isPlaying && targetColor) {
            // 绘制准心
            push();
            stroke(255, 0, 0);
            strokeWeight(2);
            noFill();
            const centerX = width / 2;
            const centerY = height / 2;
            const crossSize = 20;
            
            // 十字准心
            line(centerX - crossSize/2, centerY, centerX + crossSize/2, centerY);
            line(centerX, centerY - crossSize/2, centerX, centerY + crossSize/2);
            
            // 圆形准心
            circle(centerX, centerY, crossSize);
            pop();
        }
    }
}

function initCamera() {
    // 检查浏览器是否支持getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('您的浏览器不支持摄像头访问，请使用最新版本的Chrome或Firefox浏览器。');
        return;
    }
    
    // 配置摄像头
    const constraints = {
        video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };
    
    // 请求摄像头权限
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video = createVideo();
            video.elt.srcObject = stream;
            video.elt.play();
            video.hide();
            
            // 更新UI状态
            document.getElementById('camera-status').textContent = '摄像头已就绪';
            document.getElementById('capture-photo').disabled = false;
            
            // 摄像头就绪后，通知服务器
            if (socket && socket.connected) {
                socket.emit('mobile-ready');
            }
        })
        .catch(error => {
            console.error('摄像头访问错误:', error);
            showError('无法访问摄像头，请确保已授予摄像头访问权限。');
        });
}

function initSocketConnection() {
    socket = io(window.location.origin);
    
    socket.on('connect', () => {
        console.log('已连接到服务器');
        // 如果摄像头已经就绪，通知服务器
        if (video && video.loadedmetadata) {
            socket.emit('mobile-ready');
        }
    });
    
    socket.on('game-start', data => {
        console.log('收到游戏开始信号:', data);
        isPlaying = true;
        targetColor = data.targetColor;
        // 更新UI显示目标颜色
        document.getElementById('target-color').style.backgroundColor = 
            `rgb(${targetColor.r},${targetColor.g},${targetColor.b})`;
        document.getElementById('game-status').textContent = '游戏进行中 - 寻找相似颜色的物体';
        document.getElementById('capture-photo').disabled = false;
    });
    
    socket.on('game-end', () => {
        isPlaying = false;
        targetColor = null;
        document.getElementById('game-status').textContent = '游戏结束';
        document.getElementById('capture-photo').disabled = true;
        document.getElementById('target-color').style.backgroundColor = '';
    });
    
    socket.on('game-reset', () => {
        isPlaying = false;
        targetColor = null;
        document.getElementById('game-status').textContent = '等待游戏开始';
        document.getElementById('capture-photo').disabled = true;
        document.getElementById('target-color').style.backgroundColor = '';
    });
    
    socket.on('score-update', data => {
        // 播放得分反馈音效
        if (data.score > 80) {
            soundManager.playSuccess();
        }
        document.getElementById('game-status').textContent = 
            `得分：${data.score}分 - 总分：${data.totalScore}分`;
    });
}

function setupCaptureButton() {
    const captureButton = document.getElementById('capture-photo');
    captureButton.onclick = () => {
        if (!isPlaying || !video) return;
        
        // 播放拍照音效
        soundManager.playCapture();
        
        // 获取视频中心点的颜色
        const centerX = video.width / 2;
        const centerY = video.height / 2;
        const centerColor = getColorAtPoint(centerX, centerY);
        
        // 发送颜色数据到服务器
        socket.emit('photo-captured', { color: centerColor });
    };
}

function getColorAtPoint(x, y) {
    // 创建临时画布来获取颜色
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = video.width;
    tempCanvas.height = video.height;
    tempCtx.drawImage(video.elt, 0, 0);
    
    // 获取指定点的颜色
    const pixel = tempCtx.getImageData(x, y, 1, 1).data;
    return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2]
    };
}

function showError(message) {
    const status = document.getElementById('camera-status');
    status.textContent = message;
    status.style.color = '#f44336';
} 