class Firework {
    constructor(x, y, targetX, targetY, color, size = 30, pattern = 0, particleCount = 40, customGravity = null) {
        this.pos = createVector(x, y);
        this.target = createVector(targetX, targetY);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.particles = [];
        this.exploded = false;
        this.justExploded = false;
        this.hasUpdatedBackground = false;
        this.reachedPeak = false;
        
        // 简化轨迹
        this.prevPos = createVector(x, y);
        
        // 计算发射速度
        const angle = atan2(targetY - y, targetX - x);
        const speed = map(dist(x, y, targetX, targetY), 0, height, 8, 16);
        this.vel = p5.Vector.fromAngle(angle).mult(speed);
        
        this.color = color;
        this.size = size;
        this.pattern = pattern;
        this.particleCount = particleCount;
        this.customGravity = customGravity;
    }

    update() {
        if (!this.exploded) {
            this.prevPos.set(this.pos.x, this.pos.y);
            this.acc.add(createVector(0, 0.2));
            this.vel.add(this.acc);
            this.pos.add(this.vel);
            this.acc.mult(0);

            if (this.vel.y >= 0 && !this.reachedPeak) {
                this.reachedPeak = true;
                this.explode();
                this.justExploded = true;
            }
        } else {
            this.particles = this.particles.filter(p => p.update());
            
            if (this.justExploded) {
                this.justExploded = false;
            }
        }
        return !this.done();
    }

    explode() {
        this.particles = this.createParticles(
            this.pos.x,
            this.pos.y,
            this.color,
            this.size,
            1,
            this.customGravity
        );
        this.exploded = true;
    }

    createParticles(x, y, color, size, level, customGravity) {
        const particles = [];
        const baseCount = this.particleCount * 2;
        const angleStep = TWO_PI / baseCount;
        
        // 添加中心密集粒子
        const centerParticleCount = floor(baseCount * 0.3);  // 中心区域的粒子数量
        for (let i = 0; i < centerParticleCount; i++) {
            const angle = random(TWO_PI);
            const radius = random(size * 0.1, size * 0.3);  // 较小的半径范围
            const p = new Particle(x, y, color, size, level, customGravity);
            const baseSpeed = random(1, 2);  // 中心粒子速度较小
            p.vel = p5.Vector.fromAngle(angle).mult(radius * baseSpeed * 0.1);
            particles.push(p);
        }
        
        // 主要爆炸粒子
        for (let i = 0; i < baseCount; i++) {
            let angle;
            let radius = size;
            let speedMultiplier = 1;
            
            switch(this.pattern) {
                case 0: // 圆形
                    angle = i * angleStep + random(-0.1, 0.1);  // 添加角度随机性
                    radius = random(size * 0.8, size * 1.4);  // 增加半径随机性
                    speedMultiplier = random(0.8, 1.2);
                    break;
                    
                case 1: // 双圆
                    angle = i * angleStep;
                    radius = i % 2 === 0 ? size * 1.5 : size * 0.8;
                    speedMultiplier = i % 2 === 0 ? random(1.1, 1.3) : random(0.7, 0.9);
                    break;
                    
                case 2: // 螺旋
                    angle = i * angleStep * 2;
                    radius = size * (1 + i / baseCount);
                    speedMultiplier = map(i, 0, baseCount, 0.7, 1.3);
                    break;
                    
                case 3: // 心形
                    angle = i * angleStep;
                    const t = angle;
                    const x = 16 * pow(sin(t), 3);  // x坐标保持不变
                    const y = -(13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t));  // 添加负号翻转y坐标
                    radius = size * 0.8;
                    angle = atan2(y, x);  // 使用翻转后的坐标计算角度
                    speedMultiplier = map(dist(0, 0, x, y), 0, 16, 0.8, 1.2);
                    break;
                    
                default:
                    angle = i * angleStep + random(-0.1, 0.1);
                    radius = random(size * 0.8, size * 1.2);
                    speedMultiplier = random(0.8, 1.2);
            }
            
            const p = new Particle(x, y, color, size, level, customGravity);
            
            // 计算基础速度，使用二次函数分布
            const distanceRatio = i / baseCount;
            const baseSpeed = random(2, 3) * (1 - pow(distanceRatio - 0.5, 2) * 0.5);
            const velocityVector = p5.Vector.fromAngle(angle);
            
            // 添加径向扩散变化
            const radialSpeed = baseSpeed * speedMultiplier;
            velocityVector.mult(radialSpeed);
            
            // 添加切向速度分量
            const tangentialSpeed = random(-0.3, 0.3);  // 减小切向速度
            const tangentialVector = velocityVector.copy().rotate(PI/2).normalize().mult(tangentialSpeed);
            velocityVector.add(tangentialVector);
            
            // 设置最终速度
            p.vel = velocityVector.mult(radius * 0.08);
            
            // 随���调整粒子大小
            p.size *= random(0.8, 1.2);
            
            particles.push(p);
        }
        
