import test from 'node:test';
import assert from 'node:assert/strict';
import { emotionStats } from '../js/stats.js';

function withMockedNow(isoDateTime, fn) {
    const RealDate = Date;
    class MockDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                super(isoDateTime);
                return;
            }
            super(...args);
        }

        static now() {
            return new RealDate(isoDateTime).getTime();
        }
    }

    globalThis.Date = MockDate;
    try {
        fn();
    } finally {
        globalThis.Date = RealDate;
    }
}

test('week/month/all 过滤逻辑正确且跳过非法日期', () => {
    withMockedNow('2026-03-19T10:00:00', () => {
        emotionStats.init([
            { date: '2026-03-19', emotions: { 开心: 2 } },
            { date: '2026-03-13', emotions: { 焦虑: 1 } },
            { date: '2026-02-20', emotions: { 难过: 3 } },
            { date: 'not-a-date', emotions: { 迷茫: 1 } }
        ]);

        assert.equal(emotionStats.getFilteredData('week').length, 2);
        assert.equal(emotionStats.getFilteredData('month').length, 3);
        assert.equal(emotionStats.getFilteredData('all').length, 3);
    });
});

test('统计聚合包含总数、日均、top 情绪', () => {
    const result = emotionStats.calculateStats([
        { date: '2026-03-19', emotions: { 开心: 2, 焦虑: 1 } },
        { date: '2026-03-18', emotions: { 开心: 3, 难过: 2 } }
    ]);

    assert.equal(result.totalPopped, 8);
    assert.equal(result.totalDays, 2);
    assert.equal(result.avgPerDay, '4.0');
    assert.equal(result.topEmotions[0].emotion, '开心');
    assert.equal(result.topEmotions[0].count, 5);
});

test('趋势数据按天补零并输出短日期', () => {
    withMockedNow('2026-03-19T10:00:00', () => {
        emotionStats.init([
            { date: '2026-03-19', emotions: { 开心: 1, 焦虑: 1 } },
            { date: '2026-03-17', emotions: { 难过: 3 } }
        ]);

        const trend = emotionStats.getTrendData(3);
        assert.equal(trend.length, 3);
        assert.deepEqual(
            trend.map((x) => x.date),
            ['2026-03-17', '2026-03-18', '2026-03-19']
        );
        assert.deepEqual(
            trend.map((x) => x.total),
            [3, 0, 2]
        );
        assert.match(trend[0].shortDate, /^\d{1,2}\/\d{1,2}$/);
    });
});
