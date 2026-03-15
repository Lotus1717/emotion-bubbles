/**
 * 成就系统模块
 * 管理成就定义、检测和解锁逻辑
 */

import { EMOTION_TREE } from './emotions.js';

// 成就类别
export const ACHIEVEMENT_CATEGORIES = {
    BUBBLE: 'bubble',      // 气泡之旅
    STREAK: 'streak',      // 坚持之路
    EXPLORE: 'explore',    // 情绪探索
    SPECIAL: 'special',    // 特别时刻
};

// 成就定义
export const ACHIEVEMENTS = [
    // ========== 气泡之旅 ==========
    {
        id: 'first_pop',
        name: '初次觉察',
        description: '戳破第一个情绪气泡',
        icon: '🫧',
        category: ACHIEVEMENT_CATEGORIES.BUBBLE,
        condition: { type: 'total_popped', value: 1 },
    },
    {
        id: 'pop_100',
        name: '百泡释怀',
        description: '累计戳破 100 个气泡',
        icon: '💭',
        category: ACHIEVEMENT_CATEGORIES.BUBBLE,
        condition: { type: 'total_popped', value: 100 },
    },
    {
        id: 'pop_500',
        name: '五百念轻',
        description: '累计戳破 500 个气泡',
        icon: '🌊',
        category: ACHIEVEMENT_CATEGORIES.BUBBLE,
        condition: { type: 'total_popped', value: 500 },
    },
    {
        id: 'pop_1000',
        name: '千念轻放',
        description: '累计戳破 1000 个气泡',
        icon: '✨',
        category: ACHIEVEMENT_CATEGORIES.BUBBLE,
        condition: { type: 'total_popped', value: 1000 },
    },
    {
        id: 'pop_10000',
        name: '万象皆空',
        description: '累计戳破 10000 个气泡',
        icon: '🌌',
        category: ACHIEVEMENT_CATEGORIES.BUBBLE,
        condition: { type: 'total_popped', value: 10000 },
    },

    // ========== 坚持之路 ==========
    {
        id: 'first_session',
        name: '初心',
        description: '完成第一次练习',
        icon: '🌱',
        category: ACHIEVEMENT_CATEGORIES.STREAK,
        condition: { type: 'total_days', value: 1 },
    },
    {
        id: 'days_3',
        name: '三日清明',
        description: '累计练习 3 天',
        icon: '🌿',
        category: ACHIEVEMENT_CATEGORIES.STREAK,
        condition: { type: 'total_days', value: 3 },
    },
    {
        id: 'days_7',
        name: '七日静心',
        description: '累计练习 7 天',
        icon: '🍃',
        category: ACHIEVEMENT_CATEGORIES.STREAK,
        condition: { type: 'total_days', value: 7 },
    },
    {
        id: 'days_30',
        name: '月光常驻',
        description: '累计练习 30 天',
        icon: '🌙',
        category: ACHIEVEMENT_CATEGORIES.STREAK,
        condition: { type: 'total_days', value: 30 },
    },

    // ========== 情绪探索 ==========
    {
        id: 'explore_5',
        name: '情绪觉知',
        description: '戳破 5 种不同情绪',
        icon: '🔍',
        category: ACHIEVEMENT_CATEGORIES.EXPLORE,
        condition: { type: 'unique_emotions', value: 5 },
    },
    {
        id: 'explore_15',
        name: '心海拾贝',
        description: '戳破 15 种不同情绪',
        icon: '🐚',
        category: ACHIEVEMENT_CATEGORIES.EXPLORE,
        condition: { type: 'unique_emotions', value: 15 },
    },
    {
        id: 'explore_30',
        name: '情绪收藏家',
        description: '戳破 30 种不同情绪',
        icon: '📚',
        category: ACHIEVEMENT_CATEGORIES.EXPLORE,
        condition: { type: 'unique_emotions', value: 30 },
    },
    {
        id: 'anxiety_50',
        name: '焦虑克星',
        description: '累计释放 50 个焦虑类气泡',
        icon: '🛡️',
        category: ACHIEVEMENT_CATEGORIES.EXPLORE,
        condition: { type: 'category_popped', category: '焦虑', value: 50 },
    },

    // ========== 特别时刻 ==========
    {
        id: 'night_owl',
        name: '夜间守护',
        description: '在 22:00-06:00 完成练习',
        icon: '🦉',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        condition: { type: 'time_range', startHour: 22, endHour: 6 },
    },
    {
        id: 'early_bird',
        name: '清晨觉醒',
        description: '在 06:00-09:00 完成练习',
        icon: '🌅',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        condition: { type: 'time_range', startHour: 6, endHour: 9 },
    },
    {
        id: 'focus_master',
        name: '专注大师',
        description: '单次练习戳破 30 个以上气泡',
        icon: '🎯',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        condition: { type: 'single_session_popped', value: 30 },
    },
    {
        id: 'emotion_tide',
        name: '情绪潮汐',
        description: '单次练习涵盖 8 种以上不同情绪',
        icon: '🌈',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        condition: { type: 'single_session_unique', value: 8 },
    },
];

