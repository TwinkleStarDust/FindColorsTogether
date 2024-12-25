let socket;
let targetColor;
let gameStarted = false;
let countdown = 15;
let score = 0;
let countdownInterval;
let soundManager;
let lastTickTime = 0;
let tickSound = null;

function setup() {
    const container = document.getElementById('camera-feed');
    const canvas = createCanvas(container.offsetWidth, container.offsetWidth * 9/16);
    canvas.parent('camera-feed');
    
    // 初始化音效管理器
    soundManager = new SoundManager();
    
    // 初始化Socket.io连接
    initSocketConnection();
    
    // 设置按钮事件
    setupButtons();
}

function draw() {
    background(220);
    if (gameStarted) {
        // 更新和显示烟花
        updateFireworks();
    }
}

function initSocketConnection() {
    socket = io(window.location.origin);
    
    socket.on('connect', () => {
        console.log('已连接到服务器');
        document.getElementById('game-message').textContent = '等待手机端连接...';
        document.getElementById('start-game').disabled = true;
    });
    
    socket.on('mobile-connected', () => {
        document.getElementById('game-message').textContent = '手机端已连接，可以开始游戏';
        document.getElementById('start-game').disabled = false;
    });
    
    socket.on('photo-captured', (data) => {
        handlePhotoCapture(data);
    });
}

function setupButtons() {
    const startButton = document.getElementById('start-game');
    const resetButton = document.getElementById('reset-game');
    
    startButton.onclick = startGame;
    resetButton.onclick = resetGame;
    
    // 初始禁用重置按钮
    resetButton.disabled = true;
}

function startGame() {
    if (!socket.connected) {
        document.getElementById('game-message').textContent = '等待连接服务器...';
        return;
    }
    
    gameStarted = true;
    countdown = 15;
    score = 0;
    updateUI();
    
    // 生成随机目标颜色
    targetColor = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256)
    };
    
    // 更新目标颜色显示
    const targetColorDiv = document.getElementById('target-color');
    targetColorDiv.style.backgroundColor = `rgb(${targetColor.r},${targetColor.g},${targetColor.b})`;
    
    // 开始倒计时
    startCountdown();
    
    // 发送游戏开始信号到手机端
    socket.emit('game-start', { targetColor });
    
    // 更新按钮状态
    document.getElementById('start-game').disabled = true;
    document.getElementById('reset-game').disabled = false;
    document.getElementById('game-message').textContent = '游戏开始！请用手机寻找相似颜色的物体...';
}

function startCountdown() {
    // 清除之前的计时器和音效
    stopCountdown();
    
    // 播放第一次滴答声
    playTickSound();
    
    countdownInterval = setInterval(() => {
        countdown--;
        updateUI();
        
        if (countdown > 0) {
            playTickSound();
        }
        
        if (countdown <= 0) {
            endGame();
        }
    }, 1000);
}

function playTickSound() {
    // 确保距离上次播放至少有900毫秒
    const now = Date.now();
    if (now - lastTickTime >= 900) {
        if (tickSound) {
            tickSound.pause();
            tickSound.currentTime = 0;
        }
        tickSound = soundManager.sounds.tick.cloneNode();
        tickSound.volume = 0.3;
        tickSound.play().catch(e => console.log('播放音效失败:', e));
        lastTickTime = now;
    }
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (tickSound) {
        tickSound.pause();
        tickSound.currentTime = 0;
        tickSound = null;
    }
    lastTickTime = 0;
}

function endGame() {
    // 停止倒计时和音效
    stopCountdown();
    
    gameStarted = false;
    
    // 播放游戏结束音效
    soundManager.playGameOver();
    
    // 显示最终得分
    document.getElementById('game-message').textContent = `游戏结束！最终得分：${score}`;
    
    // 发送游戏结束信号到手机端
    socket.emit('game-end');
    
    // 更新按钮状态
    document.getElementById('start-game').disabled = false;
    document.getElementById('reset-game').disabled = true;
}

function resetGame() {
    // 停止倒计时和音效
    stopCountdown();
    
    gameStarted = false;
    countdown = 15;
    score = 0;
    updateUI();
    
    // 清空消息和目标颜色
    document.getElementById('game-message').textContent = '准备开始新游戏...';
    document.getElementById('target-color').style.backgroundColor = '';
    
    // 发送重置信号到手机端
    socket.emit('game-reset');
    
    // 更新按钮状态
    document.getElementById('start-game').disabled = false;
    document.getElementById('reset-game').disabled = true;
}

function handlePhotoCapture(data) {
    if (!gameStarted) return;
    
    // 播放拍照音效
    soundManager.playCapture();
    
    // 分析颜色并计算得分
    const capturedColor = data.color;
    const similarity = calculateColorSimilarity(targetColor, capturedColor);
    const points = Math.floor(similarity * 100);
    
    // 更新得分
    score += points;
    
    // 如果得分很高，播放成功音效并显示烟花
    if (points > 80) {
        soundManager.playSuccess();
        startFireworks(targetColor);
    }
    
    // 更新UI
    updateUI();
    
    // 发送得分到手机端
    socket.emit('score-update', { score: points, totalScore: score });
    
    // 更新游戏消息
    let message = '';
    if (points > 90) {
        message = '太棒了！颜色非常接近！';
    } else if (points > 80) {
        message = '很好！颜色很接近！';
    } else if (points > 60) {
        message = '还不错，继续尝试找更相似的颜色';
    } else {
        message = '颜色相似度较低，请继续寻找';
    }
    document.getElementById('game-message').textContent = message;
}

function calculateColorSimilarity(color1, color2) {
    const rDiff = Math.abs(color1.r - color2.r);
    const gDiff = Math.abs(color1.g - color2.g);
    const bDiff = Math.abs(color1.b - color2.b);
    
    // 计算颜色差异的百分比（0-1之间）
    const maxDiff = 255 * 3;
    const actualDiff = rDiff + gDiff + bDiff;
    return 1 - (actualDiff / maxDiff);
}

function updateUI() {
    document.getElementById('timer').textContent = `剩余时间: ${countdown}秒`;
    document.getElementById('score').textContent = `得分: ${score}`;
} 