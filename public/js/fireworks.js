class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = p5.Vector.random2D();
        this.velocity.mult(random(2, 8));
        this.acceleration = createVector(0, 0.2);
        this.alpha = 255;
        this.size = random(2, 4);
        this.lifetime = 255;
    }

    update() {
        this.velocity.add(this.acceleration);
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha = this.lifetime;
        this.lifetime -= 5;
    }

    isDead() {
        return this.lifetime <= 0;
    }

    show() {
        noStroke();
        fill(this.color[0], this.color[1], this.color[2], this.alpha);
        ellipse(this.x, this.y, this.size);
    }
}

class Firework {
    constructor(x, y, targetColor) {
        this.x = x;
        this.y = y;
        this.color = [
            targetColor.r,
            targetColor.g,
            targetColor.b
        ];
        this.particles = [];
        this.exploded = false;
        
        // 创建烟花粒子
        for (let i = 0; i < 100; i++) {
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    show() {
        for (let particle of this.particles) {
            particle.show();
        }
    }

    isDead() {
        return this.particles.length === 0;
    }
}

// 全局变量
let fireworks = [];
let isShowingFireworks = false;

// 开始烟花表演
function startFireworks(targetColor) {
    isShowingFireworks = true;
    fireworks = [];
    
    // 创建多个烟花
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            let x = random(width * 0.2, width * 0.8);
            let y = random(height * 0.2, height * 0.6);
            fireworks.push(new Firework(x, y, targetColor));
        }, i * 300);
    }
}

// 更新和显示烟花
function updateFireworks() {
    if (!isShowingFireworks) return;

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        if (fireworks[i].isDead()) {
            fireworks.splice(i, 1);
        }
    }

    // 如果所有烟花都消失了，停止表演
    if (fireworks.length === 0) {
        isShowingFireworks = false;
    }
} 