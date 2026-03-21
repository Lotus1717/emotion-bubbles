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
        this.width = 1080;
        this.height = 1440;
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    generateCard(gameResult) {
        const { emotions, duration, suggestion } = gameResult;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        const ctx = this.ctx;
        
        this._drawBackground(ctx);
        this._drawDecorations(ctx);
        this._drawHeader(ctx);
        this._drawEmotionCloud(ctx, emotions);
        this._drawSuggestionCard(ctx, suggestion);
        this._drawFooter(ctx, duration);
        
        return this.canvas.toDataURL('image/png');
    }

    _drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = 'rgba(102, 126, 234, 0.03)';
        ctx.fillRect(0, 0, this.width, this.height);
    }

    _drawDecorations(ctx) {
        const glows = [
            { x: 0, y: 0, r: 400, color: 'rgba(102, 126, 234, 0.15)' },
            { x: this.width, y: this.height * 0.4, r: 350, color: 'rgba(118, 75, 162, 0.12)' },
            { x: this.width * 0.3, y: this.height, r: 300, color: 'rgba(236, 72, 153, 0.08)' },
        ];
        
        glows.forEach(g => {
            const gradient = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
            gradient.addColorStop(0, g.color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.width, this.height);
        });
        
        const starPositions = [];
        for (let i = 0; i < 60; i++) {
            starPositions.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.7,
                r: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.6 + 0.2
            });
        }
        
        starPositions.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
        });
        
        const floatingBubbles = [
            { x: 100, y: 300, r: 60, opacity: 0.08 },
            { x: 980, y: 500, r: 45, opacity: 0.06 },
            { x: 150, y: 900, r: 35, opacity: 0.05 },
            { x: 950, y: 1100, r: 50, opacity: 0.07 },
            { x: 540, y: 200, r: 25, opacity: 0.04 },
        ];
        
        floatingBubbles.forEach(b => {
            const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${b.opacity})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${b.opacity * 0.5})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${b.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    _drawHeader(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '200 88px "PingFang SC", "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.3em';
        ctx.fillText('念  起', this.width / 2, 160);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '300 28px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.fillText('念起即觉，觉已不随', this.width / 2, 210);
        
        const lineY = 260;
        const lineWidth = 120;
        const gradient = ctx.createLinearGradient(
            this.width / 2 - lineWidth, lineY,
            this.width / 2 + lineWidth, lineY
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, 'rgba(102, 126, 234, 0.6)');
        gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.8)');
        gradient.addColorStop(0.7, 'rgba(102, 126, 234, 0.6)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - lineWidth, lineY);
        ctx.lineTo(this.width / 2 + lineWidth, lineY);
        ctx.stroke();
    }

    _drawEmotionCloud(ctx, emotions) {
        const centerY = 520;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '500 32px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('今日觉察的情绪', this.width / 2, 320);
        
        const emotionsToShow = emotions.slice(0, 8);
        const tagHeight = 52;
        const tagPaddingX = 32;
        const tagGapX = 16;
        const tagGapY = 16;
        
        ctx.font = '400 26px "PingFang SC", "Noto Sans SC", sans-serif';
        
        const tagWidths = emotionsToShow.map(e => ctx.measureText(e).width + tagPaddingX * 2);
        
        const rows = [];
        let currentRow = [];
        let currentRowWidth = 0;
        const maxRowWidth = this.width - 160;
        
        tagWidths.forEach((width, i) => {
            if (currentRowWidth + width + (currentRow.length > 0 ? tagGapX : 0) > maxRowWidth) {
                rows.push(currentRow);
                currentRow = [i];
                currentRowWidth = width;
            } else {
                currentRow.push(i);
                currentRowWidth += width + (currentRow.length > 1 ? tagGapX : 0);
            }
        });
        if (currentRow.length > 0) rows.push(currentRow);
        
        const totalHeight = rows.length * tagHeight + (rows.length - 1) * tagGapY;
        let yOffset = centerY - totalHeight / 2;
        
        const colors = [
            { bg: 'rgba(102, 126, 234, 0.25)', border: 'rgba(102, 126, 234, 0.5)' },
            { bg: 'rgba(118, 75, 162, 0.25)', border: 'rgba(118, 75, 162, 0.5)' },
            { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)' },
            { bg: 'rgba(99, 179, 237, 0.2)', border: 'rgba(99, 179, 237, 0.4)' },
            { bg: 'rgba(129, 230, 217, 0.2)', border: 'rgba(129, 230, 217, 0.4)' },
            { bg: 'rgba(246, 173, 85, 0.2)', border: 'rgba(246, 173, 85, 0.4)' },
        ];
        
        rows.forEach((row, rowIndex) => {
            const rowWidth = row.reduce((sum, i) => sum + tagWidths[i], 0) + (row.length - 1) * tagGapX;
            let xOffset = (this.width - rowWidth) / 2;
            
            row.forEach((emotionIndex, colIndex) => {
                const emotion = emotionsToShow[emotionIndex];
                const tagWidth = tagWidths[emotionIndex];
                const colorIndex = (rowIndex * 3 + colIndex) % colors.length;
                const color = colors[colorIndex];
                
                const x = xOffset;
                const y = yOffset;
                const radius = tagHeight / 2;
                
                ctx.beginPath();
                ctx.roundRect(x, y, tagWidth, tagHeight, radius);
                ctx.fillStyle = color.bg;
                ctx.fill();
                
                ctx.beginPath();
                ctx.roundRect(x, y, tagWidth, tagHeight, radius);
                ctx.strokeStyle = color.border;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = '400 26px "PingFang SC", "Noto Sans SC", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(emotion, x + tagWidth / 2, y + tagHeight / 2 + 9);
                
                xOffset += tagWidth + tagGapX;
            });
            
            yOffset += tagHeight + tagGapY;
        });
        
        if (emotions.length > 8) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '300 22px "PingFang SC", "Noto Sans SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`还有 ${emotions.length - 8} 种情绪...`, this.width / 2, yOffset + 30);
        }
    }

    _drawSuggestionCard(ctx, suggestion) {
        const cardX = 80;
        const cardY = 780;
        const cardWidth = this.width - 160;
        const cardHeight = 280;
        const radius = 24;
        
        const gradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
        
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(102, 126, 234, 0.9)';
        ctx.font = '500 24px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('✨ 小念的锦囊', cardX + 32, cardY + 50);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '400 24px "PingFang SC", "Noto Sans SC", sans-serif';
        
        const maxWidth = cardWidth - 64;
        const lines = this._wrapText(ctx, suggestion, maxWidth);
        const lineHeight = 40;
        const maxLines = 4;
        
        lines.slice(0, maxLines).forEach((line, index) => {
            ctx.fillText(line, cardX + 32, cardY + 100 + index * lineHeight);
        });
        
        if (lines.length > maxLines) {
            const lastLine = lines[maxLines - 1];
            ctx.fillText(lastLine.slice(0, -3) + '...', cardX + 32, cardY + 100 + (maxLines - 1) * lineHeight);
        }
    }

    _drawFooter(ctx, duration) {
        const y = this.height - 140;
        
        const lineWidth = 80;
        const gradient = ctx.createLinearGradient(
            this.width / 2 - lineWidth, y - 60,
            this.width / 2 + lineWidth, y - 60
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - lineWidth, y - 60);
        ctx.lineTo(this.width / 2 + lineWidth, y - 60);
        ctx.stroke();
        
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        let timeText = minutes > 0 ? `${minutes} 分钟` : `${seconds} 秒`;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '300 22px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`冥想时长 ${timeText}`, this.width / 2, y - 10);
        
        const date = new Date();
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '300 18px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.fillText(dateStr, this.width / 2, y + 25);
    }

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

    showToast(type = 'copied') {
        const existing = document.querySelector('.toast-container');
        if (existing) existing.remove();
        const existingBackdrop = document.querySelector('.toast-backdrop');
        if (existingBackdrop) existingBackdrop.remove();
        
        const configs = {
            copied: {
                icon: '✨',
                title: '已复制到剪贴板',
                message: '可以直接粘贴到 <span class="highlight">微信</span> 或 <span class="highlight">微博</span> 分享～'
            },
            saved: {
                icon: '📥',
                title: '图片已保存',
                message: '请在相册中找到「<span class="highlight">念起分享.png</span>」分享～'
            },
            error: {
                icon: '😅',
                title: '分享失败',
                message: '当前浏览器不支持分享功能，请尝试使用最新版 Chrome 或 Safari'
            },
            empty: {
                icon: '🫧',
                title: '还没有情绪哦',
                message: '先戳破一些情绪气泡再来分享吧～'
            },
            export_shared: {
                icon: '📤',
                title: '已打开系统分享',
                message: '选择<strong>备忘录、文件、微信</strong>等即可保存或转发；导入时仍用本页的「导入文件」'
            },
            export_downloaded: {
                icon: '📥',
                title: '已保存到本地',
                message: '当前环境无法调起分享面板，已改为<strong>浏览器下载</strong>，请在下载目录查看文件'
            }
        };
        
        const config = configs[type] || configs.copied;
        
        const backdrop = document.createElement('div');
        backdrop.className = 'toast-backdrop';
        document.body.appendChild(backdrop);
        
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.innerHTML = `
            <div class="toast">
                <span class="toast-icon">${config.icon}</span>
                <div class="toast-title">${config.title}</div>
                <div class="toast-message">${config.message}</div>
            </div>
        `;
        document.body.appendChild(container);
        
        const dismiss = () => {
            const toast = container.querySelector('.toast');
            toast.classList.add('leaving');
            backdrop.classList.add('leaving');
            setTimeout(() => {
                container.remove();
                backdrop.remove();
            }, 300);
        };
        
        backdrop.addEventListener('click', dismiss);
        container.addEventListener('click', dismiss);
        
        setTimeout(dismiss, 2500);
    }
}

export const shareManager = new ShareManager();
