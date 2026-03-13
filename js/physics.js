/**
 * 物理引擎模块
 * 处理气泡的碰撞检测、边界反弹和运动更新
 */

import { CONFIG } from './constants.js';

class PhysicsEngine {
    constructor() {
        this.timer = null;
        this.bubbles = [];
        this.bounds = {
            width: window.innerWidth,
            height: window.innerHeight - CONFIG.BOUNDS.PADDING_BOTTOM * 2
        };
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.updateBounds());
    }

    /**
     * 更新边界范围
     */
    updateBounds() {
        this.bounds = {
            width: window.innerWidth,
            height: window.innerHeight - CONFIG.BOUNDS.PADDING_BOTTOM * 2
        };
    }

    /**
     * 启动物理引擎
     * @param {Function} getBubbles - 获取当前气泡列表的回调函数
     */
    start(getBubbles) {
        this.stop();
        this.timer = setInterval(() => {
            const bubbles = getBubbles();
            this.update(bubbles);
        }, CONFIG.PHYSICS.UPDATE_INTERVAL);
    }

    /**
     * 停止物理引擎
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * 更新所有气泡的物理状态
     * @param {HTMLElement[]} bubbles - 气泡 DOM 元素数组
     */
    update(bubbles) {
        bubbles.forEach(bubble => {
            if (bubble.classList.contains('popping') || bubble.classList.contains('fading')) {
                return;
            }

            let x = parseFloat(bubble.style.left) || 0;
            let y = parseFloat(bubble.style.top) || 0;
            let vx = parseFloat(bubble.dataset.vx) || 0;
            let vy = parseFloat(bubble.dataset.vy) || 0;
            const radius = parseFloat(bubble.dataset.radius) || 40;

            // 更新位置
            x += vx;
            y += vy;

            // 边界反弹
            const { newX, newY, newVx, newVy } = this._handleBoundaryCollision(
                x, y, vx, vy, radius
            );
            x = newX;
            y = newY;
            vx = newVx;
            vy = newVy;

            // 气泡之间碰撞检测
            bubbles.forEach(other => {
                if (other === bubble || 
                    other.classList.contains('popping') || 
                    other.classList.contains('fading')) {
                    return;
                }

                const result = this._handleBubbleCollision(bubble, other, x, y, radius);
                if (result) {
                    x = result.x;
                    y = result.y;
                    vx = result.vx;
                    vy = result.vy;
                }
            });

            // 应用阻尼（轻微减速）
            vx *= 0.995;
            vy *= 0.995;

            // 更新 DOM
            bubble.style.left = x + 'px';
            bubble.style.top = y + 'px';
            bubble.dataset.vx = vx;
            bubble.dataset.vy = vy;
        });
    }

    /**
     * 处理边界碰撞
     * @private
     */
    _handleBoundaryCollision(x, y, vx, vy, radius) {
        const padding = CONFIG.BOUNDS.PADDING_X;
        const paddingTop = CONFIG.BOUNDS.PADDING_TOP;
        const paddingBottom = CONFIG.BOUNDS.PADDING_BOTTOM;
        const damping = CONFIG.PHYSICS.BOUNCE_DAMPING;

        // 左右边界
        if (x <= padding || x >= this.bounds.width - radius * 2 - padding) {
            vx *= -damping;
            x = Math.max(padding, Math.min(x, this.bounds.width - radius * 2 - padding));
        }

        // 上下边界
        if (y <= paddingTop || y >= this.bounds.height - radius * 2 - paddingBottom) {
            vy *= -damping;
            y = Math.max(paddingTop, Math.min(y, this.bounds.height - radius * 2 - paddingBottom));
        }

        return { newX: x, newY: y, newVx: vx, newVy: vy };
    }

    /**
     * 处理气泡之间的碰撞
     * @private
     */
    _handleBubbleCollision(bubble, other, x, y, radius) {
        const ox = parseFloat(other.style.left) || 0;
        const oy = parseFloat(other.style.top) || 0;
        const or = parseFloat(other.dataset.radius) || 40;

        const dx = x - ox;
        const dy = y - oy;
        const dist = Math.hypot(dx, dy);
        const minDist = radius + or;

        if (dist < minDist && dist > 0) {
            // 发生碰撞 - 计算分离向量
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // 分离气泡
            const newX = x + nx * overlap * 0.5;
            const newY = y + ny * overlap * 0.5;

            // 速度交换（弹性碰撞）+ 随机扰动
            const ovx = parseFloat(other.dataset.vx) || 0;
            const ovy = parseFloat(other.dataset.vy) || 0;
            const randomFactor = CONFIG.PHYSICS.VELOCITY_RANDOM;
            const damping = CONFIG.PHYSICS.BOUNCE_DAMPING;

            const newVx = ovx * damping + (Math.random() - 0.5) * randomFactor;
            const newVy = ovy * damping + (Math.random() - 0.5) * randomFactor * 0.6;

            // 更新另一个气泡的速度
            other.dataset.vx = bubble.dataset.vx * damping + (Math.random() - 0.5) * randomFactor;
            other.dataset.vy = bubble.dataset.vy * damping + (Math.random() - 0.5) * randomFactor * 0.6;

            return { x: newX, y: newY, vx: newVx, vy: newVy };
        }

        return null;
    }

    /**
     * 检查位置是否与现有气泡重叠
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @param {number} size - 气泡大小
     * @param {HTMLElement[]} existingBubbles - 现有气泡数组
     * @returns {boolean} - 是否重叠
     */
    isOverlapping(x, y, size, existingBubbles) {
        return existingBubbles.some(b => {
            const bx = parseFloat(b.style.left) || 0;
            const by = parseFloat(b.style.top) || 0;
            const bsize = parseFloat(b.style.width) || 80;
            const dist = Math.hypot(x - bx, y - by);
            return dist < (size + bsize) * CONFIG.PHYSICS.OVERLAP_THRESHOLD;
        });
    }

    /**
     * 计算随机初始速度
     * @returns {{vx: number, vy: number}}
     */
    getRandomVelocity() {
        return {
            vx: (Math.random() - 0.5) * CONFIG.PHYSICS.INITIAL_VX_RANGE,
            vy: (Math.random() - 0.5) * CONFIG.PHYSICS.INITIAL_VY_RANGE + CONFIG.PHYSICS.INITIAL_VY_BIAS
        };
    }

    /**
     * 计算安全的生成位置
     * @param {number} size - 气泡大小
     * @param {HTMLElement[]} existingBubbles - 现有气泡数组
     * @param {number} maxAttempts - 最大尝试次数
     * @returns {{x: number, y: number}}
     */
    findSafePosition(size, existingBubbles, maxAttempts = 20) {
        const minY = CONFIG.BOUNDS.SPAWN_PADDING_TOP;
        const maxY = window.innerHeight - size - CONFIG.BOUNDS.SPAWN_PADDING_BOTTOM;
        const paddingX = CONFIG.BOUNDS.SPAWN_PADDING_X;

        let x, y, attempts = 0;

        do {
            x = Math.random() * (window.innerWidth - size - paddingX * 2) + paddingX;
            y = minY + Math.random() * (maxY - minY);
            attempts++;
        } while (attempts < maxAttempts && this.isOverlapping(x, y, size, existingBubbles));

        return { x, y };
    }

    /**
     * 计算附近的安全位置
     * @param {number} nearX - 参考 X 坐标
     * @param {number} nearY - 参考 Y 坐标
     * @param {number} size - 气泡大小
     * @returns {{x: number, y: number}}
     */
    findNearbyPosition(nearX, nearY, size) {
        const offsetX = (Math.random() - 0.5) * 150;
        const offsetY = (Math.random() - 0.5) * 100;
        
        let x = nearX + offsetX;
        let y = nearY + offsetY;

        // 边界检查
        x = Math.max(CONFIG.BOUNDS.PADDING_X, Math.min(x, window.innerWidth - size - CONFIG.BOUNDS.PADDING_X * 2));
        y = Math.max(CONFIG.BOUNDS.SPAWN_PADDING_TOP, Math.min(y, window.innerHeight - size - CONFIG.BOUNDS.SPAWN_PADDING_BOTTOM - 50));

        return { x, y };
    }
}

// 导出单例
export const physicsEngine = new PhysicsEngine();
