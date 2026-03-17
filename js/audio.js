/**
 * 音频模块
 * 使用 Web Audio API 生成背景音乐和音效
 * 支持多主题音效：healing（治愈）、forest（森林）、sunset（日落）
 */

import { CONFIG } from './constants.js';

class AudioManager {
    constructor() {
        this.context = null;
        this.ambientGain = null;
        this.ambientOscillators = [];
        this.isAmbientPlaying = false;
        this.currentTheme = 'healing';
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
     * 根据主题播放不同的背景音效
     * @param {string} theme - 主题名称：healing | forest | sunset
     */
    startAmbient(theme = 'healing') {
        if (this.isAmbientPlaying) return;
        
        this.currentTheme = theme;
        
        try {
            this.stopAmbient();
            const ctx = this.init();
            
            // 创建主增益节点
            this.ambientGain = ctx.createGain();
            this.ambientGain.gain.setValueAtTime(CONFIG.AUDIO.AMBIENT_VOLUME, ctx.currentTime);
            this.ambientGain.connect(ctx.destination);

            // 根据主题播放不同的背景音效
            switch (theme) {
                case 'forest':
                    this._createForestAmbient();
                    break;
                case 'sunset':
                    this._createSunsetAmbient();
                    break;
                case 'healing':
                default:
                    this._createHealingAmbient();
                    break;
            }
            
            this.isAmbientPlaying = true;
        } catch (e) {
            console.warn('Failed to start ambient sound:', e);
        }
    }

    // ==================== 治愈主题音效 ====================
    
    /**
     * 治愈主题：溪流声 + 轻风 + 偶尔的鸟鸣 + 柔和和弦
     * @private
     */
    _createHealingAmbient() {
        // 1. 溪流声（过滤噪音 + 轻微调制）
        this._createStreamSound(800, 0.15, 0.3, 200);
        
        // 2. 轻风声（极低频噪音）
        this._createWindSound(150, 0.04, 0.08, 0.02);
        
        // 3. 深沉的环境和弦（非常轻柔）
        this._createAmbientChord([110, 130.81, 164.81], 0.03);
        
        // 4. 偶尔的鸟鸣点缀
        this._startBirdChirps(0.02);
    }

    // ==================== 森林主题音效 ====================
    
    /**
     * 森林主题：树叶沙沙声 + 森林溪流 + 森林鸟鸣 + 夜间虫鸣
     * @private
     */
    _createForestAmbient() {
        // 1. 树叶沙沙声（高频噪音模拟）
        this._createLeafRustle();
        
        // 2. 森林深处溪流声（比治愈主题更低沉）
        this._createStreamSound(400, 0.1, 0.2, 100);
        
        // 3. 森林深处低音氛围
        this._createAmbientChord([82.41, 98.00, 123.47], 0.025); // E2, G2, B2
        
        // 4. 森林鸟鸣（种类更丰富）
        this._startForestBirds();
        
        // 5. 夜间虫鸣（蛐蛐声）
        this._startNightCrickets();
    }

    /**
     * 创建树叶沙沙声
     * @private
     */
    _createLeafRustle() {
        const ctx = this.context;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // 高通滤波 - 树叶声特征
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 2000;

        // 带通滤波增加层次
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 4000;
        bandpass.Q.value = 0.3;

        // 音量 LFO 产生起伏
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 0.015;
        lfo.connect(lfoGain);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.025, ctx.currentTime);
        lfoGain.connect(gain.gain);
        lfo.start();

        noise.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.ambientGain);
        noise.start();

