/**
 * 念起 - 入口文件
 * 
 * 负责 DOM 初始化、事件绑定和状态管理
 */

import { CONFIG } from './constants.js';
import { gameController, GameState } from './game.js';
import { shareManager } from './share.js';
import { reminderManager } from './reminder.js';

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
        
        // 初始化提醒管理器
        reminderManager.init();
        this._initReminderUI();
        
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
            
            // 提醒
            reminderPanel: document.getElementById('reminderPanel'),
            reminderToggleBtn: document.getElementById('reminderToggleBtn'),
            reminderToggle: document.getElementById('reminderToggle'),
            reminderTimeWrapper: document.getElementById('reminderTimeWrapper'),
            reminderTime: document.getElementById('reminderTime'),
            closeReminderBtn: document.getElementById('closeReminderBtn'),
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
            const emotions = gameController.poppedEmotions || [];
            const duration = gameController.duration || 60;
            const suggestion = elements.aiSuggestion?.textContent || '';
            
            if (emotions.length === 0) {
                shareManager.showToast('empty');
                return;
            }
            
            const originalText = elements.shareBtn.textContent;
            elements.shareBtn.disabled = true;
            elements.shareBtn.textContent = '生成中...';
            
            try {
                const counts = {};
                emotions.forEach(e => counts[e] = (counts[e] || 0) + 1);
                const sortedEmotions = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([e]) => e);
                
                const cardData = {
                    emotions: sortedEmotions,
                    duration: duration,
                    suggestion: suggestion
                };
                
                const dataURL = shareManager.generateCard(cardData);
                
                const copied = await shareManager.copyToClipboard(dataURL);
                if (copied) {
                    shareManager.showToast('copied');
                } else {
                    const saved = await shareManager.saveImage(dataURL, '念起分享.png');
                    if (saved) {
                        shareManager.showToast('saved');
                    } else {
                        shareManager.showToast('error');
                    }
                }
            } catch (error) {
                console.error('分享失败:', error);
                shareManager.showToast('error');
            } finally {
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

    /**
     * 初始化提醒 UI
     * @private
     */
    _initReminderUI() {
        const { elements } = this;
        
        // 获取 DOM 元素
        const reminderPanel = elements.reminderPanel;
        const reminderToggleBtn = elements.reminderToggleBtn;
        const reminderToggle = elements.reminderToggle;
        const reminderTimeWrapper = elements.reminderTimeWrapper;
        const reminderTime = elements.reminderTime;
        const closeReminderBtn = elements.closeReminderBtn;
        
        if (!reminderPanel || !reminderToggleBtn || !reminderToggle || !reminderTime) {
            return;
        }
        
        // 加载当前设置
        const settings = reminderManager.getSettings();
        
        // 检查通知支持状态
        if (!settings.supported) {
            reminderToggleBtn.style.display = 'none';
            return;
        }

        const render = (state = reminderManager.getSettings()) => {
            reminderToggle.checked = state.enabled;
            reminderTime.value = state.time;
            // 时间选择器始终显示，但未开启时降低透明度
            if (reminderTimeWrapper) {
                reminderTimeWrapper.style.opacity = state.enabled ? '1' : '0.5';
                reminderTimeWrapper.style.pointerEvents = state.enabled ? 'auto' : 'none';
            }
        };

        reminderManager.subscribe((state) => {
            render(state);
        });

        // 点击打开模态框
        reminderToggleBtn.addEventListener('click', () => {
            render();
            reminderPanel.classList.add('show');
        });

        // 关闭模态框
        const closeModal = () => {
            reminderPanel.classList.remove('show');
        };

        closeReminderBtn?.addEventListener('click', closeModal);

        // 点击遮罩关闭
        reminderPanel.addEventListener('click', (e) => {
            if (e.target === reminderPanel) {
                closeModal();
            }
        });

        // 开关事件
        reminderToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            const success = await reminderManager.setEnabled(enabled);
            const latest = reminderManager.getSettings();

            if (!success && latest.permission === 'denied') {
                alert('通知功能已被拒绝，请在浏览器设置中手动开启');
            }

            render(latest);
        });
        
        // 时间选择事件
        reminderTime.addEventListener('change', (e) => {
            const updated = reminderManager.setTime(e.target.value);
            if (!updated) {
                reminderTime.value = reminderManager.getSettings().time;
                alert('请选择有效时间（格式：HH:MM）');
            }
            render();
        });

        render(settings);
    }
}

// DOM 加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
