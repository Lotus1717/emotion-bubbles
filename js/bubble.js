/**
 * 气泡类模块
 * 封装气泡的创建、动画和交互逻辑
 */

import { CONFIG } from './constants.js';
import { getEmotionColor, getEmotionCategory, getChildEmotions, getRandomEmotion } from './emotions.js';
import { physicsEngine } from './physics.js';
import { audioManager } from './audio.js';

/**
 * 气泡管理器
 * 负责气泡的创建、销毁和交互处理
 */
class BubbleManager {
    constructor() {
        this.container = null;
        this.onPop = null;          // 戳破回调
        this.onRelationsUpdate = null; // 情绪关系更新回调
        this.supplementTimer = null;
        this.isActive = false;
    }

    /**
     * 初始化气泡管理器
     * @param {HTMLElement} container - 气泡容器元素
     * @param {Function} onPop - 气泡戳破回调
     * @param {Function} onRelationsUpdate - 情绪关系更新回调
     */
    init(container, onPop, onRelationsUpdate) {
        this.container = container;
        this.onPop = onPop;
        this.onRelationsUpdate = onRelationsUpdate;
    }

    /**
     * 启动气泡生成
     * @param {string[]} initialEmotions - 初始情绪列表
     */
    start(initialEmotions) {
        this.isActive = true;
        this.clear();

        // 生成初始气泡（每 0.5 秒一个）
        initialEmotions.forEach((emotion, i) => {
            setTimeout(() => {
                if (this.isActive) {
                    this.create(emotion, null, 0);
                }
            }, i * CONFIG.BUBBLE.INITIAL_SPAWN_DELAY);
        });

        // 等待初始化完成后开始补充逻辑
        setTimeout(() => {
            if (this.isActive) {
                this.startSupplement();
            }
        }, CONFIG.BUBBLE.INITIAL_WAIT);
    }

    /**
     * 停止气泡生成
     */
    stop() {
        this.isActive = false;
        this.stopSupplement();
    }

    /**
     * 清空所有气泡
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * 启动气泡补充定时器
     */
    startSupplement() {
        this.stopSupplement();
        this.supplementTimer = setInterval(() => {
            const count = this.getActiveBubbles().length;
            if (count < CONFIG.BUBBLE.MAX_COUNT) {
                this.create();
            }
        }, CONFIG.BUBBLE.SPAWN_INTERVAL);
    }

    /**
     * 停止气泡补充定时器
     */
    stopSupplement() {
        if (this.supplementTimer) {
            clearInterval(this.supplementTimer);
            this.supplementTimer = null;
        }
    }

    /**
     * 获取当前活跃的气泡列表
     * @returns {HTMLElement[]}
     */
    getActiveBubbles() {
        if (!this.container) return [];
        return Array.from(this.container.querySelectorAll('.bubble:not(.popping):not(.fading)'));
    }

    /**
     * 获取所有气泡（包括正在消失的）
     * @returns {HTMLElement[]}
     */
    getAllBubbles() {
        if (!this.container) return [];
        return Array.from(this.container.querySelectorAll('.bubble:not(.popping)'));
    }

    /**
     * 创建气泡
     * @param {string|null} specificEmotion - 指定的情绪（可选）
     * @param {string|null} parentEmotion - 父情绪（用于层级挖掘）
     * @param {number} depth - 当前深度
     */
    create(specificEmotion = null, parentEmotion = null, depth = 0) {
        if (!this.isActive || !this.container) return;

        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.dataset.depth = depth;
        bubble.dataset.parentEmotion = parentEmotion || '';

        // 随机大小
        const size = Math.random() * CONFIG.BUBBLE.SIZE_RANGE + CONFIG.BUBBLE.MIN_SIZE;
        bubble.style.width = bubble.style.height = size + 'px';

        // 查找安全位置
        const existingBubbles = this.getActiveBubbles();
        const { x, y } = physicsEngine.findSafePosition(size, existingBubbles);
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';

        // 物理属性
        const velocity = physicsEngine.getRandomVelocity();
        bubble.dataset.vx = velocity.vx;
        bubble.dataset.vy = velocity.vy;
        bubble.dataset.radius = size / 2;

        // 选择情绪和颜色
        const emotion = specificEmotion || getRandomEmotion();
        const color = getEmotionColor(emotion);
        const glowColor = color.replace('0.5', '0.35');
        
        bubble.style.background = color;
        bubble.style.setProperty('--bubble-color', glowColor);
        bubble.style.boxShadow = `0 0 25px ${glowColor}, inset 0 0 18px rgba(255,255,255,0.3), inset 0 0 8px rgba(255,255,255,0.15)`;

        // 随机动画延迟
        const animDelayX = (Math.random() * -4) + 's';
        const animDelayY = (Math.random() * -5) + 's';
        const animDelayPulse = (Math.random() * -3) + 's';
        bubble.style.animationDelay = `${animDelayX}, ${animDelayY}, ${animDelayPulse}`;

        // 随机动画持续时间
        const durationX = 3 + Math.random() * 3;
        const durationY = 4 + Math.random() * 3;
        bubble.style.animationDuration = `${durationX}s, ${durationY}s, 3s`;

        // 气泡内容
        bubble.innerHTML = `<span class="bubble-text">${emotion}</span>`;

        // 绑定事件
        this._bindEvents(bubble, emotion);

        // 限制最大数量
        if (existingBubbles.length >= CONFIG.BUBBLE.MAX_COUNT) {
            existingBubbles[0]?.remove();
        }

        this.container.appendChild(bubble);

        // 设置生命周期
        this._setLifecycle(bubble);
    }

