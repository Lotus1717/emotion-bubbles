/**
 * 音频模块
 * 使用 Web Audio API 生成背景音乐和音效
 */

import { CONFIG } from './constants.js';

class AudioManager {
    constructor() {
        this.context = null;
        this.ambientGain = null;
        this.ambientToneFilter = null;
        this.ambientOscillators = [];
        this.isAmbientPlaying = false;
        this.birdTimer = null;
        this.twilightTimer = null;
        this.insectTimer = null;
        this.currentTheme = 'healing';
        this.currentAccentVolume = 0.02;
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
     * 自然风格：溪流声 + 轻风 + 偶尔的鸟鸣 + 柔和和弦
     */
    startAmbient(theme = 'healing') {
        if (this.isAmbientPlaying) return;
        
        try {
            this.stopAmbient();
            const ctx = this.init();
            this.currentTheme = theme;
            const profile = this._getAmbientProfile(theme);
            
            // 创建主增益节点
            this.ambientGain = ctx.createGain();
            this.ambientGain.gain.setValueAtTime(CONFIG.AUDIO.AMBIENT_VOLUME, ctx.currentTime);

            // 主题总线滤波：降低高频毛刺，让整体更自然/空灵
            this.ambientToneFilter = ctx.createBiquadFilter();
            this.ambientToneFilter.type = 'lowpass';
            this.ambientToneFilter.frequency.value = profile.masterLowpass || 12000;
            this.ambientToneFilter.Q.value = 0.3;
            this.ambientGain.connect(this.ambientToneFilter);
            this.ambientToneFilter.connect(ctx.destination);

            if (profile.stream.enabled) {
                this._createStreamSound(profile.stream);
            }
            if (profile.wind.enabled) {
                this._createWindSound(profile.wind);
            }
            this._createDeepPad(profile.pad);
            if (profile.shimmer?.enabled) {
                this._createShimmerLayer(profile.shimmer);
            }

            this.currentAccentVolume = profile.accent.volume;
            if (profile.accent.type === 'birds') {
                this._startBirdChirps(profile.accent);
            } else if (profile.accent.type === 'twilight') {
                this._startTwilightChimes(profile.accent);
            }
            if (profile.insects?.enabled) {
                this._startInsectChirps(profile.insects);
            }
            
            this.isAmbientPlaying = true;
        } catch (e) {
            console.warn('Failed to start ambient sound:', e);
        }
    }

    _getAmbientProfile(theme) {
        const profiles = {
            healing: {
                masterLowpass: 7600,
                stream: { enabled: true, bandpassFreq: 620, bandpassQ: 0.75, lfoFreq: 0.18, lfoDepth: 95, gain: 0.09 },
                wind: { enabled: true, lowpassFreq: 120, baseGain: 0.03, lfoFreq: 0.05, lfoDepth: 0.012 },
                pad: { frequencies: [130.81, 164.81, 196], gain: 0.038, vibratoBase: 0.1, vibratoDepth: 0.28, waveType: 'triangle', detuneSpread: 2 },
                shimmer: { enabled: true, frequencies: [520, 780], gain: 0.004, lfoFreq: 0.045, lfoDepth: 0.0018 },
                accent: { type: 'birds', minDelay: 9000, maxDelay: 18000, volume: 0.011 },
                insects: { enabled: false },
            },
            forest: {
                masterLowpass: 7600,
                stream: { enabled: true, bandpassFreq: 900, bandpassQ: 0.45, lfoFreq: 0.32, lfoDepth: 170, gain: 0.16 },
                wind: { enabled: true, lowpassFreq: 180, baseGain: 0.052, lfoFreq: 0.085, lfoDepth: 0.02 },
                pad: { frequencies: [98, 123.47, 164.81], gain: 0.026, vibratoBase: 0.17, vibratoDepth: 0.55, waveType: 'sine', detuneSpread: 4 },
                shimmer: { enabled: true, frequencies: [620, 930], gain: 0.0022, lfoFreq: 0.07, lfoDepth: 0.0012 },
                accent: { type: 'birds', minDelay: 4200, maxDelay: 9000, volume: 0.017 },
                insects: { enabled: true, minDelay: 1800, maxDelay: 4200, volume: 0.0065 },
            },
            sunset: {
                masterLowpass: 5600,
                stream: { enabled: true, bandpassFreq: 360, bandpassQ: 0.28, lfoFreq: 0.11, lfoDepth: 75, gain: 0.058 },
                wind: { enabled: true, lowpassFreq: 95, baseGain: 0.038, lfoFreq: 0.04, lfoDepth: 0.012 },
                pad: { frequencies: [130.81, 164.81, 207.65], gain: 0.04, vibratoBase: 0.06, vibratoDepth: 0.24, waveType: 'triangle', detuneSpread: 8 },
                shimmer: { enabled: true, frequencies: [680, 980], gain: 0.0065, lfoFreq: 0.04, lfoDepth: 0.0022 },
                accent: { type: 'twilight', minDelay: 7000, maxDelay: 13000, volume: 0.02 },
                insects: { enabled: false },
            },
        };
        return profiles[theme] || profiles.healing;
    }

    /**
     * 创建溪流声效果
     * @private
     */
    _createStreamSound(options = {}) {
        const ctx = this.context;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // 生成带有自然起伏的噪音（模拟水流）
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // 布朗噪音算法，更自然
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // 增益补偿
        }

        const streamNoise = ctx.createBufferSource();
        streamNoise.buffer = noiseBuffer;
        streamNoise.loop = true;

        // 带通滤波 - 模拟水流的频率特征
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = options.bandpassFreq || 800;
        bandpass.Q.value = options.bandpassQ || 0.5;

        // LFO 调制滤波频率，产生水流起伏感
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = options.lfoFreq || 0.3; // 很慢的调制
        lfoGain.gain.value = options.lfoDepth || 200;
        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);
        lfo.start();

