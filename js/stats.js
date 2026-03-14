/**
 * 情绪统计模块
 * 分析和可视化用户情绪数据
 */

import { EMOTION_CATEGORIES } from './emotions.js';

/**
 * 将日期格式化为本地 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 解析历史记录中的日期（兼容旧版 toLocaleDateString）
 * @param {string} raw
 * @returns {Date|null}
 */
function parseHistoryDate(raw) {
    if (!raw) return null;

    const value = String(raw).trim();
    if (!value) return null;

    // 首选 ISO 日期键，避免各浏览器对本地日期字符串解析差异
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T00:00:00`);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * 情绪统计管理器
 */
class EmotionStats {
    constructor() {
        this.history = [];
    }

    /**
     * 初始化
     * @param {Array} history - 历史记录数据
     */
    init(history) {
        this.history = history;
    }

    /**
     * 获取时间范围筛选后的数据
     * @param {string} range - 时间范围: 'week' | 'month' | 'all'
     * @returns {Array} 筛选后的历史记录
     */
    getFilteredData(range = 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return this.history.filter(record => {
            const recordDate = parseHistoryDate(record.date);
            if (!recordDate) return false;
            
            switch (range) {
                case 'week':
                    // 最近7天
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return recordDate >= weekAgo;
                    
                case 'month':
                    // 最近30天
                    const monthAgo = new Date(today);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    return recordDate >= monthAgo;
                    
                default: // 'all'
                    return true;
            }
        });
    }

    /**
     * 计算总体统计
     * @param {Array} data - 历史记录
     * @returns {Object} 统计数据
     */
    calculateStats(data) {
        if (!data || data.length === 0) {
            return {
                totalPopped: 0,
                totalDays: 0,
                avgPerDay: 0,
                topEmotions: [],
                categoryBreakdown: {}
            };
        }

        // 计算总戳破数
        let totalPopped = 0;
        const emotionCounts = {};
        
        data.forEach(record => {
            Object.entries(record.emotions).forEach(([emotion, count]) => {
                totalPopped += count;
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + count;
            });
        });

        // 排序获取 top 情绪
        const topEmotions = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([emotion, count]) => ({
                emotion,
                count,
                percentage: ((count / totalPopped) * 100).toFixed(1)
            }));

        // 分类统计
        const categoryBreakdown = this.calculateCategoryBreakdown(emotionCounts, totalPopped);

        return {
            totalPopped,
            totalDays: data.length,
            avgPerDay: (totalPopped / data.length).toFixed(1),
            topEmotions,
            categoryBreakdown
        };
    }

    /**
     * 计算分类占比
     * @param {Object} emotionCounts - 情绪计数
     * @param {number} total - 总数
     * @returns {Object} 分类占比
     */
    calculateCategoryBreakdown(emotionCounts, total) {
        const breakdown = {};
        
        Object.entries(EMOTION_CATEGORIES).forEach(([category, emotions]) => {
            let categoryCount = 0;
            emotions.forEach(emotion => {
                categoryCount += emotionCounts[emotion] || 0;
            });
            
            breakdown[category] = {
                count: categoryCount,
                percentage: total > 0 ? ((categoryCount / total) * 100).toFixed(1) : 0
            };
        });
        
        return breakdown;
    }

    /**
     * 获取趋势数据（最近N天的情绪变化）
     * @param {number} days - 天数
     * @returns {Array} 趋势数据
     */
    getTrendData(days = 7) {
        const now = new Date();
        const recordMap = new Map();

        this.history.forEach(record => {
            const parsed = parseHistoryDate(record.date);
            if (!parsed) return;
            recordMap.set(formatDateKey(parsed), record);
        });

        const trend = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = formatDateKey(date);
            
            const record = recordMap.get(dateStr);
            
            let total = 0;
            if (record) {
                total = Object.values(record.emotions).reduce((sum, count) => sum + count, 0);
            }
            
            trend.push({
                date: dateStr,
                shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
                total
            });
        }
        
        return trend;
    }

    /**
     * 获取情绪变化（与上一个周期相比）
     * @param {string} range - 时间范围
     * @returns {Object} 变化数据
     */
    getEmotionChange(range = 'week') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 当前周期
        const currentStart = new Date(today);
        if (range === 'week') currentStart.setDate(currentStart.getDate() - 7);
        else currentStart.setDate(currentStart.getDate() - 30);
        
        // 上一周期
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - (range === 'week' ? 7 : 30));
        
        const currentData = this.history.filter(r => {
            const d = parseHistoryDate(r.date);
            if (!d) return false;
            return d >= currentStart && d <= today;
        });
        
        const previousData = this.history.filter(r => {
            const d = parseHistoryDate(r.date);
            if (!d) return false;
            return d >= previousStart && d < currentStart;
        });
        
        const currentStats = this.calculateStats(currentData);
        const previousStats = this.calculateStats(previousData);
        
        // 计算变化
        const change = {};
        
        // 总体变化
        change.total = {
            current: currentStats.totalPopped,
            previous: previousStats.totalPopped,
            delta: currentStats.totalPopped - previousStats.totalPopped
        };
        
        // 各类别变化
        Object.keys(EMOTION_CATEGORIES).forEach(category => {
            const current = currentStats.categoryBreakdown[category]?.count || 0;
            const previous = previousStats.categoryBreakdown[category]?.count || 0;
            
            change[category] = {
                current,
                previous,
                delta: current - previous
            };
        });
        
        return change;
    }

    /**
     * 生成统计数据对象（用于展示）
     * @param {string} range - 时间范围
     * @returns {Object} 完整的统计数据
     */
    getStats(range = 'week') {
        const data = this.getFilteredData(range);
        
        return {
            overview: this.calculateStats(data),
            trend: this.getTrendData(range === 'week' ? 7 : 30),
            change: this.getEmotionChange(range)
        };
    }
}

// 导出单例
export const emotionStats = new EmotionStats();
