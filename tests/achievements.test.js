import test from 'node:test';
import assert from 'node:assert/strict';
import {
    achievementManager,
    calculateAchievementStats
} from '../js/achievements.js';

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        }
    };
}

function withMockedEnv(fn) {
    const originalLocalStorage = globalThis.localStorage;
    const originalDate = Date;

    class MockDate extends originalDate {
        constructor(...args) {
            if (args.length === 0) {
                super('2026-03-19T10:00:00');
                return;
            }
            super(...args);
        }

        static now() {
            return new originalDate('2026-03-19T10:00:00').getTime();
        }
    }

    globalThis.localStorage = createLocalStorageMock();
    globalThis.Date = MockDate;

    try {
        fn();
    } finally {
        globalThis.localStorage = originalLocalStorage;
        globalThis.Date = originalDate;
    }
}

test('calculateAchievementStats 计算累计总数、天数与去重情绪数', () => {
    const stats = calculateAchievementStats([
        { date: '2026-03-18', emotions: { 开心: 2, 焦虑: 1 } },
        { date: '2026-03-19', emotions: { 开心: 3, 难过: 2 } }
    ]);

    assert.equal(stats.totalPopped, 8);
    assert.equal(stats.totalDays, 2);
    assert.equal(stats.uniqueEmotions, 3);
    assert.equal(stats.categoryBreakdown['开心'].count, 5);
    assert.equal(stats.categoryBreakdown['焦虑'].count, 1);
});

test('checkAndUnlock 可解锁累计/会话类成就并持久化', () => {
    withMockedEnv(() => {
        achievementManager.clear();
        achievementManager.init();

        const unlocked = achievementManager.checkAndUnlock(
            {
                totalPopped: 120,
                totalDays: 3,
                uniqueEmotions: 20,
                categoryBreakdown: { 焦虑: { count: 55 } }
            },
            {
                poppedCount: 35,
                uniqueCount: 10
            }
        );

        const unlockedIds = unlocked.map((a) => a.id);
        assert.ok(unlockedIds.includes('first_pop'));
        assert.ok(unlockedIds.includes('pop_100'));
        assert.ok(unlockedIds.includes('first_session'));
        assert.ok(unlockedIds.includes('days_3'));
        assert.ok(unlockedIds.includes('explore_15'));
        assert.ok(unlockedIds.includes('anxiety_50'));
        assert.ok(unlockedIds.includes('focus_master'));
        assert.ok(unlockedIds.includes('emotion_tide'));

        assert.equal(achievementManager.isUnlocked('pop_100'), true);
        assert.ok(achievementManager.getUnlockedCount() > 0);
    });
});

test('getNextAchievement 返回进度最高的未解锁成就', () => {
    withMockedEnv(() => {
        achievementManager.clear();
        achievementManager.init();
        achievementManager.checkAndUnlock(
            {
                totalPopped: 1,
                totalDays: 1,
                uniqueEmotions: 1,
                categoryBreakdown: { 焦虑: { count: 0 } }
            },
            { poppedCount: 1, uniqueCount: 1 }
        );

        const next = achievementManager.getNextAchievement({
            totalPopped: 95,
            totalDays: 2,
            uniqueEmotions: 2,
            categoryBreakdown: { 焦虑: { count: 20 } }
        });

        assert.ok(next);
        assert.equal(next.id, 'pop_100');
        assert.ok(next.progress.percentage > 90);
    });
});
