let socket;
let targetColor;
let gameStarted = false;
let countdown = 15;
let score = 0;
let countdownInterval;
let soundManager;
let lastTickTime = 0;
let tickSound = null;
let gameEnded = false;
let currentScore = 0;
let totalScore = 0;
let gameCount = 0;
let highestScore = 0;
let scoreHistory = [];
let consecutiveHighScores = 0;

function setup() {
    // 获取容器元素
    const container = document.getElementById('camera-preview');
    
    // 获取容器的实际大小和位置
    const containerRect = container.getBoundingClientRect();
    console.log('Container size:', containerRect.width, containerRect.height);
    
    // 创建画布并设置大小
    const canvas = createCanvas(containerRect.width, containerRect.height);
    canvas.parent('camera-preview');
    
    // 设置画布样式以匹配容器
    const canvasElement = document.querySelector('#camera-preview canvas');
    if (canvasElement) {
        canvasElement.style.borderRadius = '20px';  // 匹配容器的圆角
        canvasElement.style.width = '100%';
        canvasElement.style.height = '100%';
        canvasElement.style.position = 'absolute';
        canvasElement.style.top = '0';
        canvasElement.style.left = '0';
    }
    
    // 设置画布背景为透明
    clear();
    background(0);
    
    // 初始化音效管理器
    soundManager = new SoundManager();
    
    // 初始化Socket.io连接
    initSocketConnection();
    
    // 设置按钮事件
    setupButtons();
    
    // 从本地存储加载游戏数据
    loadGameData();
    updateLeaderboard();
    
    // 监听窗口大小变化
    window.addEventListener('resize', windowResized);
}

// 处理窗口大小变化
function windowResized() {
    const container = document.getElementById('camera-preview');
    const containerRect = container.getBoundingClientRect();
    resizeCanvas(containerRect.width, containerRect.height);
}

function draw() {
    // 使用半透明黑色背景
    background(0, 25);
    // 更新和显示烟花
    updateFireworks();
}