    /**
     * 在指定位置附近创建气泡
     * @param {string} emotion - 情绪词
     * @param {number} nearX - 参考 X 坐标
     * @param {number} nearY - 参考 Y 坐标
     */
    createNear(emotion, nearX, nearY) {
        if (!this.isActive || !this.container) return;

        const size = Math.random() * CONFIG.BUBBLE.SIZE_RANGE + CONFIG.BUBBLE.MIN_SIZE;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.width = bubble.style.height = size + 'px';

        // 在附近位置生成
        const { x, y } = physicsEngine.findNearbyPosition(nearX, nearY, size);
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';

        // 物理属性
        const velocity = physicsEngine.getRandomVelocity();
        bubble.dataset.vx = velocity.vx;
        bubble.dataset.vy = velocity.vy;
        bubble.dataset.radius = size / 2;
        bubble.dataset.depth = 0;
        bubble.dataset.parentEmotion = '';

        // 颜色
        const color = getEmotionColor(emotion);
        const glowColor = color.replace('0.5', '0.35');
        bubble.style.background = color;
        bubble.style.boxShadow = `0 0 25px ${glowColor}, inset 0 0 18px rgba(255,255,255,0.3)`;

        // 动画
        bubble.style.animation = 'bubbleFadeIn 0.6s ease-out forwards, floatInPlace 6s ease-in-out 0.6s infinite, bubblePulse 3s ease-in-out 0.6s infinite';
        bubble.style.opacity = '0';

        bubble.innerHTML = `<span class="bubble-text">${emotion}</span>`;

        // 绑定事件
        this._bindEvents(bubble, emotion);

        this.container.appendChild(bubble);
    }