        // 添加一些小型拖尾粒子
        const trailParticleCount = floor(baseCount * 0.2);
        for (let i = 0; i < trailParticleCount; i++) {
            const angle = random(TWO_PI);
            const radius = random(size * 0.4, size * 0.6);
            const p = new Particle(x, y, color, size * 0.5, level, customGravity);  // 较小的粒子
            const baseSpeed = random(0.5, 1.5);
            p.vel = p5.Vector.fromAngle(angle).mult(radius * baseSpeed * 0.1);
            p.decay *= 1.5;  // 更快的衰减
            particles.push(p);
        }
        
        return particles;
    }

    show() {
        if (!this.exploded) {
            stroke(255);
            strokeWeight(4);
            line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);
        }
        this.particles.forEach(p => p.show());
    }

    done() {
        return this.exploded && this.particles.length === 0;
    }
}

class Particle {
    constructor(x, y, color, explosionSize, level = 1, customGravity = null) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.color = color;
        this.gravity = customGravity || random(0.03, 0.06);//粒子重力
        this.size = random(2, 4);//粒子大小
        this.level = level;
        this.brightness = 255;
        this.decay = random(0.3, 0.6);//粒子消失速度
        this.isDone = false;
        
        this.prevPos = createVector(x, y);
        
        this.mass = random(0.8, 1.2);
        this.airResistance = random(0.97, 0.985);//空气阻力
        this.wobble = random(0.99, 1.01);//粒子随机抖动
        this.glowing = random() > 0.3;//是否发光
        this.decay *= (this.glowing ? 0.5 : 0.8);//发光消失速度
    }

    update() {
        if (this.isDone) return false;
        this.prevPos.set(this.pos.x, this.pos.y);
        
        const gravityForce = createVector(0, this.gravity);
        gravityForce.mult(this.mass);
        this.acc.add(gravityForce);
        
        // 计算风力影响，添加到加速度上
        const wind = noise(this.pos.y * 0.01, frameCount * 0.01) - 0.5;
        this.acc.add(createVector(wind * 0.1, 0));
        
        // 更新速度并根据空气阻力进行缩放
        this.vel.add(this.acc);
        this.vel.mult(this.airResistance);
        if (this.vel.mag() < 0.5) {
            this.vel.mult(0.95);
        }
        
        // 更新粒子位置并重置加速度
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        // 根据速度计算速度因子并减少亮度
        const speed = this.vel.mag();
        const speedFactor = map(speed, 0, 5, 1.2, 0.8);
        this.brightness -= this.decay * speedFactor;
        
        // 当粒子具有摆动效果时，计算摆动角度并旋转速度向量
        if (this.wobble !== 1) {
            const wobbleAngle = noise(
                this.pos.x * 0.002, 
                this.pos.y * 0.002, 
                frameCount * 0.005
            ) * TWO_PI;
            this.vel.rotate(wobbleAngle * (this.wobble - 1) * 0.02);
        }

        // 检查亮度是否小于等于零，是则将粒子标记为完成
        this.isDone = this.brightness <= 0;
        return !this.isDone;
    }

    show() {
        if (this.isDone) return;
        
        // 计算粒子的透明度
        const alpha = this.brightness / 255;
        drawingContext.globalCompositeOperation = 'lighter';
        
        // 如果粒子具有发光效果，则设置阴影模糊和阴影�������色
        if (this.glowing) {
            drawingContext.shadowBlur = this.size * 3;
            drawingContext.shadowColor = this.color;
        }
        
        // 绘制粒子
        stroke(this.color.replace('1)', `${alpha})`));
        strokeWeight(this.size);
        point(this.pos.x, this.pos.y);
        
        // 绘制粒子轨迹
        const trailAlpha = alpha * 0.5;
        stroke(this.color.replace('1)', `${trailAlpha})`));
        strokeWeight(this.size * 0.8);
        line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);

        drawingContext.globalCompositeOperation = 'source-over';
        
        // 绘制阴影模糊和阴影颜色
        if (this.glowing) {
            drawingContext.shadowBlur = this.size * 2;
            drawingContext.shadowColor = this.color;
        }
    }
}

