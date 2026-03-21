import test from 'node:test';
import assert from 'node:assert/strict';
import {
    historyToCsv,
    csvToHistory,
    mergeHistoryRecords,
    parseBackupJson,
    buildBackupJson,
    detectImportFormat,
    parseCsvLine,
} from '../js/historyBackup.js';
import { CONFIG } from '../js/constants.js';

test('parseCsvLine 支持引号与双引号转义', () => {
    assert.deepEqual(parseCsvLine('a,"b,c",d'), ['a', 'b,c', 'd']);
    assert.deepEqual(parseCsvLine('"say ""hi"""'), ['say "hi"']);
});

test('CSV 导出再导入保持一致', () => {
    const history = [
        { date: '2026-03-19', emotions: { 开心: 2, 焦虑: 1 } },
        { date: '2026-03-18', emotions: { 难过: 3 } },
    ];
    const csv = historyToCsv(history);
    const parsed = csvToHistory(csv);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.history.length, 2);
    const byDate = Object.fromEntries(parsed.history.map((r) => [r.date, r.emotions]));
    assert.deepEqual(byDate['2026-03-19'], { 开心: 2, 焦虑: 1 });
    assert.deepEqual(byDate['2026-03-18'], { 难过: 3 });
});

test('CSV 支持中文表头', () => {
    const csv = '\uFEFF日期,情绪,次数\n2026-01-02,平静,5\n';
    const parsed = csvToHistory(csv);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.history[0], { date: '2026-01-02', emotions: { 平静: 5 } });
});

test('mergeHistoryRecords 按日合并并截断 MAX_DAYS', () => {
    const a = [{ date: '2026-01-01', emotions: { a: 1 } }];
    const b = [{ date: '2026-01-01', emotions: { a: 2, b: 1 } }, { date: '2026-01-02', emotions: { c: 1 } }];
    const merged = mergeHistoryRecords(a, b, 30);
    const d1 = merged.find((x) => x.date === '2026-01-01');
    assert.deepEqual(d1.emotions, { a: 3, b: 1 });
});

test('parseBackupJson / buildBackupJson 往返', () => {
    const history = [{ date: '2026-03-01', emotions: { 开心: 1 } }];
    const ach = { first_pop: { unlocked: true, unlockedAt: '2026-03-01T00:00:00.000Z' } };
    const text = buildBackupJson(history, ach, { exportRange: 'week' });
    const parsed = parseBackupJson(text);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.history.length, 1);
    assert.equal(parsed.achievements.first_pop.unlocked, true);
    const obj = JSON.parse(text);
    assert.equal(obj.exportRange, 'week');
});

test('detectImportFormat', () => {
    assert.equal(detectImportFormat('x.csv', 'a'), 'csv');
    assert.equal(detectImportFormat('b.json', ''), 'json');
    assert.equal(detectImportFormat('', '{"format":1}'), 'json');
    assert.equal(detectImportFormat('', 'date,emotion,count\n'), 'csv');
});

test('合并后尊重 MAX_DAYS 截断', () => {
    const max = CONFIG.HISTORY.MAX_DAYS;
    const many = [];
    for (let i = 0; i < max + 5; i++) {
        const d = new Date(2026, 0, 1 + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        many.push({ date: `${y}-${m}-${day}`, emotions: { n: 1 } });
    }
    const merged = mergeHistoryRecords([], many, max);
    assert.equal(merged.length, max);
});
