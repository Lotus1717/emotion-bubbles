/**
 * 常量配置模块
 * 集中管理所有魔法数字和配置项
 */

export const CONFIG = {
    // 游戏时长选项 (秒)
    DURATION_OPTIONS: [60, 180],
    DEFAULT_DURATION: 60,
    
    // 倒计时
    COUNTDOWN_SECONDS: 3,
    
    // 气泡配置
    BUBBLE: {
        MIN_SIZE: 55,
        SIZE_RANGE: 50,
        MAX_COUNT: 10,
        INITIAL_COUNT: 8,
        SPAWN_INTERVAL: 1500,      // 补充气泡间隔 (ms)
        INITIAL_SPAWN_DELAY: 500,  // 初始气泡生成间隔 (ms)
        INITIAL_WAIT: 4500,        // 等待初始化完成后再补充 (ms)
        LIFE_MIN: 6000,            // 最短生命周期 (ms) - 6秒
        LIFE_RANGE: 4000,          // 生命周期随机范围 (ms) - 0~4秒
        FADE_DURATION: 2000,       // 渐隐时长 (ms) - 2秒
        POP_DURATION: 300,         // 戳破动画时长 (ms)
    },
    
    // 物理引擎配置
    PHYSICS: {
        UPDATE_INTERVAL: 50,       // 物理更新间隔 (ms)
        BOUNCE_DAMPING: 0.8,       // 碰撞能量衰减
        VELOCITY_RANDOM: 0.5,      // 碰撞后速度随机扰动
        INITIAL_VX_RANGE: 2,       // 初始水平速度范围
        INITIAL_VY_RANGE: 1.5,     // 初始垂直速度范围
        INITIAL_VY_BIAS: -0.5,     // 初始向上偏移
        OVERLAP_THRESHOLD: 0.6,    // 重叠检测阈值
    },
    
    // 边界配置
    BOUNDS: {
        PADDING_X: 20,
        PADDING_TOP: 60,
        PADDING_BOTTOM: 60,
        SPAWN_PADDING_X: 40,
        SPAWN_PADDING_TOP: 80,
        SPAWN_PADDING_BOTTOM: 100,
    },
    
    // 粒子效果配置
    PARTICLES: {
        COUNT: 12,
        MIN_DISTANCE: 40,
        DISTANCE_RANGE: 60,
        MIN_SIZE: 4,
        SIZE_RANGE: 12,
        MIN_DURATION: 0.5,
        DURATION_RANGE: 0.5,
        RING_COUNT: 3,
        RING_MIN_SIZE: 15,
        RING_SIZE_RANGE: 15,
        RING_MIN_DISTANCE: 20,
        RING_DISTANCE_RANGE: 30,
    },
    
    // 音频配置
    AUDIO: {
        AMBIENT_VOLUME: 0.11,
        POP_VOLUME: 0.3,
        TICK_VOLUME: 0.08,
        END_VOLUME: 0.15,
        AMBIENT_FREQUENCIES: [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3 和弦
    },
    
    // 星空配置
    STARS: {
        COUNT: 50,
        MIN_SIZE: 1,
        SIZE_RANGE: 2,
    },
    
    // 历史记录
    HISTORY: {
        MAX_DAYS: 30,
        DISPLAY_TOP: 20,
        RESULT_TOP: 10,
    },
    
    // 情绪挖掘深度
    EMOTION_MAX_DEPTH: 3,           // 允许更深的探索
    EMOTION_BRANCH_COUNT: 4,        // 每次生成更多子情绪
    EMOTION_SPAWN_DELAY: 150,       // 子情绪生成间隔 (ms)
    EMOTION_SPAWN_START_DELAY: 200, // 开始生成的延迟 (ms)
};

// 主题配置
export const THEMES = {
    healing: {
        primary: '#667eea',
        secondary: '#764ba2',
    },
    forest: {
        primary: '#134E5E',
        secondary: '#71B280',
    },
    sunset: {
        primary: '#FF5122',
        secondary: '#DD2476',
    },
};

// 本地存储键名
export const STORAGE_KEYS = {
    HISTORY: 'emotionBubbleHistory',
    REMINDER: {
        ENABLED: 'reminderEnabled',
        TIME: 'reminderTime',
    },
};