// 本地存储键
const STORAGE_KEY = 'emotionBubbleAchievements';

/**
 * 成就管理器
 */
class AchievementManager {
    constructor() {
        this.unlockedAchievements = {};
        this.onUnlock = null;  // 解锁回调
    }

    /**
     * 初始化
     */
    init() {
        this._loadProgress();
    }

    /**
     * 加载成就进度
     * @private
     */
    _loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            this.unlockedAchievements = saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn('Failed to load achievements:', e);
            this.unlockedAchievements = {};
        }
    }

    /**
     * 保存成就进度
     * @private
     */
    _saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlockedAchievements));
        } catch (e) {
            console.warn('Failed to save achievements:', e);
        }
    }

    /**
     * 检查并解锁成就
     * @param {Object} stats - 统计数据
     * @param {Object} sessionData - 本次会话数据
     * @returns {Array} 新解锁的成就列表
     */
    checkAndUnlock(stats, sessionData = {}) {
        const newlyUnlocked = [];

        for (const achievement of ACHIEVEMENTS) {
            if (this.isUnlocked(achievement.id)) continue;

            const unlocked = this._checkCondition(achievement, stats, sessionData);
            if (unlocked) {
                this._unlock(achievement.id);
                newlyUnlocked.push(achievement);
            }
        }

        if (newlyUnlocked.length > 0) {
            this._saveProgress();
            if (this.onUnlock) {
                this.onUnlock(newlyUnlocked);
            }
        }

        return newlyUnlocked;
    }

    /**
     * 检查单个成就条件
     * @private
     */
    _checkCondition(achievement, stats, sessionData) {
        const { condition } = achievement;

        switch (condition.type) {
            case 'total_popped':
                return stats.totalPopped >= condition.value;

            case 'total_days':
                return stats.totalDays >= condition.value;

            case 'unique_emotions':
                return stats.uniqueEmotions >= condition.value;

            case 'category_popped':
                const categoryCount = stats.categoryBreakdown?.[condition.category]?.count || 0;
                return categoryCount >= condition.value;

            case 'time_range':
                const hour = new Date().getHours();
                if (condition.startHour > condition.endHour) {
                    // 跨越午夜（如 22:00-06:00）
                    return hour >= condition.startHour || hour < condition.endHour;
                } else {
                    return hour >= condition.startHour && hour < condition.endHour;
                }

            case 'single_session_popped':
                return (sessionData.poppedCount || 0) >= condition.value;

            case 'single_session_unique':
                return (sessionData.uniqueCount || 0) >= condition.value;

            default:
                return false;
        }
    }

    /**
     * 解锁成就
     * @private
     */
    _unlock(achievementId) {
        this.unlockedAchievements[achievementId] = {
            unlocked: true,
            unlockedAt: new Date().toISOString(),
        };
    }

    /**
     * 检查成就是否已解锁
     * @param {string} achievementId
     * @returns {boolean}
     */
    isUnlocked(achievementId) {
        return !!this.unlockedAchievements[achievementId]?.unlocked;
    }

    /**
     * 获取成就进度（用于显示进度条）
     * @param {Object} achievement - 成就定义
     * @param {Object} stats - 统计数据
     * @returns {Object} { current, target, percentage }
     */
    getProgress(achievement, stats) {
        const { condition } = achievement;
        let current = 0;
        let target = condition.value || 1;

        switch (condition.type) {
            case 'total_popped':
                current = stats.totalPopped || 0;
                break;

            case 'total_days':
                current = stats.totalDays || 0;
                break;

            case 'unique_emotions':
                current = stats.uniqueEmotions || 0;
                break;

            case 'category_popped':
                current = stats.categoryBreakdown?.[condition.category]?.count || 0;
                break;

            case 'time_range':
            case 'single_session_popped':
            case 'single_session_unique':
                // 这些是一次性条件，不显示进度
                return { current: 0, target: 1, percentage: 0, showProgress: false };

            default:
                break;
        }

        const percentage = Math.min((current / target) * 100, 100);
        return { current, target, percentage, showProgress: true };
    }

    /**
     * 获取所有成就及其状态
     * @param {Object} stats - 统计数据
     * @returns {Array}
     */
    getAllAchievements(stats) {
        return ACHIEVEMENTS.map(achievement => ({
            ...achievement,
            unlocked: this.isUnlocked(achievement.id),
            unlockedAt: this.unlockedAchievements[achievement.id]?.unlockedAt,
            progress: this.getProgress(achievement, stats),
        }));
    }

    /**
     * 获取已解锁成就数量
     * @returns {number}
     */
    getUnlockedCount() {
        return Object.values(this.unlockedAchievements).filter(a => a.unlocked).length;
    }

    /**
     * 获取总成就数量
     * @returns {number}
     */
    getTotalCount() {
        return ACHIEVEMENTS.length;
    }

    /**
     * 按类别分组获取成就
     * @param {Object} stats - 统计数据
     * @returns {Object}
     */
    getAchievementsByCategory(stats) {
        const grouped = {};
        const allAchievements = this.getAllAchievements(stats);

        for (const achievement of allAchievements) {
            if (!grouped[achievement.category]) {
                grouped[achievement.category] = [];
            }
            grouped[achievement.category].push(achievement);
        }

        return grouped;
    }

    /**
     * 获取下一个即将解锁的成就（用于激励显示）
     * @param {Object} stats - 统计数据
     * @returns {Object|null}
     */
    getNextAchievement(stats) {
        const allAchievements = this.getAllAchievements(stats);
        
        // 过滤未解锁且有进度的成就，按进度排序
        const inProgress = allAchievements
            .filter(a => !a.unlocked && a.progress.showProgress && a.progress.percentage > 0)
            .sort((a, b) => b.progress.percentage - a.progress.percentage);

        return inProgress[0] || null;
    }

    /**
     * 清空成就数据
     */
    clear() {
        this.unlockedAchievements = {};
        localStorage.removeItem(STORAGE_KEY);
    }
}

