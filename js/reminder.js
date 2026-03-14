/**
 * 每日提醒模块
 * 管理提醒时间设置和浏览器通知
 */

import { STORAGE_KEYS } from './constants.js';

const DEFAULT_REMINDER_TIME = '21:00';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * 每日提醒管理器
 */
class ReminderManager {
    constructor() {
        this.enabled = false;
        this.time = DEFAULT_REMINDER_TIME;
        this.hasStoredTime = false;
        this.timer = null;
        this.permission = 'default';
        this.listeners = new Set();
    }

    /**
     * 初始化
     */
    init() {
        this._loadSettings();
        this._checkPermission();

        // 仅在“已开启且已授权”时调度提醒，避免误触发
        if (this.enabled && this.permission === 'granted') {
            this._startTimer();
        } else {
            this._stopTimer();
        }

        this._emitChange();
        
        // 页面可见性变化时重新检查
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const previousPermission = this.permission;
                this._checkPermission();
                this._syncTimerWithCurrentState(previousPermission);
            }
        });
    }

    /**
     * 加载设置
     * @private
     */
    _loadSettings() {
        try {
            const enabled = localStorage.getItem(STORAGE_KEYS.REMINDER.ENABLED);
            const time = localStorage.getItem(STORAGE_KEYS.REMINDER.TIME);
            
            this.enabled = enabled === 'true';
            this.hasStoredTime = this._isValidTime(time);
            this.time = this.hasStoredTime ? time : DEFAULT_REMINDER_TIME;
        } catch (e) {
            console.warn('Failed to load reminder settings:', e);
        }
    }

    /**
     * 保存设置
     * @private
     */
    _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEYS.REMINDER.ENABLED, String(this.enabled));
            localStorage.setItem(STORAGE_KEYS.REMINDER.TIME, this.time);
        } catch (e) {
            console.warn('Failed to save reminder settings:', e);
        }
    }

    /**
     * 检查通知权限
     * @private
     */
    _checkPermission() {
        if (!('Notification' in window)) {
            this.permission = 'denied';
            return;
        }
        this.permission = Notification.permission;
    }

    /**
     * 请求通知权限
     * @returns {Promise<boolean>}
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            alert('当前浏览器不支持通知功能');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            this._emitChange();
            return permission === 'granted';
        } catch (e) {
            console.error('Failed to request notification permission:', e);
            return false;
        }
    }

    /**
     * 设置提醒开关
     * @param {boolean} enabled - 是否开启
     */
    async setEnabled(enabled) {
        if (enabled && this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                return false;
            }
        }
        
        this.enabled = enabled;
        this._saveSettings();
        
        if (enabled) {
            this._startTimer();
        } else {
            this._stopTimer();
        }

        this._emitChange();
        
        return true;
    }

    /**
     * 设置提醒时间
     * @param {string} time - 时间字符串 HH:MM
     */
    setTime(time) {
        if (!this._isValidTime(time)) {
            return false;
        }

        this.time = time;
        this.hasStoredTime = true;
        this._saveSettings();
        
        // 重新启动定时器
        if (this.enabled) {
            this._startTimer();
        }

        this._emitChange();
        return true;
    }

    /**
     * 获取当前设置
     * @returns {Object}
     */
    getSettings() {
        return {
            enabled: this.enabled,
            time: this.time,
            hasStoredTime: this.hasStoredTime,
            permission: this.permission,
            supported: 'Notification' in window
        };
    }

    /**
     * 订阅设置变化
     * @param {(settings: ReturnType<ReminderManager['getSettings']>) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }

        this.listeners.add(listener);
        listener(this.getSettings());

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 启动定时器
     * @private
     */
    _startTimer() {
        this._stopTimer();

        if (!this.enabled || this.permission !== 'granted') {
            return;
        }
        
        const now = new Date();
        const [hours, minutes] = this.time.split(':').map(Number);
        
        let target = new Date();
        target.setHours(hours, minutes, 0, 0);
        
        // 如果今天已经过了，就设置为明天
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
        
        const delay = target.getTime() - now.getTime();
        
        console.log(`[Reminder] 下次提醒时间: ${target.toLocaleString()}, 等待 ${Math.round(delay / 1000 / 60)} 分钟`);
        
        this.timer = setTimeout(() => {
            this._sendNotification();
            // 再次设置明天的提醒
            this._startTimer();
        }, delay);
    }

    /**
     * 停止定时器
     * @private
     */
    _stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * 发送通知
     * @private
     */
    _sendNotification() {
        if (!this.enabled || this.permission !== 'granted') {
            return;
        }
        
        const messages = [
            '此刻念头浮动，来戳破气泡放松一下吧～',
            '给自己一个觉察情绪的时刻',
            '心中的气泡需要释放了吗？',
            '停下来，和自己待一会儿',
            '情绪需要被看见，来记录一下吧'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        try {
            const notification = new Notification('念起', {
                body: randomMessage,
                icon: 'nianqi-icon.png',
                badge: 'nianqi-icon.png',
                tag: 'nianqi-reminder',
                requireInteraction: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // 5秒后自动关闭
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            console.log('[Reminder] 通知已发送');
        } catch (e) {
            console.error('Failed to send notification:', e);
        }
    }

    /**
     * 校验时间字符串
     * @param {string | null} time
     * @returns {boolean}
     * @private
     */
    _isValidTime(time) {
        return typeof time === 'string' && TIME_PATTERN.test(time);
    }

    /**
     * 权限变化后同步定时器状态
     * @param {string} previousPermission
     * @private
     */
    _syncTimerWithCurrentState(previousPermission) {
        if (!this.enabled) {
            this._stopTimer();
            this._emitChange();
            return;
        }

        if (this.permission === 'granted') {
            if (previousPermission !== 'granted' || !this.timer) {
                this._startTimer();
            }
            this._emitChange();
            return;
        }

        // 权限被回收后立即停用并持久化，避免 UI 与真实状态不一致
        this.enabled = false;
        this._saveSettings();
        this._stopTimer();
        this._emitChange();
    }

    /**
     * 测试通知
     */
    async test() {
        if (this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                return false;
            }
        }
        
        this._sendNotification();
        return true;
    }

    /**
     * 广播设置变化
     * @private
     */
    _emitChange() {
        const snapshot = this.getSettings();
        this.listeners.forEach(listener => {
            try {
                listener(snapshot);
            } catch (e) {
                console.warn('Reminder listener failed:', e);
            }
        });
    }
}

// 导出单例
export const reminderManager = new ReminderManager();
