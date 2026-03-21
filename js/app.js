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
const THEME_ORDER = ['healing', 'forest', 'sunset'];

class App {
    constructor() {
        this.elements = {};
        /** 滑动切换主题后短暂忽略圆点点击，避免误触 */
        this._suppressThemeClickUntil = 0;
    }

    /**
     * 启动应用
     */
    init() {
        this._cacheElements();
        this._initStars();
        this._bindEvents();
        this._initGameController();
        this._initThemeSwipe();
        this._syncStatsRangeFilterUI(gameController.statsRange);

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
            settingsPanel: document.getElementById('settingsPanel'),
            
            // 气泡容器
            bubbleContainer: document.getElementById('bubbleContainer'),
            
            // 计时器
            timerDisplay: document.getElementById('timerDisplay'),
            progressBar: document.getElementById('progressBar'),
            countdownText: document.getElementById('countdownText'),
            countdownBreathingText: document.getElementById('countdownBreathingText'),
            countdownHalo: document.getElementById('countdownHalo'),
            
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
            settingsBtn: document.getElementById('settingsBtn'),
            statsSettingsBtn: document.getElementById('statsSettingsBtn'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            clearStatsBtn: document.getElementById('clearStatsBtn'),
            exportCsvBtn: document.getElementById('exportCsvBtn'),
            exportJsonBtn: document.getElementById('exportJsonBtn'),
            importHistoryBtn: document.getElementById('importHistoryBtn'),
            importHistoryInput: document.getElementById('importHistoryInput'),
            backBtn: document.getElementById('backBtn'),
            endEarlyBtn: document.getElementById('endEarlyBtn'),
            skipCountdownBtn: document.getElementById('skipCountdownBtn'),
            
            // 星空
            stars: document.getElementById('stars'),
            
            // 提醒
            reminderPanel: document.getElementById('reminderPanel'),
            reminderToggleBtn: document.getElementById('reminderToggleBtn'),
            reminderToggle: document.getElementById('reminderToggle'),
            reminderTimeWrapper: document.getElementById('reminderTimeWrapper'),
            reminderTime: document.getElementById('reminderTime'),
            closeReminderBtn: document.getElementById('closeReminderBtn'),
            
            // 成就系统
            achievementsGrid: document.getElementById('achievementsGrid'),
            unlockedCount: document.getElementById('unlockedCount'),
            totalCount: document.getElementById('totalCount'),
            achievementNext: document.getElementById('achievementNext'),
            achievementToast: document.getElementById('achievementToast'),
            toastIcon: document.getElementById('toastIcon'),
            toastName: document.getElementById('toastName'),
            achievementDetail: document.getElementById('achievementDetail'),
            detailIcon: document.getElementById('detailIcon'),
            detailName: document.getElementById('detailName'),
            detailDesc: document.getElementById('detailDesc'),
            detailStatus: document.getElementById('detailStatus'),
            closeDetailBtn: document.getElementById('closeDetailBtn'),
        };
    }

