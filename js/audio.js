/**
 * 音频模块
 * 使用 Web Audio API 生成背景音乐和音效
 */

import { CONFIG } from './constants.js';

class AudioManager {
    constructor() {
        this.context = null;
        this.ambientGain = null;
        this.ambientOscillators = [];
        this.isAmbientPlaying = false;
    }

    /**
     * 初始化音频上下文
     * @returns {AudioContext}
     */
    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.context;
    }

    /**
     * 恢复音频上下文（解决浏览器自动播放限制）
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * 播放背景 Ambient 音乐
     * 使用和弦 pad + 柔和白噪音营造氛围
     */
    startAmbient() {
        if (this.isAmbientPlaying) return;
        
        try {
            this.stopAmbient();
            const ctx = this.init();
            
            // 创建主增益节点
            this.ambientGain = ctx.createGain();
            this.ambientGain.gain.setValueAtTime(CONFIG.AUDIO.AMBIENT_VOLUME, ctx.currentTime);
            this.ambientGain.connect(ctx.destination);

            // 创建柔和的 ambient 和弦 pad (C3, E3, G3, B3)
            CONFIG.AUDIO.AMBIENT_FREQUENCIES.forEach((freq, i) => {
                // 主振荡器
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();

                // 添加轻微的频率调制（LFO）增加空灵感
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.frequency.setValueAtTime(0.1 + i * 0.05, ctx.currentTime);
                lfoGain.gain.setValueAtTime(2 + Math.random() * 2, ctx.currentTime);

                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                oscGain.gain.setValueAtTime(0.15, ctx.currentTime);

                osc.connect(oscGain);
                oscGain.connect(this.ambientGain);

                osc.type = i % 2 === 0 ? 'sine' : 'triangle';
                lfo.type = 'sine';
                osc.start(ctx.currentTime);
                lfo.start(ctx.currentTime);

                this.ambientOscillators.push(osc, lfo);

                // 添加泛音
                const harmonic = ctx.createOscillator();
                const harmGain = ctx.createGain();
                harmonic.frequency.setValueAtTime(freq * 2, ctx.currentTime);
                harmonic.type = 'sine';
                harmGain.gain.setValueAtTime(0.05, ctx.currentTime);
                harmonic.connect(harmGain);
                harmGain.connect(this.ambientGain);
                harmonic.start(ctx.currentTime);

                this.ambientOscillators.push(harmonic);
            });

            // 添加柔和的粉红噪音作为背景
            this._createPinkNoise();
            
            this.isAmbientPlaying = true;
        } catch (e) {
            console.warn('Failed to start ambient sound:', e);
        }
    }

    /**
     * 创建粉红噪音（比白噪音更柔和）
     * @private
     */
    _createPinkNoise() {
        const ctx = this.context;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // 生成白噪音
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // 强低通滤波使噪音变得非常柔和
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.03, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ambientGain);
        whiteNoise.start();

        this.ambientOscillators.push(whiteNoise);
    }

    /**
     * 停止背景音乐
     */
    stopAmbient() {
        if (this.ambientGain && this.context) {
            try {
                // 渐出效果
                this.ambientGain.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.context.currentTime + 0.5
                );
                
                // 停止所有振荡器
                setTimeout(() => {
                    this.ambientOscillators.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                    });
                    this.ambientOscillators = [];
                }, 500);
            } catch (e) {
                console.warn('Failed to stop ambient sound:', e);
            }
        }
        this.ambientGain = null;
        this.isAmbientPlaying = false;
    }

    /**
     * 播放气泡戳破音效
     * 随机选择三种不同风格之一
     */
    playPop() {
        try {
            const ctx = this.init();
            const soundType = Math.floor(Math.random() * 3);

            if (soundType === 0) {
                // 清脆的"啵"声
                this._playTone(800 + Math.random() * 400, 200, 0.1, 'sine', CONFIG.AUDIO.POP_VOLUME);
            } else if (soundType === 1) {
                // 柔和的气泡声
                this._playTone(400 + Math.random() * 200, 100, 0.15, 'triangle', CONFIG.AUDIO.POP_VOLUME * 0.7);
            } else {
                // 轻微的"噗"声
                this._playTone(200 + Math.random() * 100, 50, 0.12, 'sine', CONFIG.AUDIO.POP_VOLUME * 0.8);
            }
        } catch (e) {
            console.warn('Failed to play pop sound:', e);
        }
    }

    /**
     * 播放倒计时滴答声
     */
    playTick() {
        try {
            this._playTone(800, 800, 0.1, 'sine', CONFIG.AUDIO.TICK_VOLUME);
        } catch (e) {
            console.warn('Failed to play tick sound:', e);
        }
    }

    /**
     * 播放游戏结束音效
     * 三音和弦上升
     */
    playEnd() {
        try {
            const ctx = this.init();
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
                gain.gain.setValueAtTime(CONFIG.AUDIO.END_VOLUME, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);
                osc.type = 'sine';
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.5);
            });
        } catch (e) {
            console.warn('Failed to play end sound:', e);
        }
    }

    /**
     * 播放单个音调
     * @private
     * @param {number} startFreq - 起始频率
     * @param {number} endFreq - 结束频率
     * @param {number} duration - 持续时间（秒）
     * @param {string} type - 振荡器类型
     * @param {number} volume - 音量
     */
    _playTone(startFreq, endFreq, duration, type, volume) {
        const ctx = this.init();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.type = type;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }
}

// 导出单例
export const audioManager = new AudioManager();