class ScoreDisplay {
    constructor(score, x, y) {
        this.score = score;
        this.x = x;
        this.y = y;
        this.opacity = 255;
        
        // 调整分数大小的映射关系
        // 60分以下：30-50像素
        // 60-80分：50-100像素
        // 80-90分：100-200像素
        // 90分以上：200-300像素
        if (score > 90) {
            this.size = map(score, 90, 100, 200, 300);
        } else if (score > 80) {
            this.size = map(score, 80, 90, 100, 200);
        } else if (score > 60) {
            this.size = map(score, 60, 80, 50, 100);
        } else {
            this.size = map(score, 0, 60, 30, 50);
        }
        
        this.isDone = false;
        this.lifespan = 120; // 持续2秒（60帧/秒）
        this.currentFrame = 0;
        
        // 初始位置偏移，用于创造"弹出"效果
        this.yOffset = 50;
    }

    update() {
        this.currentFrame++;
        if (this.currentFrame >= this.lifespan) {
            this.isDone = true;
        }
        // 淡出效果
        this.opacity = map(this.currentFrame, 0, this.lifespan, 255, 0);
        
        // "弹出"效果，数字会先向上弹出一点，然后缓慢上升
        if (this.currentFrame < 30) { // 前0.5秒
            this.yOffset = map(this.currentFrame, 0, 30, 50, 0);
        } else {
            this.yOffset -= 0.3; // 之后缓慢上升
        }
        
        return !this.isDone;
    }

    show() {
        if (this.isDone) return;
        
        push();
        textAlign(RIGHT, BOTTOM); // 改为右对齐和底部对齐
        textSize(this.size);
        textStyle(BOLD);
        
        // 绘制发光效果
        drawingContext.shadowBlur = 20;
        drawingContext.shadowColor = this.score > 80 ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        
        // 根据分数设置颜色
        let textColor;
        if (this.score > 90) {
            textColor = `rgba(255, 215, 0, ${this.opacity/255})`; // 金色
        } else if (this.score > 80) {
            textColor = `rgba(255, 165, 0, ${this.opacity/255})`; // 橙色
        } else if (this.score > 60) {
            textColor = `rgba(173, 216, 230, ${this.opacity/255})`; // 淡蓝色
        } else {
            textColor = `rgba(255, 255, 255, ${this.opacity/255})`; // 白色
        }
        
        // 绘制描边
        strokeWeight(4);
        stroke(0, this.opacity);
        fill(textColor);
        text(this.score, this.x, this.y + this.yOffset);
        
        pop();
    }
}

let fireworks = [];
let isShowingFireworks = false;
let scoreDisplays = [];

function startFireworks(x, y, color) {
    isShowingFireworks = true;
    
    // 从画布底部中心发射
    const startX = width/2;
    const startY = height + 10;
    
    const firework = new Firework(
        startX, startY,  // 从画布底部中心发射
        x, y,  // 目标位置（画布中心）
        color || `rgba(${random(150, 255)}, ${random(150, 255)}, ${random(150, 255)}, 1)`,
        random(25, 35), // size
        floor(random(4)), // pattern
        random(30, 50) // particleCount
    );
    fireworks.push(firework);
}

function updateFireworks() {
    if (!isShowingFireworks) return;
    
    // 使用渐变的半透明黑色背景
    background(0, 25);
    
    // 更新和显示烟花
    fireworks = fireworks.filter(f => {
        const result = f.update();
        if (f.justExploded && !f.hasUpdatedBackground) {
            // 爆炸时添加一个较深的背景色
            background(0, 100);
            f.hasUpdatedBackground = true;
        }
        return result;
    });
    
    fireworks.forEach(f => f.show());
    
    // 更新和显示分数
    scoreDisplays = scoreDisplays.filter(d => d.update());
    scoreDisplays.forEach(d => d.show());
    
    if (fireworks.length === 0 && scoreDisplays.length === 0) {
        isShowingFireworks = false;
    }
}

// 添加显示分数的函数
function showScore(score) {
    // 在画布右下方显示分数，但不是最角落
    // 距离右边缘 20% 的宽度，距离底部 20% 的高度
    const x = width * 0.8;
    const y = height * 0.8;
    const scoreDisplay = new ScoreDisplay(score, x, y);
    scoreDisplays.push(scoreDisplay);
} 