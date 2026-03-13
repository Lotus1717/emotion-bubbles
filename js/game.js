/**
 * 游戏逻辑模块
 * 管理游戏状态、计时、历史记录等核心逻辑
 */

import { CONFIG, THEMES, STORAGE_KEYS } from './constants.js';
import { OPPOSITE_EMOTIONS, SIMILAR_EMOTIONS, EMOTION_TREE, getRandomEmotion, getEmotionCategory, getRandomInitialEmotions, getRandomFromCategory } from './emotions.js';
import { audioManager } from './audio.js';
import { physicsEngine } from './physics.js';
import { bubbleManager } from './bubble.js';
import { generateSuggestion } from './suggestions.js';

/**
 * 游戏状态枚举
 */
export const GameState = {
    IDLE: 'idle',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    RESULT: 'result',
    STATS: 'stats',
};

/**
 * 游戏控制器
 */
class GameController {
    constructor() {
        // 游戏状态
        this.state = GameState.IDLE;
        this.duration = CONFIG.DEFAULT_DURATION;
        this.timeLeft = CONFIG.DEFAULT_DURATION;
        this.currentTheme = 'healing';
        
        // 计时器
        this.gameTimer = null;
        this.countdownTimer = null;
        
        // 数据
        this.poppedEmotions = [];
        this.history = [];
        
        // DOM 引用
        this.elements = {};
        
        // 回调
        this.onStateChange = null;
        this.onTimeUpdate = null;
    }

    /**
     * 初始化游戏
     * @param {Object} elements - DOM 元素引用
     */
    init(elements) {
        this.elements = elements;
        this._loadHistory();
        this._initBubbleManager();
    }

    /**
     * 初始化气泡管理器
     * @private
     */
    _initBubbleManager() {
        bubbleManager.init(
            this.elements.bubbleContainer,
            (emotion) => this._onBubblePop(emotion),
            (category, depth) => this._handleEmotionRelations(category, depth)
        );
    }

    /**
     * 设置游戏时长
     * @param {number} seconds - 时长（秒）
     */
    setDuration(seconds) {
        this.duration = seconds;
        this.timeLeft = seconds;
    }

    /**
     * 设置主题
     * @param {string} theme - 主题名称
     */
    setTheme(theme) {
        if (!THEMES[theme]) return;
        
        this.currentTheme = theme;
        const colors = THEMES[theme];
        
        document.documentElement.style.setProperty('--primary', colors.primary);
        document.documentElement.style.setProperty('--secondary', colors.secondary);
    }

    /**
     * 开始游戏（先倒计时）
     */
    start() {
        if (this.state !== GameState.IDLE) return;
        
        this._setState(GameState.COUNTDOWN);
        this._startCountdown();
    }

    /**
     * 开始倒计时
     * @private
     */
    _startCountdown() {
        let count = CONFIG.COUNTDOWN_SECONDS;
        
        if (this.elements.countdownText) {
            this.elements.countdownText.textContent = count;
        }

        this.countdownTimer = setInterval(() => {
            count--;
            audioManager.playTick();
            
            if (count > 0) {
                if (this.elements.countdownText) {
                    this.elements.countdownText.textContent = count;
                }
            } else {
                clearInterval(this.countdownTimer);
                this._startPlay();
            }
        }, 1000);
    }