    /**
     * 绑定气泡事件
     * @private
     */
    _bindEvents(bubble, emotion) {
        const handlePop = (e) => {
            e.preventDefault();
            this._popBubble(bubble, emotion, e);
        };

        bubble.addEventListener('click', handlePop);
        bubble.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._popBubble(bubble, emotion, e.touches[0]);
        });

        // 长按支持
        let longPressTimer;
        bubble.addEventListener('mousedown', () => {
            longPressTimer = setTimeout(() => {
                this._popBubble(bubble, emotion, {
                    clientX: parseFloat(bubble.style.left),
                    clientY: parseFloat(bubble.style.top)
                });
            }, 500);
        });
        bubble.addEventListener('mouseup', () => clearTimeout(longPressTimer));
        bubble.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
    }

    /**
     * 设置气泡生命周期
     * @private
     */
    _setLifecycle(bubble) {
        const lifeTime = CONFIG.BUBBLE.LIFE_MIN + Math.random() * CONFIG.BUBBLE.LIFE_RANGE;

        setTimeout(() => {
            if (bubble.parentNode && !bubble.classList.contains('popping')) {
                bubble.classList.add('fading');

                setTimeout(() => {
                    if (bubble.parentNode && !bubble.classList.contains('popping')) {
                        bubble.remove();
                    }
                }, CONFIG.BUBBLE.FADE_DURATION);
            }
        }, lifeTime);
    }

    /**
     * 戳破气泡
     * @private
     */
    _popBubble(bubble, emotion, event) {
        if (bubble.classList.contains('popping')) return;

        const depth = parseInt(bubble.dataset.depth || 0);
        const category = getEmotionCategory(emotion);

        // 触发回调
        if (this.onPop) {
            this.onPop(emotion);
        }

        // 添加戳破动画
        bubble.classList.add('popping');
        audioManager.playPop();

        // 创建粒子效果
        const x = event.clientX || parseFloat(bubble.style.left) + parseFloat(bubble.style.width) / 2;
        const y = event.clientY || parseFloat(bubble.style.top) + parseFloat(bubble.style.height) / 2;
        this._createParticles(x, y, bubble.style.background);

        // 暂停补充逻辑
        const wasSupplementing = !!this.supplementTimer;
        this.stopSupplement();

        // 处理情绪关系
        if (this.onRelationsUpdate) {
            this.onRelationsUpdate(category, depth);
        }

        // 检查是否可以挖掘更深层情绪
        const canDigDeeper = depth < CONFIG.EMOTION_MAX_DEPTH && getChildEmotions(emotion);

        if (canDigDeeper) {
            const subEmotions = getChildEmotions(emotion);
            const count = Math.min(CONFIG.EMOTION_BRANCH_COUNT, subEmotions.length);

            setTimeout(() => {
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        if (this.isActive) {
                            this.create(subEmotions[i], emotion, depth + 1);
                        }
                    }, i * 200);
                }
            }, 300);
        }

        // 移除气泡并补充新气泡
        setTimeout(() => {
            const poppedX = parseFloat(bubble.style.left);
            const poppedY = parseFloat(bubble.style.top);

            bubble.remove();

            // 在戳破位置附近补充新气泡
            if (this.isActive) {
                const newEmotion = getRandomEmotion();
                this.createNear(newEmotion, poppedX, poppedY);
            }

            // 恢复补充逻辑
            if (wasSupplementing && this.isActive) {
                this.startSupplement();
            }
        }, CONFIG.BUBBLE.POP_DURATION);
    }

    /**
     * 创建粒子效果
     * @private
     */
    _createParticles(x, y, color) {
        const { PARTICLES } = CONFIG;

        // 主粒子
        for (let i = 0; i < PARTICLES.COUNT; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = PARTICLES.MIN_DISTANCE + Math.random() * PARTICLES.DISTANCE_RANGE;
            const size = PARTICLES.MIN_SIZE + Math.random() * PARTICLES.SIZE_RANGE;
            
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = particle.style.height = size + 'px';
            particle.style.background = color || 'rgba(255,255,255,0.8)';
            particle.style.color = color || 'rgba(255,255,255,0.8)';
            particle.style.setProperty('--tx', (Math.cos(angle) * distance) + 'px');
            particle.style.setProperty('--ty', (Math.sin(angle) * distance) + 'px');

            const duration = PARTICLES.MIN_DURATION + Math.random() * PARTICLES.DURATION_RANGE;
            particle.style.animationDuration = duration + 's';

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), duration * 1000);
        }

        // 扩散圈
        for (let i = 0; i < PARTICLES.RING_COUNT; i++) {
            const ring = document.createElement('div');
            ring.className = 'particle';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = PARTICLES.RING_MIN_DISTANCE + Math.random() * PARTICLES.RING_DISTANCE_RANGE;
            
            ring.style.left = x + 'px';
            ring.style.top = y + 'px';
            ring.style.width = ring.style.height = (PARTICLES.RING_MIN_SIZE + Math.random() * PARTICLES.RING_SIZE_RANGE) + 'px';
            ring.style.background = 'transparent';
            ring.style.border = `2px solid ${color || 'rgba(255,255,255,0.5)'}`;
            ring.style.setProperty('--tx', (Math.cos(angle) * distance) + 'px');
            ring.style.setProperty('--ty', (Math.sin(angle) * distance) + 'px');
            ring.style.animationDuration = '0.6s';
            
            document.body.appendChild(ring);
            setTimeout(() => ring.remove(), 600);
        }
    }

    /**
     * 让对立情绪的气泡消失
     * @param {string[]} oppositeCategories - 对立情绪类别列表
     */
    fadeOppositeEmotions(oppositeCategories) {
        const bubbles = this.getActiveBubbles();
        
        bubbles.forEach(bubble => {
            const text = bubble.textContent;
            const category = getEmotionCategory(text);

            if (oppositeCategories.includes(category)) {
                bubble.style.transition = 'opacity 1.5s ease-out, transform 1.5s ease-out';
                bubble.style.opacity = '0';
                bubble.style.transform = 'scale(0.3)';
                setTimeout(() => bubble.remove(), 1500);
            }
        });
    }
}

// 导出单例
export const bubbleManager = new BubbleManager();
