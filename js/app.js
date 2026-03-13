/**
 * 情绪气泡 - 入口文件
 * 
 * 负责 DOM 初始化、事件绑定和状态管理
 */

import { CONFIG } from './constants.js';
import { gameController, GameState } from './game.js';

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
        
        console.log('🫧 情绪气泡已加载');
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
            
            // 按钮
            startBtn: document.getElementById('startBtn'),
            restartBtn: document.getElementById('restartBtn'),
            closeResultBtn: document.getElementById('closeResultBtn'),
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

        // 统计按钮
        elements.statsBtn?.addEventListener('click', () => {
            gameController.showStats();
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