function initSocketConnection() {
    socket = io(window.location.origin);
    
    socket.on('connect', () => {
        console.log('已连接到服务器');
        document.getElementById('game-status').textContent = '等待手机端连接...';
        document.getElementById('start-game').disabled = true;
    });
    
    socket.on('mobile-connected', () => {
        console.log('收到手机端已连接的通知');
        document.getElementById('game-status').textContent = '手机端已连接，可以开始游戏';
        document.getElementById('start-game').disabled = false;
    });
    
    socket.on('mobile-disconnected', () => {
        console.log('手机端断开连接');
        document.getElementById('game-status').textContent = '手机端已断开连接，请等待重新连接...';
        document.getElementById('start-game').disabled = true;
        if (gameStarted) {
            endGame();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('与服务器断开连接');
        document.getElementById('game-status').textContent = '与服务器断开连接，请刷新页面...';
        document.getElementById('start-game').disabled = true;
        if (gameStarted) {
            endGame();
        }
    });
    
    socket.on('photo-captured', (data) => {
        console.log('收到手机端拍照数据');
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
        document.getElementById('game-status').textContent = '等待连接服务器...';
        return;
    }
    
    gameStarted = true;
    gameEnded = false;
    score = 0;
    countdown = 15;
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
    
    // 启动倒计时（会自动播放滴答声）
    startCountdown();
    
    // 发送游戏开始信号到手机端
    socket.emit('game-start', { targetColor });
    
    // 更新按钮状态
    document.getElementById('start-game').disabled = true;
    document.getElementById('reset-game').disabled = false;
    document.getElementById('game-status').textContent = '游戏开始！请用手机拍摄相似颜色的物体...';
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
    if (!gameStarted) return;
    
    // 停止倒计时和音效
    stopCountdown();
    
    gameStarted = false;
    gameEnded = true;
    
    // 更新游戏统计
    gameCount++;
    totalScore += score;
    if (score > highestScore) {
        highestScore = score;
    }
    
    // 添加新的得分记录
    scoreHistory.push({
        score: score,
        time: new Date().getTime()
    });
    
    // 保存数据并更新显示
    saveGameData();
    updateLeaderboard();
    
    // 显示最终得分
    document.getElementById('game-status').textContent = `游戏结束！最终得分：${score}`;
    
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
    gameEnded = false;
    currentScore = 0;
    document.getElementById('current-score').textContent = currentScore;
    countdown = 15;
    score = 0;
    updateUI();
    
    // 清空消息和目标颜色
    document.getElementById('game-status').textContent = '准备开始新游戏...';
    document.getElementById('target-color').style.backgroundColor = '';
    
    // 发送置信号到手机端
    socket.emit('game-reset');
    
    // 更新按钮状态
    document.getElementById('start-game').disabled = false;
    document.getElementById('reset-game').disabled = true;
    consecutiveHighScores = 0;
}

function handlePhotoCapture(data) {
    if (!gameStarted || gameEnded) return;
    
    // 播放拍照音效
    soundManager.playCapture();
    
    // ���析颜色并计算得分
    const capturedColor = data.color;
    const similarity = calculateColorSimilarity(targetColor, capturedColor);
    const points = Math.floor(similarity * 100);
    
    // 更新得分
    score = points;
    
    // 显示分数动画
    showScore(points);
    
    // 如果得分很高，播放成功音效并显示烟花
    if (points > 80) {
        soundManager.playSuccess();
        
        // 发射新的烟花，固定在画布中心
        const color = `rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 1)`;
        startFireworks(width/2, height/1.2, color);
    } else {
        soundManager.playGameOver();
    }
    
    // 更新UI并发送得分到手机端
    updateUI();
    socket.emit('score-update', { score: points, totalScore: score });
    
    // 更新游戏消息
    let message = '';
    if (points > 90) {
        message = `太棒了！颜色非常接近！得分：${points}`;
    } else if (points > 80) {
        message = `很好！颜色很接近！得分：${points}`;
    } else if (points > 60) {
        message = `还不错，但还可以找到更相似的颜色。得分：${points}`;
    } else {
        message = `颜色相似度较低，再接再厉！得分：${points}`;
    }
    document.getElementById('game-status').textContent = message;
    
    // 拍照后结束游戏
    endGame();
}

function calculateColorSimilarity(color1, color2) {
    const rDiff = Math.abs(color1.r - color2.r);
    const gDiff = Math.abs(color1.g - color2.g);
    const bDiff = Math.abs(color1.b - color2.b);
    
    // 计算颜色差异的百分比（0-1间）
    const maxDiff = 255 * 3;
    const actualDiff = rDiff + gDiff + bDiff;
    return 1 - (actualDiff / maxDiff);
}

function updateUI() {
    document.getElementById('timer').textContent = `剩余时间: ${countdown}秒`;
    document.getElementById('score').textContent = `得分: ${score}`;
    document.getElementById('current-score').textContent = score;  // 更新当前得分显示
}

// 保存游戏数据到本地存储
function saveGameData() {
    const gameData = {
        totalScore,
        gameCount,
        highestScore,
        scoreHistory
    };
    localStorage.setItem('colorGameData', JSON.stringify(gameData));
}

// 从本地存储加载游戏数据
function loadGameData() {
    const savedData = localStorage.getItem('colorGameData');
    if (savedData) {
        const data = JSON.parse(savedData);
        totalScore = data.totalScore || 0;
        gameCount = data.gameCount || 0;
        highestScore = data.highestScore || 0;
        scoreHistory = data.scoreHistory || [];
    }
}

// 更新排行榜显示
function updateLeaderboard() {
    document.getElementById('total-score').textContent = totalScore;
    document.getElementById('game-count').textContent = gameCount;
    document.getElementById('average-score').textContent = 
        gameCount > 0 ? Math.round(totalScore / gameCount) : 0;
    document.getElementById('highest-score').textContent = highestScore;
    
    // 更新历史记录
    const scoreList = document.getElementById('score-history');
    scoreList.innerHTML = '';
    
    // 显示最近的10条记录
    scoreHistory.slice(-10).reverse().forEach(record => {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
            <span class="score">得分：${record.score}</span>
            <span class="time">${new Date(record.time).toLocaleString()}</span>
        `;
        scoreList.appendChild(item);
    });
}

// 更新得分
function updateScore(points) {
    if (gameStarted && !gameEnded) {
        currentScore = Math.min(100, currentScore + points);
        document.getElementById('current-score').textContent = currentScore;
        
        if (currentScore >= 100) {
            endGame();
        }
    }
}

function analyzeFrame(imageData) {
    const centerX = Math.floor(imageData.width / 2);
    const centerY = Math.floor(imageData.height / 2);
    const centerPixel = getPixelColor(imageData, centerX, centerY);
    const targetColor = getCurrentTargetColor();
    const colorDifference = calculateColorDifference(centerPixel, targetColor);
    const score = calculateScore(colorDifference);
    
    if (score > 80) {
        // 在得分位置显示烟花
        const x = width / 2;
        const y = height / 2;
        const color = `rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 1)`;
        startFireworks(x, y, color);
    }
    
    return score;
} 