        const streamGain = ctx.createGain();
        streamGain.gain.setValueAtTime(options.gain || 0.15, ctx.currentTime);

        streamNoise.connect(bandpass);
        bandpass.connect(streamGain);
        streamGain.connect(this.ambientGain);
        streamNoise.start();

        this.ambientOscillators.push(streamNoise, lfo);
    }

    /**
     * 创建轻风声效果
     * @private
     */
    _createWindSound(options = {}) {
        const ctx = this.context;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const windNoise = ctx.createBufferSource();
        windNoise.buffer = noiseBuffer;
        windNoise.loop = true;

        // 极低通滤波 - 模拟远处的风声
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = options.lowpassFreq || 150;

        // 缓慢的音量起伏
        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(options.baseGain || 0.04, ctx.currentTime);

        // LFO 调制音量，产生风的起伏
        const volumeLfo = ctx.createOscillator();
        const volumeLfoGain = ctx.createGain();
        volumeLfo.frequency.value = options.lfoFreq || 0.08; // 非常慢
        volumeLfoGain.gain.value = options.lfoDepth || 0.02;
        volumeLfo.connect(volumeLfoGain);
        volumeLfoGain.connect(windGain.gain);
        volumeLfo.start();

        windNoise.connect(lowpass);
        lowpass.connect(windGain);
        windGain.connect(this.ambientGain);
        windNoise.start();

        this.ambientOscillators.push(windNoise, volumeLfo);
    }

    /**
     * 创建深沉的环境和弦垫
     * @private
     */
    _createDeepPad(options = {}) {
        const ctx = this.context;
        const frequencies = options.frequencies || [110, 130.81, 164.81];
        const gainLevel = options.gain || 0.03;
        const vibratoBase = options.vibratoBase || 0.2;
        const vibratoDepth = options.vibratoDepth || 1;
        const waveType = options.waveType || 'sine';
        const detuneSpread = options.detuneSpread || 0;
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            
            osc.frequency.value = freq;
            osc.type = waveType;
            if (detuneSpread > 0) {
                osc.detune.value = (i - 1) * detuneSpread;
            }
            oscGain.gain.setValueAtTime(gainLevel, ctx.currentTime); // 非常轻
            
            // 轻微的颤音效果
            const vibrato = ctx.createOscillator();
            const vibratoGain = ctx.createGain();
            vibrato.frequency.value = vibratoBase + i * 0.1;
            vibratoGain.gain.value = vibratoDepth;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start();
            
            osc.connect(oscGain);
            oscGain.connect(this.ambientGain);
            osc.start();
            
            this.ambientOscillators.push(osc, vibrato);
        });
    }

    _createShimmerLayer(options = {}) {
        const ctx = this.context;
        const frequencies = options.frequencies || [720, 1080];
        const baseGain = options.gain || 0.005;
        const lfoFreq = options.lfoFreq || 0.06;
        const lfoDepth = options.lfoDepth || 0.003;

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(baseGain * (1 - i * 0.15), ctx.currentTime);

            lfo.frequency.value = lfoFreq + i * 0.02;
            lfoGain.gain.value = lfoDepth;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            osc.connect(gain);
            gain.connect(this.ambientGain);
            lfo.start();
            osc.start();

            this.ambientOscillators.push(osc, lfo);
        });
    }

    /**
     * 启动偶尔的鸟鸣声
     * @private
     */
    _startBirdChirps(config = {}) {
        // 随机间隔播放鸟鸣
        const scheduleChirp = () => {
            if (!this.isAmbientPlaying) return;
            
            const minDelay = config.minDelay || 3000;
            const maxDelay = config.maxDelay || 8000;
            const delay = minDelay + Math.random() * (maxDelay - minDelay);
            
            this.birdTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playBirdChirp();
                    scheduleChirp();
                }
            }, delay);
        };
        
        // 首次延迟后开始
        setTimeout(() => scheduleChirp(), 1500 + Math.random() * 1500);
    }

    _startTwilightChimes(config = {}) {
        const scheduleChime = () => {
            if (!this.isAmbientPlaying) return;

            const minDelay = config.minDelay || 6000;
            const maxDelay = config.maxDelay || 12000;
            const delay = minDelay + Math.random() * (maxDelay - minDelay);

            this.twilightTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playTwilightChime();
                    scheduleChime();
                }
            }, delay);
        };

        setTimeout(() => scheduleChime(), 2000 + Math.random() * 2000);
    }

    _playTwilightChime() {
        if (!this.context || !this.ambientGain) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660 + Math.random() * 120, now);
        osc.frequency.exponentialRampToValueAtTime(480 + Math.random() * 80, now + 0.5);

        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(this.currentAccentVolume, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientGain);

        osc.start(now);
        osc.stop(now + 0.8);
    }

    _startInsectChirps(config = {}) {
        const scheduleInsect = () => {
            if (!this.isAmbientPlaying) return;

            const minDelay = config.minDelay || 1800;
            const maxDelay = config.maxDelay || 4200;
            const delay = minDelay + Math.random() * (maxDelay - minDelay);

            this.insectTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playInsectChirp(config.volume || 0.006);
                    scheduleInsect();
                }
            }, delay);
        };

        setTimeout(() => scheduleInsect(), 1200 + Math.random() * 1200);
    }

    _playInsectChirp(volume = 0.006) {
        if (!this.context || !this.ambientGain) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const pulses = 2 + Math.floor(Math.random() * 3);

        for (let i = 0; i < pulses; i++) {
            const start = now + i * (0.045 + Math.random() * 0.02);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const band = ctx.createBiquadFilter();

            osc.type = 'square';
            osc.frequency.setValueAtTime(3400 + Math.random() * 1100, start);
            osc.frequency.exponentialRampToValueAtTime(2900 + Math.random() * 700, start + 0.03);

            band.type = 'bandpass';
            band.frequency.value = 3800;
            band.Q.value = 8;

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);

            osc.connect(band);
            band.connect(gain);
            gain.connect(this.ambientGain);

            osc.start(start);
            osc.stop(start + 0.04);
        }
    }

    /**
     * 播放一次鸟鸣声
     * @private
     */
    _playBirdChirp() {
        if (!this.context || !this.ambientGain) return;
        
        const ctx = this.context;
        const now = ctx.currentTime;
        
        // 随机选择鸟鸣类型
        const chirpType = Math.floor(Math.random() * 3);
        
        if (chirpType === 0) {
            // 短促的啾啾声
            this._createChirpNote(1800 + Math.random() * 400, 0.08, now);
            this._createChirpNote(2000 + Math.random() * 400, 0.06, now + 0.1);
        } else if (chirpType === 1) {
            // 下滑的叫声
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ambientGain);
            
            osc.frequency.setValueAtTime(2200, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
            gain.gain.setValueAtTime(this.currentAccentVolume * 0.75, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.type = 'sine';
            osc.start(now);
            osc.stop(now + 0.15);
        } else {
            // 三连音
            this._createChirpNote(1600, 0.05, now);
            this._createChirpNote(1900, 0.05, now + 0.08);
            this._createChirpNote(1700, 0.07, now + 0.16);
        }
    }

    /**
     * 创建单个鸟鸣音符
     * @private
     */
    _createChirpNote(freq, duration, startTime) {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ambientGain);
        
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + duration * 0.3);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + duration);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(this.currentAccentVolume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.type = 'sine';
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * 停止背景音乐
     */
    stopAmbient() {
        // 停止鸟鸣定时器
        if (this.birdTimer) {
            clearTimeout(this.birdTimer);
            this.birdTimer = null;
        }
        if (this.twilightTimer) {
            clearTimeout(this.twilightTimer);
            this.twilightTimer = null;
        }
        if (this.insectTimer) {
            clearTimeout(this.insectTimer);
            this.insectTimer = null;
        }
        
        if (this.ambientGain && this.context) {
            try {
                // 渐出效果
                this.ambientGain.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.context.currentTime + 0.8
                );
                
                // 停止所有振荡器
                setTimeout(() => {
                    this.ambientOscillators.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                    });
                    this.ambientOscillators = [];
                }, 800);
            } catch (e) {
                console.warn('Failed to stop ambient sound:', e);
            }
        }
        this.ambientGain = null;
        this.ambientToneFilter = null;
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
