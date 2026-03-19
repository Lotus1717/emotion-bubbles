import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSuggestion } from '../js/suggestions.js';

function withMockedRandom(value, fn) {
    const originalRandom = Math.random;
    Math.random = () => value;
    try {
        fn();
    } finally {
        Math.random = originalRandom;
    }
}

test('空会话返回两段引导文案', () => {
    withMockedRandom(0, () => {
        const result = generateSuggestion([]);
        const parts = result.split('\n\n');

        assert.equal(parts.length, 2);
        assert.match(parts[0], /安静|觉察|准备好/);
        assert.match(parts[1], /下一次|小目标|慢慢来/);
    });
});

test('可识别情绪关键词并生成至少两段建议', () => {
    withMockedRandom(0, () => {
        const result = generateSuggestion(['焦虑', '心累']);
        const parts = result.split('\n\n');

        assert.ok(parts.length >= 2);
        assert.match(parts[0], /深呼吸|焦虑|不确定/);
    });
});

test('未知情绪回退到默认建议', () => {
    withMockedRandom(0, () => {
        const result = generateSuggestion(['火星心情']);
        const parts = result.split('\n\n');

        assert.equal(parts.length, 2);
        assert.match(parts[0], /每一种情绪都值得被看见|戳破了这些情绪/);
    });
});
