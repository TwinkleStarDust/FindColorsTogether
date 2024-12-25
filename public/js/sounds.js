class SoundManager {
    constructor() {
        this.sounds = {};
        this.loadSounds();
    }

    loadSounds() {
        // 加载音效
        this.sounds.tick = new Audio('sounds/tick.mp3');
        this.sounds.capture = new Audio('sounds/capture.mp3');
        this.sounds.success = new Audio('sounds/success.mp3');
        this.sounds.gameOver = new Audio('sounds/game-over.mp3');

        // 设置音量
        this.sounds.tick.volume = 0.3;
        this.sounds.capture.volume = 0.5;
        this.sounds.success.volume = 0.5;
        this.sounds.gameOver.volume = 0.5;

        // 允许重复播放
        this.sounds.tick.preservesPitch = false;
    }

    playTick() {
        // 克隆节点以允许重叠播放
        const tickSound = this.sounds.tick.cloneNode();
        tickSound.volume = 0.3;
        tickSound.play().catch(e => console.log('播放音效失败:', e));
    }

    playCapture() {
        this.sounds.capture.currentTime = 0;
        this.sounds.capture.play().catch(e => console.log('播放音效失败:', e));
    }

    playSuccess() {
        this.sounds.success.currentTime = 0;
        this.sounds.success.play().catch(e => console.log('播放音效失败:', e));
    }

    playGameOver() {
        this.sounds.gameOver.currentTime = 0;
        this.sounds.gameOver.play().catch(e => console.log('播放音效失败:', e));
    }
} 