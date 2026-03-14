/**
 * 念起 - 入口文件
 * 
 * 负责 DOM 初始化、事件绑定和状态管理
 */

import { CONFIG } from './constants.js';
import { gameController, GameState } from './game.js';
import { shareManager } from './share.js';

/**
 * 应用初始化
 */
class App {
    constructor() {
        this.elements = {};
    }

    /**
     * 启动应用
     */
    init() {
        this._cacheElements();
        this._initStars();
        this._bindEvents();
        this._initGameController();
        
        // 初始化分享管理器
        shareManager.init();
        
        console.log('🫧 念起已加载');
    }

    /**
     * 缓存 DOM 元素引用
     * @private
     */
    _cacheElements() {
        this.elements = {
            // 面板
            startPanel: document.getElementById('startPanel'),
            playPanel: document.getElementById('playPanel'),
            countdownPanel: document.getElementById('countdownPanel'),
            resultPanel: document.getElementById('resultPanel'),
            statsPanel: document.getElementById('statsPanel'),
            
            // 气泡容器
            bubbleContainer: document.getElementById('bubbleContainer'),
            
            // 计时器
            timerDisplay: document.getElementById('timerDisplay'),
            progressBar: document.getElementById('progressBar'),
            countdownText: document.getElementById('countdownText'),
            
            // 结果面板
            emotionTags: document.getElementById('emotionTags'),
            aiSuggestion: document.getElementById('aiSuggestion'),
            
            // 统计面板
            statsList: document.getElementById('statsList'),
            statTotalPopped: document.getElementById('statTotalPopped'),
            statTotalDays: document.getElementById('statTotalDays'),
            statAvgPerDay: document.getElementById('statAvgPerDay'),
            categoryList: document.getElementById('categoryList'),
            topList: document.getElementById('topList'),
            trendChart: document.getElementById('trendChart'),
            
            // 按钮
            startBtn: document.getElementById('startBtn'),
            restartBtn: document.getElementById('restartBtn'),
            closeResultBtn: document.getElementById('closeResultBtn'),
            shareBtn: document.getElementById('shareBtn'),
            statsBtn: document.getElementById('statsBtn'),
            clearStatsBtn: document.getElementById('clearStatsBtn'),
            backBtn: document.getElementById('backBtn'),
            endEarlyBtn: document.getElementById('endEarlyBtn'),
            
            // 星空
            stars: document.getElementById('stars'),
        };
    }

    /**
     * 初始化星空背景
     * @private
     */
    _initStars() {
        const container = this.elements.stars;
        if (!container) return;

        for (let i = 0; i < CONFIG.STARS.COUNT; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = star.style.height = 
                (Math.random() * CONFIG.STARS.SIZE_RANGE + CONFIG.STARS.MIN_SIZE) + 'px';
            star.style.animationDelay = Math.random() * 3 + 's';
            container.appendChild(star);
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        const { elements } = this;

        // 开始按钮
        elements.startBtn?.addEventListener('click', () => {
            gameController.start();
        });

        // 重新开始按钮
        elements.restartBtn?.addEventListener('click', () => {
            gameController.restart();
        });

            // 关闭结果按钮
        elements.closeResultBtn?.addEventListener('click', () => {
            gameController.closeResult();
        });

        // 分享按钮
        elements.shareBtn?.addEventListener('click', async () => {
            // 获取当前游戏结果数据
            const emotions = gameController.poppedEmotions || [];
            const duration = gameController.duration || 60;
            const suggestion = elements.aiSuggestion?.textContent || '';
            
            if (emotions.length === 0) {
                alert('还没有戳破任何情绪气泡哦～');
                return;
            }
            
            // 显示 loading 状态
            const originalText = elements.shareBtn.textContent;
            elements.shareBtn.disabled = true;
            elements.shareBtn.textContent = '生成中...';
            
            try {
                // 统计情绪出现次数
                const counts = {};
                emotions.forEach(e => counts[e] = (counts[e] || 0) + 1);
                const sortedEmotions = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([e]) => e);
                
                // 生成分享卡片
                const cardData = {
                    emotions: sortedEmotions,
                    duration: duration,
                    suggestion: suggestion
                };
                
                const dataURL = shareManager.generateCard(cardData);
                
                // 尝试复制到剪贴板
                const copied = await shareManager.copyToClipboard(dataURL);
                if (copied) {
                    alert('✅ 图片已复制到剪贴板！\n可以直接粘贴到微信/微博分享～');
                } else {
                    // 降级为下载
                    const saved = await shareManager.saveImage(dataURL, '念起分享.png');
                    if (saved) {
                        alert('✅ 图片已保存！\n请在相册中找到「念起分享.png」分享～');
                    } else {
                        alert('抱歉，当前浏览器不支持分享功能。\n请尝试使用最新版 Chrome 或 Safari。');
                    }
                }
            } catch (error) {
                console.error('分享失败:', error);
                alert('生成分享图片时出错，请重试～');
            } finally {
                // 恢复按钮状态
                elements.shareBtn.disabled = false;
                elements.shareBtn.textContent = originalText;
            }
        });

        // 统计按钮
        elements.statsBtn?.addEventListener('click', () => {
            gameController.showStats();
        });

        // 时间筛选按钮
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const range = btn.dataset.range;
                gameController.updateStatsRange(range);
            });
        });

        // 清空历史按钮
        elements.clearStatsBtn?.addEventListener('click', () => {
            if (confirm('确定清空所有历史记录？')) {
                gameController.clearHistory();
            }
        });

        // 返回按钮
        elements.backBtn?.addEventListener('click', () => {
            gameController.closeStats();
        });

        // 提前结束按钮
        elements.endEarlyBtn?.addEventListener('click', () => {
            gameController.endEarly();
        });

        // 主题选择
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                gameController.setTheme(btn.dataset.theme);
            });
        });

        // 时间选择
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                gameController.setDuration(parseInt(btn.dataset.time));
            });
        });
    }

    /**
     * 初始化游戏控制器
     * @private
     */
    _initGameController() {
        gameController.init(this.elements);
        
        // 监听状态变化
        gameController.onStateChange = (state) => {
            this._updateUI(state);
        };
    }

    /**
     * 根据游戏状态更新 UI
     * @private
     */
    _updateUI(state) {
        const { elements } = this;

        // 隐藏所有面板
        elements.startPanel.style.display = 'none';
        elements.playPanel.style.display = 'none';
        elements.countdownPanel.style.display = 'none';
        elements.resultPanel.style.display = 'none';
        elements.resultPanel.classList.remove('show');
        elements.statsPanel.style.display = 'none';

        // 根据状态显示对应面板
        switch (state) {
            case GameState.IDLE:
                elements.startPanel.style.display = 'flex';
                break;
                
            case GameState.COUNTDOWN:
                elements.countdownPanel.style.display = 'flex';
                break;
                
            case GameState.PLAYING:
                elements.playPanel.style.display = 'block';
                break;
                
            case GameState.RESULT:
                elements.playPanel.style.display = 'none';
                elements.resultPanel.style.display = 'flex';
                elements.resultPanel.classList.add('show');
                break;
                
            case GameState.STATS:
                elements.statsPanel.style.display = 'flex';
                break;
        }
    }
}

// DOM 加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