    /**
     * 开始游戏
     * @private
     */
    _startPlay() {
        this._setState(GameState.PLAYING);
        
        this.timeLeft = this.duration;
        this.poppedEmotions = [];
        
        this._updateTimerDisplay();
        this._updateProgress();
        
        // 启动音频
        audioManager.resume();
        audioManager.startAmbient();
        
        // 启动物理引擎
        physicsEngine.start(() => bubbleManager.getAllBubbles());
        
        // 启动气泡生成（使用随机初始情绪）
        const initialEmotions = getRandomInitialEmotions();
        bubbleManager.start(initialEmotions);
        
        // 启动游戏计时
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this._updateTimerDisplay();
            this._updateProgress();
            
            if (this.timeLeft <= 0) {
                this._endGame();
            }
        }, 1000);
    }

    /**
     * 结束游戏
     * @private
     */
    _endGame() {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
        
        bubbleManager.stop();
        physicsEngine.stop();
        audioManager.stopAmbient();
        audioManager.playEnd();
        
        this._saveHistory();
        this._showResult();
        
        this._setState(GameState.RESULT);
    }

    /**
     * 重新开始
     */
    restart() {
        this._reset();
        this.start();
    }

    /**
     * 关闭结果面板，返回首页
     */
    closeResult() {
        this._reset();
        this._setState(GameState.IDLE);
    }

    /**
     * 提前结束游戏
     */
    endEarly() {
        if (this.state !== GameState.PLAYING) return;
        this._endGame();
    }

    /**
     * 显示统计面板
     */
    showStats() {
        this._updateStatsDisplay();
        this._setState(GameState.STATS);
    }

    /**
     * 关闭统计面板
     */
    closeStats() {
        this._setState(GameState.IDLE);
    }

    /**
     * 更新统计时间范围
     * @param {string} range - 时间范围
     */
    updateStatsRange(range) {
        this._updateStatsDisplay(range);
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
        localStorage.setItem(STORAGE_KEYS.HISTORY, '[]');
        this._updateStatsDisplay();
    }

    /**
     * 重置游戏状态
     * @private
     */
    _reset() {
        clearInterval(this.gameTimer);
        clearInterval(this.countdownTimer);
        this.gameTimer = null;
        this.countdownTimer = null;
        
        bubbleManager.stop();
        bubbleManager.clear();
        physicsEngine.stop();
        audioManager.stopAmbient();
        
        this.poppedEmotions = [];
        this.timeLeft = this.duration;
        this.emotionBalanceTracker = [];
        
        // 重置状态为 IDLE，以便可以重新开始
        this.state = GameState.IDLE;
    }

    /**
     * 设置游戏状态
     * @private
     */
    _setState(newState) {
        this.state = newState;
        if (this.onStateChange) {
            this.onStateChange(newState);
        }
    }

    /**
     * 气泡戳破回调
     * @private
     */
    _onBubblePop(emotion) {
        this.poppedEmotions.push(emotion);
    }

    /**
     * 处理情绪关系（对立/相近）
     * 实现"情绪流动"的核心逻辑
     * @private
     */
    _handleEmotionRelations(category, depth) {
        const opposite = OPPOSITE_EMOTIONS[category] || [];
        const similar = SIMILAR_EMOTIONS[category] || [];

        // 1. 相似情绪"共振"（立即发光）
        if (similar.length > 0) {
            bubbleManager.resonateSimilarEmotions([category, ...similar]);
        }

        // 2. 对立情绪消散（延迟一点，让用户看到共振效果后再消散）
        if (opposite.length > 0) {
            setTimeout(() => {
                bubbleManager.fadeOppositeEmotions(opposite);
            }, 300);
        }

        // 3. 情绪平衡机制：如果持续戳同类情绪，会补充对立情绪
        this._updateEmotionBalance(category);

        // 4. 有概率补充相近类别（模拟情绪自然涌现）
        if (similar.length > 0 && Math.random() > 0.7) {
            setTimeout(() => {
                const shuffled = [...similar].sort(() => Math.random() - 0.5);
                const cat = shuffled[0];
                if (EMOTION_TREE[cat]) {
                    const randomSub = getRandomFromCategory(cat);
                    bubbleManager.create(randomSub, cat, 0);
                }
            }, 1500);
        }
    }

    /**
     * 情绪平衡机制
     * 追踪用户戳破的情绪类别，如果过于单一，补充对立/其他类别
     * @private
     */
    _updateEmotionBalance(category) {
        // 初始化平衡追踪器
        if (!this.emotionBalanceTracker) {
            this.emotionBalanceTracker = [];
        }

        this.emotionBalanceTracker.push(category);
        
        // 只保留最近 10 次
        if (this.emotionBalanceTracker.length > 10) {
            this.emotionBalanceTracker.shift();
        }

        // 检查是否过于单一（最近 6 次中有 4 次以上是同类或相似类）
        if (this.emotionBalanceTracker.length >= 6) {
            const recent = this.emotionBalanceTracker.slice(-6);
            const categoryCount = {};
            
            recent.forEach(cat => {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });

            const maxCount = Math.max(...Object.values(categoryCount));
            
            // 如果某类占比过高，补充对立情绪
            if (maxCount >= 4) {
                const dominantCategory = Object.keys(categoryCount).find(k => categoryCount[k] === maxCount);
                const opposite = OPPOSITE_EMOTIONS[dominantCategory] || [];
                
                if (opposite.length > 0) {
                    setTimeout(() => {
                        const oppositeCategory = opposite[Math.floor(Math.random() * opposite.length)];
                        if (EMOTION_TREE[oppositeCategory]) {
                            const randomSub = getRandomFromCategory(oppositeCategory);
                            bubbleManager.create(randomSub, oppositeCategory, 0);
                        }
                    }, 2000);
                }
            }
        }
    }

    /**
     * 更新计时器显示
     * @private
     */
    _updateTimerDisplay() {
        if (!this.elements.timerDisplay) return;
        
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.elements.timerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 更新进度条
     * @private
     */
    _updateProgress() {
        if (!this.elements.progressBar) return;
        
        const progress = ((this.duration - this.timeLeft) / this.duration) * 100;
        this.elements.progressBar.style.width = progress + '%';
    }

    /**
     * 显示结果
     * @private
     */
    _showResult() {
        // 统计情绪出现次数
        const counts = {};
        this.poppedEmotions.forEach(e => counts[e] = (counts[e] || 0) + 1);
        
        // 排序取前 N 个
        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.HISTORY.RESULT_TOP)
            .map(([e]) => e);

        // 更新情绪标签
        if (this.elements.emotionTags) {
            this.elements.emotionTags.innerHTML = sorted
                .map(e => `<span class="emotion-tag">${e}</span>`)
                .join('');
        }

        // 生成 AI 建议
        if (this.elements.aiSuggestion) {
            this.elements.aiSuggestion.textContent = generateSuggestion(sorted);
        }
    }

    /**
     * 保存历史记录
     * @private
     */
    _saveHistory() {
        const today = new Date().toLocaleDateString();
        const counts = {};
        this.poppedEmotions.forEach(e => counts[e] = (counts[e] || 0) + 1);

        const existing = this.history.findIndex(h => h.date === today);
        if (existing >= 0) {
            // 合并今天的记录
            Object.entries(counts).forEach(([e, c]) => {
                this.history[existing].emotions[e] = (this.history[existing].emotions[e] || 0) + c;
            });
        } else {
            this.history.push({ date: today, emotions: counts });
        }

        // 只保留最近 N 天
        this.history = this.history.slice(-CONFIG.HISTORY.MAX_DAYS);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history));
    }

    /**
     * 加载历史记录
     * @private
     */
    _loadHistory() {
        try {
            this.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
        } catch (e) {
            console.warn('Failed to load history:', e);
            this.history = [];
        }
    }

    /**
     * 更新统计显示
     * @private
     */
    _updateStatsDisplay(range = 'week') {
        if (!this.elements.statsList) return;
        
        // 初始化统计模块
        emotionStats.init(this.history);
        
        // 获取统计数据
        const stats = emotionStats.getStats(range);
        const { overview, change } = stats;
        
        // 更新概览数字
        if (this.elements.statTotalPopped) {
            this.elements.statTotalPopped.textContent = overview.totalPopped;
        }
        if (this.elements.statTotalDays) {
            this.elements.statTotalDays.textContent = overview.totalDays;
        }
        if (this.elements.statAvgPerDay) {
            this.elements.statAvgPerDay.textContent = overview.avgPerDay;
        }
        
        // 更新分类统计
        if (this.elements.categoryList) {
            this.elements.categoryList.innerHTML = Object.entries(overview.categoryBreakdown)
                .filter(([_, data]) => data.count > 0)
                .map(([category, data]) => `
                    <div class="category-item">
                        <div class="category-name">${this._getCategoryName(category)}</div>
                        <div class="category-bar">
                            <div class="category-bar-fill" style="width: ${data.percentage}%"></div>
                        </div>
                        <div class="category-count">${data.count} (${data.percentage}%)</div>
                    </div>
                `).join('');
        }
        
        // 更新 Top 情绪
        if (this.elements.topList) {
            this.elements.topList.innerHTML = overview.topEmotions
                .map(item => `
                    <div class="top-item">
                        <span class="top-emotion">${item.emotion}</span>
                        <span class="top-count">${item.count}次</span>
                        <span class="top-percent">${item.percentage}%</span>
                    </div>
                `).join('');
        }
        
        // 更新趋势图
        if (this.elements.trendChart) {
            const trend = stats.trend;
            const maxTotal = Math.max(...trend.map(d => d.total), 1);
            
            this.elements.trendChart.innerHTML = trend.map(d => `
                <div class="trend-bar">
                    <div class="trend-bar-fill" style="height: ${(d.total / maxTotal) * 100}%"></div>
                    <div class="trend-label">${d.shortDate}</div>
                </div>
            `).join('');
        }
        
        // 兼容旧版列表（如果 statsList 还在）
        if (this.elements.statsList) {
            if (this.history.length === 0) {
                this.elements.statsList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">暂无历史记录</p>';
            } else {
                // 兼容旧代码，但使用新数据
                const topEmotions = overview.topEmotions.slice(0, 5);
                this.elements.statsList.innerHTML = topEmotions
                    .map(item => `<div class="stats-item"><span>${item.emotion}</span><span class="stats-count">${item.count}</span></div>`)
                    .join('');
            }
        }
    }
    
    /**
     * 获取分类中文名
     * @private
     */
    _getCategoryName(category) {
        const names = {
            'base': '基础情绪',
            'complex': '复杂情绪',
            'healing': '治愈情绪',
            'social': '社恐情绪',
            'work': '职场情绪'
        };
        return names[category] || category;
    }
}

// 导出单例
export const gameController = new GameController();