    /**
     * 应用主题并同步圆点 UI
     * @private
     * @param {string} themeId
     */
    _applyTheme(themeId) {
        if (!themeId) return;
        document.querySelectorAll('.theme-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.theme === themeId);
        });
        gameController.setTheme(themeId);
    }

    /**
     * 首页整屏左右滑动切换主题（触摸）
     * 从按钮、链接、输入框等开始的滑动不触发，避免误操作
     * @private
     */
    _initThemeSwipe() {
        const panel = this.elements.startPanel;
        if (!panel) return;

        let startX = 0;
        let startY = 0;
        let tracking = false;
        let horizontal = false;
        let ignoreGesture = false;

        const isExcludedTarget = (target) => {
            if (!target || typeof target.closest !== 'function') return false;
            return Boolean(
                target.closest(
                    'button, a, input, textarea, select, label, [data-no-theme-swipe]'
                )
            );
        };

        panel.addEventListener(
            'touchstart',
            (e) => {
                if (e.touches.length !== 1) return;
                ignoreGesture = isExcludedTarget(e.target);
                if (ignoreGesture) {
                    tracking = false;
                    return;
                }
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                tracking = true;
                horizontal = false;
            },
            { passive: true }
        );

        panel.addEventListener(
            'touchmove',
            (e) => {
                if (!tracking || ignoreGesture || e.touches.length !== 1) return;
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 0.65) {
                    horizontal = true;
                }
            },
            { passive: true }
        );

        const resetGesture = () => {
            tracking = false;
            horizontal = false;
            ignoreGesture = false;
        };

        panel.addEventListener(
            'touchend',
            (e) => {
                if (ignoreGesture) {
                    resetGesture();
                    return;
                }
                if (!tracking) return;
                tracking = false;
                if (!horizontal || e.changedTouches.length !== 1) return;

                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;

                const current = gameController.currentTheme || 'healing';
                let idx = THEME_ORDER.indexOf(current);
                if (idx < 0) idx = 0;

                if (dx < 0) {
                    idx = (idx + 1) % THEME_ORDER.length;
                } else {
                    idx = (idx - 1 + THEME_ORDER.length) % THEME_ORDER.length;
                }

                const next = THEME_ORDER[idx];
                this._suppressThemeClickUntil = Date.now() + 380;
                this._applyTheme(next);

                try {
                    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
                    if (!reduceMotion && typeof navigator.vibrate === 'function') {
                        navigator.vibrate(10);
                    }
                } catch {
                    /* ignore */
                }

                e.preventDefault();
            },
            { passive: false }
        );

        panel.addEventListener('touchcancel', resetGesture, { passive: true });
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

        // 设置（首页 / 统计页）
        elements.settingsBtn?.addEventListener('click', () => {
            gameController.openSettings();
        });
        elements.statsSettingsBtn?.addEventListener('click', () => {
            gameController.openSettings();
        });
        elements.closeSettingsBtn?.addEventListener('click', () => {
            gameController.closeSettings();
        });

        // 时间筛选（统计页与设置页两组按钮保持同步）
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const range = btn.dataset.range;
                document.querySelectorAll('.filter-btn').forEach((b) => {
                    b.classList.toggle('active', b.dataset.range === range);
                });
                gameController.updateStatsRange(range);
            });
        });

        // 清空历史（设置页）
        elements.clearStatsBtn?.addEventListener('click', () => {
            if (
                confirm(
                    '确定清空所有历史记录与成就进度？\n\n此操作不可恢复，建议先导出 JSON 备份。'
                )
            ) {
                gameController.clearHistory();
                alert('已清空');
            }
        });

        // 导出 CSV / JSON：优先 Web Share，否则下载
        elements.exportCsvBtn?.addEventListener('click', async () => {
            try {
                const r = await gameController.exportHistoryCsv();
                if (r === 'shared') shareManager.showToast('export_shared');
                else if (r === 'downloaded') shareManager.showToast('export_downloaded');
            } catch (err) {
                console.error(err);
                shareManager.showToast('error');
            }
        });
        elements.exportJsonBtn?.addEventListener('click', async () => {
            try {
                const r = await gameController.exportFullBackup();
                if (r === 'shared') shareManager.showToast('export_shared');
                else if (r === 'downloaded') shareManager.showToast('export_downloaded');
            } catch (err) {
                console.error(err);
                shareManager.showToast('error');
            }
        });
        elements.importHistoryBtn?.addEventListener('click', () => {
            elements.importHistoryInput?.click();
        });
        elements.importHistoryInput?.addEventListener('change', async (e) => {
            const input = e.target;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;

            let text;
            try {
                text = await file.text();
            } catch (err) {
                console.error(err);
                alert('读取文件失败');
                return;
            }

            const merge = confirm(
                '「确定」= 与现有记录合并（同一天同一情绪次数会相加）\n\n「取消」= 用文件替换本地记录（JSON 若含成就也会按此规则处理成就）'
            );
            const mode = merge ? 'merge' : 'replace';
            const result = gameController.importHistoryFromFile(text, file.name, mode);
            if (!result.ok) {
                alert(result.error || '导入失败');
                return;
            }
            alert('导入成功');
            if (
                gameController.state === GameState.STATS ||
                gameController.state === GameState.SETTINGS
            ) {
                this._renderAchievements();
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

        // 跳过倒计时
        elements.skipCountdownBtn?.addEventListener('click', () => {
            gameController.skipCountdown();
        });

        // 主题选择（点击圆点）
        document.querySelectorAll('.theme-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (Date.now() < this._suppressThemeClickUntil) return;
                this._applyTheme(btn.dataset.theme);
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
        
        // 成就详情关闭
        elements.closeDetailBtn?.addEventListener('click', () => {
            this._hideAchievementDetail();
        });
        
        elements.achievementDetail?.addEventListener('click', (e) => {
            if (e.target === elements.achievementDetail) {
                this._hideAchievementDetail();
            }
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
        
        // 监听成就解锁
        gameController.onAchievementUnlock = (newAchievements) => {
            this._showAchievementToast(newAchievements);
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
        if (elements.settingsPanel) elements.settingsPanel.style.display = 'none';

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
                this._renderAchievements();
                this._syncStatsRangeFilterUI(gameController.statsRange);
                break;

            case GameState.SETTINGS:
                if (elements.settingsPanel) {
                    elements.settingsPanel.style.display = 'flex';
                    this._syncStatsRangeFilterUI(gameController.statsRange);
                }
                break;
        }
    }

    /**
     * 统计页与设置页的「本周/本月/全部」按钮同步高亮
     * @private
     * @param {string} range
     */
    _syncStatsRangeFilterUI(range) {
        const r = range || 'week';
        document.querySelectorAll('.filter-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.range === r);
        });
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
        
        // 检查通知支持状态，支持时才显示按钮（避免闪烁）
        if (!settings.supported) {
            return;
        }
        reminderToggleBtn.classList.add('supported');

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

    /**
     * 渲染成就系统
     * @private
     */
    _renderAchievements() {
        const { elements } = this;
        if (!elements.achievementsGrid) return;
        
        const data = gameController.getAchievementData();
        
        // 更新计数
        if (elements.unlockedCount) {
            elements.unlockedCount.textContent = data.unlockedCount;
        }
        if (elements.totalCount) {
            elements.totalCount.textContent = data.totalCount;
        }
        
        // 渲染徽章网格
        elements.achievementsGrid.innerHTML = data.achievements.map(achievement => `
            <div class="achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                 data-id="${achievement.id}"
                 title="${achievement.name}">
                ${achievement.icon}
                ${!achievement.unlocked ? '<span class="lock-icon">🔒</span>' : ''}
            </div>
        `).join('');
        
        // 绑定点击事件
        elements.achievementsGrid.querySelectorAll('.achievement-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                const id = badge.dataset.id;
                const achievement = data.achievements.find(a => a.id === id);
                if (achievement) {
                    this._showAchievementDetail(achievement);
                }
            });
        });
        
        // 渲染下一个成就进度
        this._renderNextAchievement(data.nextAchievement);
    }

    /**
     * 渲染下一个成就进度
     * @private
     */
    _renderNextAchievement(nextAchievement) {
        const { achievementNext } = this.elements;
        if (!achievementNext) return;
        
        if (!nextAchievement) {
            achievementNext.classList.remove('show');
            return;
        }
        
        achievementNext.classList.add('show');
        achievementNext.innerHTML = `
            <div class="achievement-next-header">
                <span class="achievement-next-icon">${nextAchievement.icon}</span>
                <div class="achievement-next-info">
                    <div class="achievement-next-name">${nextAchievement.name}</div>
                    <div class="achievement-next-desc">${nextAchievement.description}</div>
                </div>
            </div>
            <div class="achievement-progress-bar">
                <div class="achievement-progress-fill" style="width: ${nextAchievement.progress.percentage}%"></div>
            </div>
            <div class="achievement-progress-text">${nextAchievement.progress.current} / ${nextAchievement.progress.target}</div>
        `;
    }

    /**
     * 显示成就解锁通知
     * @private
     */
    _showAchievementToast(achievements) {
        const { achievementToast, toastIcon, toastName } = this.elements;
        if (!achievementToast || achievements.length === 0) return;
        
        let index = 0;
        
        const showNext = () => {
            if (index >= achievements.length) return;
            
            const achievement = achievements[index];
            toastIcon.textContent = achievement.icon;
            toastName.textContent = achievement.name;
            
            achievementToast.classList.add('show');
            
            setTimeout(() => {
                achievementToast.classList.remove('show');
                index++;
                
                if (index < achievements.length) {
                    setTimeout(showNext, 500);
                }
            }, 3000);
        };
        
        showNext();
    }

    /**
     * 显示成就详情弹窗
     * @private
     */
    _showAchievementDetail(achievement) {
        const { achievementDetail, detailIcon, detailName, detailDesc, detailStatus } = this.elements;
        if (!achievementDetail) return;
        
        detailIcon.textContent = achievement.icon;
        detailName.textContent = achievement.name;
        detailDesc.textContent = achievement.description;
        
        if (achievement.unlocked) {
            const date = new Date(achievement.unlockedAt);
            const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
            detailStatus.textContent = `✓ 已于 ${dateStr} 解锁`;
            detailStatus.classList.add('unlocked');
        } else {
            if (achievement.progress.showProgress) {
                detailStatus.textContent = `进度: ${achievement.progress.current} / ${achievement.progress.target}`;
            } else {
                detailStatus.textContent = '尚未解锁';
            }
            detailStatus.classList.remove('unlocked');
        }
        
        achievementDetail.classList.add('show');
    }

    /**
     * 隐藏成就详情弹窗
     * @private
     */
    _hideAchievementDetail() {
        this.elements.achievementDetail?.classList.remove('show');
    }
}

// DOM 加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
