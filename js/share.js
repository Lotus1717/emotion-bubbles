/**
 * 分享功能模块
 * 生成游戏结果分享卡片
 */

import { CONFIG, THEMES } from './constants.js';

/**
 * 分享管理器
 */
class ShareManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * 初始化
     */
    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * 生成分享卡片
     * @param {Object} gameResult - 游戏结果数据
     * @returns {string} 图片 dataURL
     */
    generateCard(gameResult) {
        const { emotions, duration, suggestion } = gameResult;
        
        // 设置画布尺寸 (1080x1920 for vertical social media)
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        
        const ctx = this.ctx;
        
        // 1. 绘制背景渐变
        this._drawBackground(ctx);
        
        // 2. 绘制标题
        this._drawTitle(ctx);
        
        // 3. 绘制戳破的情绪
        this._drawEmotions(ctx, emotions);
        
        // 4. 绘制建议
        this._drawSuggestion(ctx, suggestion);
        
        // 5. 绘制底部信息
        this._drawFooter(ctx, duration);
        
        // 6. 绘制装饰元素
        this._drawDecorations(ctx);
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * 绘制背景
     */
    _drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 绘制标题
     */
    _drawTitle(ctx) {
        // 主标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('念起', this.canvas.width / 2, 280);
        
        // 副标题
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '36px "Noto Sans SC", sans-serif';
        ctx.fillText('念起即觉，觉已不随', this.canvas.width / 2, 350);
        
        // 分隔线
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, 400);
        ctx.lineTo(880, 400);
        ctx.stroke();
    }

    /**
     * 绘制情绪标签
     */
    _drawEmotions(ctx, emotions) {
        const startY = 520;
        const lineHeight = 80;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 48px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('今日戳破的情绪', this.canvas.width / 2, startY);
        
        // 绘制情绪气泡
        const bubbleRadius = 40;
        const emotionsToShow = emotions.slice(0, 6);
        
        emotionsToShow.forEach((emotion, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = 240 + col * 240;
            const y = startY + 120 + row * lineHeight + 80;
            
            // 气泡背景
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, bubbleRadius);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
            
            ctx.beginPath();
            ctx.arc(x, y, bubbleRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // 气泡边框
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 文字
            ctx.fillStyle = '#ffffff';
            ctx.font = '28px "Noto Sans SC", sans-serif';
            ctx.fillText(emotion, x, y + 10);
        });
        
        // 如果有更多情绪
        if (emotions.length > 6) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '24px "Noto Sans SC", sans-serif';
            ctx.fillText(`等 ${emotions.length} 种情绪`, this.canvas.width / 2, startY + 340);
        }
    }

    /**
     * 绘制建议
     */
    _drawSuggestion(ctx, suggestion) {
        const startY = 1200;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 40px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ 小花的建议', this.canvas.width / 2, startY);
        
        // 建议文字（换行处理）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '32px "Noto Sans SC", sans-serif';
        
        const maxWidth = 800;
        const lines = this._wrapText(ctx, suggestion, maxWidth);
        lines.forEach((line, index) => {
            ctx.fillText(line, this.canvas.width / 2, startY + 70 + index * 50);
        });
    }

    /**
     * 绘制底部信息
     */
    _drawFooter(ctx, duration) {
        const y = this.canvas.height - 200;
        
        // 分隔线
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, y - 40);
        ctx.lineTo(880, y - 40);
        ctx.stroke();
        
        // 游戏时长
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '28px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        
        const minutes = Math.floor(duration / 60);
        ctx.fillText(`冥想时长 ${minutes} 分钟`, this.canvas.width / 2, y);
        
        // 提示文字
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.fillText('扫码开始你的觉察之旅', this.canvas.width / 2, y + 50);
        
        // TODO: 添加小程序码占位
    }

    /**
     * 绘制装饰元素
     */
    _drawDecorations(ctx) {
        // 绘制星星
        const starCount = 30;
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * (this.canvas.height * 0.6);
            const radius = Math.random() * 2 + 1;
            const opacity = Math.random() * 0.5 + 0.3;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();
        }
        
        // 绘制光晕气泡
        const bubblePositions = [
            { x: 150, y: 600, r: 80 },
            { x: 930, y: 800, r: 60 },
            { x: 100, y: 1400, r: 50 },
            { x: 980, y: 1600, r: 70 },
        ];
        
        bubblePositions.forEach(b => {
            const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        });
    }

    /**
     * 文字换行处理
     */
    _wrapText(ctx, text, maxWidth) {
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * 保存图片到本地
     * @param {string} dataURL - 图片数据
     * @param {string} filename - 文件名
     */
    async saveImage(dataURL, filename = '念起分享.png') {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.click();
            return true;
        } catch (e) {
            console.error('保存图片失败:', e);
            return false;
        }
    }

    /**
     * 复制图片到剪贴板
     * @param {string} dataURL - 图片数据
     */
    async copyToClipboard(dataURL) {
        try {
            const response = await fetch(dataURL);
            const blob = await response.blob();
            
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            return true;
        } catch (e) {
            console.error('复制到剪贴板失败:', e);
            return false;
        }
    }
}

// 导出单例
export const shareManager = new ShareManager();