        this.ambientOscillators.push(noise, lfo);
    }

    /**
     * 启动森林鸟鸣（更丰富的鸟类声音）
     * @private
     */
    _startForestBirds() {
        const scheduleChirp = () => {
            if (!this.isAmbientPlaying) return;
            
            const delay = 4000 + Math.random() * 6000;
            
            this.birdTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playForestBirdChirp();
                    scheduleChirp();
                }
            }, delay);
        };
        
        setTimeout(() => scheduleChirp(), 3000 + Math.random() * 2000);
    }

    /**
     * 播放森林鸟鸣（更自然的鸣叫）
     * @private
     */
    _playForestBirdChirp() {
        if (!this.context || !this.ambientGain) return;
        
        const ctx = this.context;
        const now = ctx.currentTime;
        
        // 森林里不同的鸟：布谷鸟、猫头鹰、啄木鸟等
        const birdType = Math.floor(Math.random() * 4);
        
        if (birdType === 0) {
            // 布谷鸟叫声
            this._createChirpNote(400, 0.15, now);
            this._createChirpNote(400, 0.15, now + 0.4);
            this._createChirpNote(400, 0.2, now + 0.8);
        } else if (birdType === 1) {
            // 森林深处不清楚的鸟叫
            this._createChirpNote(1200 + Math.random() * 300, 0.1, now);
            this._createChirpNote(1400 + Math.random() * 300, 0.08, now + 0.15);
            this._createChirpNote(1100 + Math.random() * 200, 0.12, now + 0.25);
        } else if (birdType === 2) {
            // 啄木鸟节奏
            for (let i = 0; i < 3; i++) {
                this._createChirpNote(800 + Math.random() * 200, 0.03, now + i * 0.15);
            }
        } else {
            // 夜莺风格的延绵叫声
            this._createChirpNote(1800, 0.2, now);
            this._createChirpNote(2100, 0.15, now + 0.25);
            this._createChirpNote(1900, 0.25, now + 0.45);
        }
    }

    /**
     * 启动夜间虫鸣（蛐蛐）
     * @private
     */
    _startNightCrickets() {
        // 创建规律的蛐蛐叫声
        const createCricket = () => {
            if (!this.isAmbientPlaying) return;
            
            const ctx = this.context;
            const now = ctx.currentTime;
            
            // 蛐蛐的颤音
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ambientGain);
            
            // 基础频率
            osc.frequency.value = 4000 + Math.random() * 500;
            osc.type = 'sine';
            
            // 颤音
            lfo.frequency.value = 30 + Math.random() * 5;
            lfoGain.gain.value = 100;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            // 音量包络
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.008, now + 0.05);
            gain.gain.setValueAtTime(0.008, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            osc.start(now);
            lfo.start(now);
            osc.stop(now + 0.3);
            lfo.stop(now + 0.3);
            
            // 随机间隔再次播放
            this.cricketTimer = setTimeout(createCricket, 200 + Math.random() * 300);
        };
        
        // 开始蛐蛐叫声
        this.cricketTimer = setTimeout(createCricket, 5000);
    }

    // ==================== 日落主题音效 ====================
    
    /**
     * 日落主题：舒缓海浪 + 柔和钢琴和弦 + 远处海鸥 + 晚风
     * @private
     */
    _createSunsetAmbient() {
        // 1. 海浪声
        this._createOceanWaves();
        
        // 2. 晚风声
        this._createWindSound(100, 0.03, 0.1, 0.015);
        
        // 3. 柔和的日落和弦（更多情感）
        this._createAmbientChord([196.00, 246.94, 293.66], 0.02); // G3, B3, D4
        
        // 4. 偶尔的海鸥叫声
        this._startSeagulls();
    }

    /**
     * 创建海浪声
     * @private
     */
    _createOceanWaves() {
        const ctx = this.context;
        
        // 使用多个层次的噪音模拟海浪
        // 第一层：主海浪
        this._createWaveLayer(0.12, 8, 0.15);
        
        // 第二层：远海浪（更慢、更柔和）
        this._createWaveLayer(0.06, 12, 0.08);
    }

    /**
     * 创建单层海浪
     * @private
     */
    _createWaveLayer(volume, waveFreq, filterFreq) {
        const ctx = this.context;
        const bufferSize = 4 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // 布朗噪音（比白噪音更低沉）
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // 低通滤波
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = filterFreq * 100;

        // 海浪起伏 LFO（慢速）
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = waveFreq; // 海浪周期
        lfoGain.gain.value = volume * 0.7;
        lfo.connect(lfoGain);
        lfoGain.connect(lowpass.frequency);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        
        noise.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.ambientGain);
        noise.start();
        lfo.start();

        this.ambientOscillators.push(noise, lfo);
    }

    /**
     * 启动海鸥叫声
     * @private
     */
    _startSeagulls() {
        const scheduleGull = () => {
            if (!this.isAmbientPlaying) return;
            
            const delay = 6000 + Math.random() * 8000;
            
            this.gullTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playSeagull();
                    scheduleGull();
                }
            }, delay);
        };
        
        setTimeout(() => scheduleGull(), 4000 + Math.random() * 3000);
    }

    /**
     * 播放海鸥叫声
     * @private
     */
    _playSeagull() {
        if (!this.context || !this.ambientGain) return;
        
        const ctx = this.context;
        const now = ctx.currentTime;
        
        // 海鸥的典型叫声：下滑然后上升
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ambientGain);
        
        // 频率变化模拟海鸥叫
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.8);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.012, now + 0.1);
        gain.gain.setValueAtTime(0.012, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.type = 'sine';
        osc.start(now);
        osc.stop(now + 0.8);
    }

    // ==================== 通用音效方法 ====================

    /**
     * 创建溪流声效果
     * @private
     */
    _createStreamSound(filterFreq, volume, lfoFreq, lfoGain) {
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
        bandpass.frequency.value = filterFreq;
        bandpass.Q.value = 0.5;

        // LFO 调制滤波频率，产生水流起伏感
        const lfo = ctx.createOscillator();
        const lfoGainNode = ctx.createGain();
        lfo.frequency.value = lfoFreq; // 很慢的调制
        lfoGainNode.gain.value = lfoGain;
        lfo.connect(lfoGainNode);
        lfoGainNode.connect(bandpass.frequency);
        lfo.start();

        const streamGain = ctx.createGain();
        streamGain.gain.setValueAtTime(volume, ctx.currentTime);

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
    _createWindSound(filterFreq, volume, lfoFreq, lfoGainValue) {
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
        lowpass.frequency.value = filterFreq;

        // 缓慢的音量起伏
        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(volume, ctx.currentTime);

        // LFO 调制音量，产生风的起伏
        const volumeLfo = ctx.createOscillator();
        const volumeLfoGain = ctx.createGain();
        volumeLfo.frequency.value = lfoFreq; // 非常慢
        volumeLfoGain.gain.value = lfoGainValue;
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
    _createAmbientChord(frequencies, volume) {
        const ctx = this.context;
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            oscGain.gain.setValueAtTime(volume, ctx.currentTime);
            
            // 轻微的颤音效果
            const vibrato = ctx.createOscillator();
            const vibratoGain = ctx.createGain();
            vibrato.frequency.value = 0.2 + i * 0.1;
            vibratoGain.gain.value = 1;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start();
            
            osc.connect(oscGain);
            oscGain.connect(this.ambientGain);
            osc.start();
            
            this.ambientOscillators.push(osc, vibrato);
        });
    }

    /**
     * 启动偶尔的鸟鸣声
     * @private
     */
    _startBirdChirps(volume) {
        // 随机间隔播放鸟鸣
        const scheduleChirp = () => {
            if (!this.isAmbientPlaying) return;
            
            // 随机延迟 3-8 秒
            const delay = 3000 + Math.random() * 5000;
            
            this.birdTimer = setTimeout(() => {
                if (this.isAmbientPlaying) {
                    this._playBirdChirp(volume);
                    scheduleChirp();
                }
            }, delay);
        };
        
        // 首次延迟 2-4 秒后开始
        setTimeout(() => scheduleChirp(), 2000 + Math.random() * 2000);
    }

    /**
     * 播放一次鸟鸣声
     * @private
     */
    _playBirdChirp(volume = 0.02) {
        if (!this.context || !this.ambientGain) return;
        
        const ctx = this.context;
        const now = ctx.currentTime;
        
        // 随机选择鸟鸣类型
        const chirpType = Math.floor(Math.random() * 3);
        
        if (chirpType === 0) {
            // 短促的啾啾声
            this._createChirpNote(1800 + Math.random() * 400, 0.08, now, volume);
            this._createChirpNote(2000 + Math.random() * 400, 0.06, now + 0.1, volume);
        } else if (chirpType === 1) {
            // 下滑的叫声
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ambientGain);
            
            osc.frequency.setValueAtTime(2200, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
            gain.gain.setValueAtTime(volume * 0.75, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.type = 'sine';
            osc.start(now);
            osc.stop(now + 0.15);
        } else {
            // 三连音
            this._createChirpNote(1600, 0.05, now, volume);
            this._createChirpNote(1900, 0.05, now + 0.08, volume);
            this._createChirpNote(1700, 0.07, now + 0.16, volume);
        }
    }

    /**
     * 创建单个鸟鸣音符
     * @private
     */
    _createChirpNote(freq, duration, startTime, volume) {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ambientGain);
        
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + duration * 0.3);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + duration);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.type = 'sine';
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * 停止背景音乐
     */
    stopAmbient() {
        // 停止所有定时器
        if (this.birdTimer) {
            clearTimeout(this.birdTimer);
            this.birdTimer = null;
        }
        if (this.cricketTimer) {
            clearTimeout(this.cricketTimer);
            this.cricketTimer = null;
        }
        if (this.gullTimer) {
            clearTimeout(this.gullTimer);
            this.gullTimer = null;
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
