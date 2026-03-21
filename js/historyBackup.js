/**
 * 情绪记录导入/导出
 * - CSV：便于 Notion / Excel / Google 表格 导入导出
 * - JSON：本站完整备份（含成就进度）
 */

import { getEmotionCategory } from './emotions.js';
import { BACKUP_FORMAT_ID, BACKUP_VERSION } from './constants.js';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} s
 */
function normalizeDateKey(s) {
    if (!s) return '';
    const t = String(s).trim();
    if (DATE_KEY_RE.test(t)) return t;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * @param {string} cell
 */
function escapeCsvCell(cell) {
    const s = String(cell ?? '');
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
export function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            result.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

/**
 * 将历史记录转为 CSV（UTF-8，带 BOM 便于 Excel 识别中文）
 * 列：date,emotion,count,category — Notion 可用「合并 CSV」或表格导入
 * @param {Array<{ date: string, emotions: Record<string, number> }>} history
 * @returns {string}
 */
export function historyToCsv(history) {
    const rows = [['date', 'emotion', 'count', 'category']];
    if (!Array.isArray(history)) {
        return '\uFEFF' + rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
    }
    for (const record of history) {
        const date = normalizeDateKey(record?.date);
        if (!date) continue;
        const emotions = record.emotions && typeof record.emotions === 'object' ? record.emotions : {};
        for (const [emotion, count] of Object.entries(emotions)) {
            const n = Number(count);
            if (!emotion || !Number.isFinite(n) || n <= 0) continue;
            const category = getEmotionCategory(emotion);
            rows.push([date, emotion, String(Math.floor(n)), category === 'default' ? '' : category]);
        }
    }
    const body = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
    return `\uFEFF${body}`;
}

/**
 * 解析表头，映射到 date / emotion / count
 * @param {string[]} headers
 */
function mapCsvHeaders(headers) {
    const lower = headers.map((h) => String(h).trim().toLowerCase());
    const find = (...candidates) => {
        for (let i = 0; i < lower.length; i++) {
            const h = lower[i];
            if (candidates.some((c) => h === c || h.includes(c))) return i;
        }
        return -1;
    };
    const dateIdx = find('date', '日期', '时间', 'day');
    const emotionIdx = find('emotion', '情绪', '词', '名称', 'name', 'feeling', 'mood');
    // 不要用单字母 'n'，否则会误匹配 emotion 等列名
    const countIdx = find('count', '次数', '数量', 'cnt', 'total');
    return { dateIdx, emotionIdx, countIdx };
}

/**
 * CSV → 按日聚合的历史记录
 * @param {string} text
 * @returns {{ ok: boolean, history?: Array<{date:string,emotions:Record<string,number>}>, error?: string }}
 */
export function csvToHistory(text) {
    if (!text || typeof text !== 'string') {
        return { ok: false, error: '文件内容为空' };
    }
    let raw = text.trim();
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
        return { ok: false, error: 'CSV 至少需要表头与一行数据' };
    }

    const headerCells = parseCsvLine(lines[0]);
    const { dateIdx, emotionIdx, countIdx } = mapCsvHeaders(headerCells);
    if (dateIdx < 0 || emotionIdx < 0 || countIdx < 0) {
        return {
            ok: false,
            error: '未识别到必需列，请包含：日期(date)、情绪(emotion)、次数(count)。可从本站导出的 CSV 为模板。',
        };
    }

    /** @type {Map<string, Record<string, number>>} */
    const byDate = new Map();
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const date = normalizeDateKey(cells[dateIdx]);
        const emotion = String(cells[emotionIdx] ?? '').trim();
        const count = Math.max(0, Math.floor(Number(String(cells[countIdx] ?? '').replace(/,/g, '').trim()) || 0));
        if (!date || !emotion || count <= 0) continue;
        if (!byDate.has(date)) byDate.set(date, {});
        const bag = byDate.get(date);
        bag[emotion] = (bag[emotion] || 0) + count;
    }

    if (byDate.size === 0) {
        return { ok: false, error: '没有解析到有效数据行' };
    }

    const history = Array.from(byDate.entries())
        .map(([date, emotions]) => ({ date, emotions }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return { ok: true, history };
}

/**
 * @param {unknown} record
 * @returns {{ date: string, emotions: Record<string, number> } | null}
 */
function normalizeHistoryRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const date = normalizeDateKey(record.date);
    if (!date) return null;
    const emotions = {};
    const raw = record.emotions;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw)) {
            const n = Math.floor(Number(v));
            if (k && Number.isFinite(n) && n > 0) emotions[k] = n;
        }
    }
    if (Object.keys(emotions).length === 0) return null;
    return { date, emotions };
}

/**
 * @param {unknown[]} arr
 */