// 导出单例
export const achievementManager = new AchievementManager();

/**
 * 从历史记录计算成就所需的统计数据
 * @param {Array} history - 历史记录
 * @returns {Object}
 */
export function calculateAchievementStats(history) {
    let totalPopped = 0;
    const allEmotions = new Set();
    const categoryBreakdown = {};

    // 初始化分类计数
    Object.keys(EMOTION_TREE).forEach(category => {
        categoryBreakdown[category] = { count: 0 };
    });

    for (const record of history) {
        for (const [emotion, count] of Object.entries(record.emotions)) {
            totalPopped += count;
            allEmotions.add(emotion);

            // 计算分类
            const category = getEmotionCategoryForAchievement(emotion);
            if (category && categoryBreakdown[category]) {
                categoryBreakdown[category].count += count;
            }
        }
    }

    return {
        totalPopped,
        totalDays: history.length,
        uniqueEmotions: allEmotions.size,
        categoryBreakdown,
    };
}

/**
 * 获取情绪所属大类（用于成就统计）
 * @param {string} emotion
 * @returns {string|null}
 */
function getEmotionCategoryForAchievement(emotion) {
    for (const [category, children] of Object.entries(EMOTION_TREE)) {
        if (category === emotion || children.includes(emotion)) {
            return category;
        }
    }
    return null;
}