export function sanitizeHistoryArray(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const item of arr) {
        const r = normalizeHistoryRecord(item);
        if (r) out.push(r);
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * @param {Array<{ date: string, emotions: Record<string, number> }>} a
 * @param {Array<{ date: string, emotions: Record<string, number> }>} b
 * @param {number} maxDays
 */
export function mergeHistoryRecords(a, b, maxDays) {
    const map = new Map();
    const put = (list) => {
        for (const rec of list) {
            const date = normalizeDateKey(rec.date);
            if (!date) continue;
            if (!map.has(date)) map.set(date, {});
            const bag = map.get(date);
            const emo = rec.emotions && typeof rec.emotions === 'object' ? rec.emotions : {};
            for (const [k, v] of Object.entries(emo)) {
                const n = Math.floor(Number(v));
                if (!k || !Number.isFinite(n) || n <= 0) continue;
                bag[k] = (bag[k] || 0) + n;
            }
        }
    };
    put(Array.isArray(a) ? a : []);
    put(Array.isArray(b) ? b : []);

    let merged = Array.from(map.entries())
        .map(([date, emotions]) => ({ date, emotions }))
        .sort((x, y) => x.date.localeCompare(y.date));

    if (Number.isFinite(maxDays) && maxDays > 0 && merged.length > maxDays) {
        merged = merged.slice(-maxDays);
    }
    return merged;
}

/**
 * 构建本站 JSON 备份
 * @param {Array} history
 * @param {Object|null} achievements - achievementManager 内部结构
 * @param {{ exportRange?: string }} [options] - exportRange: week | month | all（仅元数据说明，便于辨认部分导出）
 */
export function buildBackupJson(history, achievements = null, options = {}) {
    const payload = {
        format: BACKUP_FORMAT_ID,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        history: sanitizeHistoryArray(history),
    };
    if (options.exportRange) {
        payload.exportRange = options.exportRange;
    }
    if (achievements && typeof achievements === 'object') {
        payload.achievements = achievements;
    }
    return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * 解析 JSON 备份或兼容的纯 history 数组
 * @param {string} text
 * @returns {{ ok: boolean, history?: Array, achievements?: Object|null, error?: string }}
 */
export function parseBackupJson(text) {
    if (!text || typeof text !== 'string') {
        return { ok: false, error: '内容为空' };
    }
    let data;
    try {
        data = JSON.parse(text.trim());
    } catch (e) {
        return { ok: false, error: '不是有效的 JSON' };
    }

    if (Array.isArray(data)) {
        const history = sanitizeHistoryArray(data);
        if (history.length === 0) {
            return { ok: false, error: 'JSON 数组中没有有效记录' };
        }
        return { ok: true, history, achievements: null };
    }

    if (data && typeof data === 'object') {
        if (data.format && data.format !== BACKUP_FORMAT_ID) {
            return { ok: false, error: `不支持的备份格式: ${data.format}` };
        }
        const rawHistory = data.history ?? data.records ?? data.data;
        const history = sanitizeHistoryArray(Array.isArray(rawHistory) ? rawHistory : []);
        if (history.length === 0) {
            return { ok: false, error: '备份中没有有效的 history 记录' };
        }
        const achievements =
            data.achievements && typeof data.achievements === 'object' ? data.achievements : null;
        return { ok: true, history, achievements };
    }

    return { ok: false, error: '无法识别的 JSON 结构' };
}

/**
 * 触发浏览器下载
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 */
export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * 优先用 Web Share API 分享单个文本文件（零服务器）；不支持或用户取消则回退为下载
 * 需在安全上下文（HTTPS 或 localhost）下，部分桌面浏览器仅支持下载回退
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 * @param {{ title?: string, text?: string }} [meta] - 分享面板标题与说明
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareOrDownloadTextFile(
    filename,
    content,
    mime = 'text/plain;charset=utf-8',
    meta = {}
) {
    const blob = new Blob([content], { type: mime });
    const fileType = (mime.split(';')[0] || 'text/plain').trim();

    let file;
    try {
        file = new File([blob], filename, { type: fileType, lastModified: Date.now() });
    } catch {
        downloadTextFile(filename, content, mime);
        return 'downloaded';
    }

    const payload = {
        files: [file],
        title: meta.title || '念起导出',
        text: meta.text || filename,
    };

    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        try {
            if (navigator.canShare(payload)) {
                await navigator.share(payload);
                return 'shared';
            }
        } catch (e) {
            if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
                return 'cancelled';
            }
            console.warn('[念起] 分享文件失败，改为下载', e);
        }
    }

    downloadTextFile(filename, content, mime);
    return 'downloaded';
}

/**
 * 根据文件扩展名或内容探测格式
 * @param {string} filename
 * @param {string} text
 * @returns {'csv'|'json'|null}
 */
export function detectImportFormat(filename, text) {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.json')) return 'json';
    const t = (text || '').trim();
    if (t.startsWith('{') || t.startsWith('[')) return 'json';
    if (t.includes(',') && (t.includes('date') || t.includes('日期'))) return 'csv';
    return null;
}
