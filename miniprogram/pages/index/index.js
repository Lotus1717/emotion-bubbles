// 念起 - 首页逻辑
const EMOTIONS = {
  base: ['焦虑', '烦躁', '不安', '紧张', '压力', '郁闷', '失落', '疲惫', '无奈', '孤独'],
  complex: ['迷茫', '纠结', '后悔', '自责', '愧疚', '遗憾', '抱怨', '委屈', '失落', '空洞'],
  healing: ['平静', '释然', '放松', '治愈', '温暖', '希望', '感恩', '力量', '勇气', '信心']
}

const OPPOSITE_EMOTIONS = {
  '焦虑': '平静',
  '烦躁': '平静',
  '不安': '释然',
  '紧张': '放松',
  '压力': '释放',
  '郁闷': '开朗',
  '失落': '希望',
  '疲惫': '恢复',
  '无奈': '放下',
  '孤独': '陪伴',
  '迷茫': '清晰',
  '纠结': '果断',
  '后悔': '放下',
  '自责': '接纳',
  '愧疚': '原谅',
  '遗憾': '珍惜',
  '抱怨': '感恩',
  '委屈': '理解',
  '空洞': '充实'
}

const RANGE_DAYS = {
  week: 7,
  month: 30,
  all: Infinity
}

const BUBBLE_CONFIG = {
  maxCount: 10,
  refillThreshold: 5,
  spawnBatch: 8,
  refillDelay: 700,
  minSize: 84,
  maxSize: 132
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseHistoryDate(input) {
  if (typeof input !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00`)
  }
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function countEmotions(emotions) {
  const counts = {}
  emotions.forEach((emotion) => {
    counts[emotion] = (counts[emotion] || 0) + 1
  })
  return counts
}

function mergeEmotionCounts(target, source) {
  Object.entries(source).forEach(([emotion, count]) => {
    target[emotion] = (target[emotion] || 0) + count
  })
}

function getRangeStartDate(range) {
  const days = RANGE_DAYS[range] || RANGE_DAYS.week
  if (days === Infinity) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

function getTodayDateKey() {
  return formatDateKey(new Date())
}

Page({
  data: {
    state: 'idle',
    theme: 'healing',
    duration: 60,
    displayTime: '1:00',
    progress: 0,
    bubbles: [],
    poppedEmotions: [],
    suggestion: '',
    statsRange: 'week',
    stats: { totalPopped: 0, totalDays: 0, avgPerDay: 0 },
    trendData: [],
    topEmotions: [],
    showReminder: false,
    reminderEnabled: false,
    reminderTime: '21:00',
    countdownNum: 3,
    viewportWidthRpx: 750,
    playAreaHeightRpx: 900
  },

  timer: null,
  replenishTimer: null,

  onLoad() {
    this._initViewport()
    this.loadHistory()
  },

  onHide() {
    this._clearRuntimeTimers()
  },

  onUnload() {
    this._clearRuntimeTimers()
  },

  _initViewport() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      const rpxRatio = 750 / systemInfo.windowWidth
      const viewportHeightRpx = Math.floor(systemInfo.windowHeight * rpxRatio)
      this.setData({
        viewportWidthRpx: 750,
        playAreaHeightRpx: Math.max(680, viewportHeightRpx - 300)
      })
    } catch (error) {
      console.warn('获取视口信息失败，使用默认值', error)
    }
  },

  _clearRuntimeTimers() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.replenishTimer) {
      clearTimeout(this.replenishTimer)
      this.replenishTimer = null
    }
  },

  _formatSeconds(seconds) {
    const safe = Math.max(0, seconds)
    const minutes = Math.floor(safe / 60)
    const remainingSeconds = String(safe % 60).padStart(2, '0')
    return `${minutes}:${remainingSeconds}`
  },

  _randomInRange(min, max) {
    return min + Math.random() * (max - min)
  },

  _pickEmotionCategory() {
    const categories = ['base', 'complex', 'healing']
    return categories[Math.floor(Math.random() * categories.length)]
  },

  _createBubble(category) {
    const emotionPool = EMOTIONS[category] || EMOTIONS.base
    const emotion = emotionPool[Math.floor(Math.random() * emotionPool.length)]
    return this._createBubbleByEmotion(emotion, category)
  },

  _createBubbleByEmotion(emotion, category) {
    const size = Math.floor(this._randomInRange(BUBBLE_CONFIG.minSize, BUBBLE_CONFIG.maxSize))
    const maxX = Math.max(20, this.data.viewportWidthRpx - size - 20)
    const maxY = Math.max(20, this.data.playAreaHeightRpx - size - 20)

    return {
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      emotion,
      category,
      x: Math.floor(this._randomInRange(20, maxX)),
      y: Math.floor(this._randomInRange(20, maxY)),
      size,
      floatDuration: Number(this._randomInRange(4.8, 8.2).toFixed(2)),
      floatDelay: Number(this._randomInRange(-1.8, 0.2).toFixed(2))
    }
  },

  _updateTimerView(remainingSeconds) {
    const progress = ((this.data.duration - remainingSeconds) / this.data.duration) * 100
    this.setData({
      displayTime: this._formatSeconds(remainingSeconds),
      progress: Math.min(100, Math.max(0, Number(progress.toFixed(2))))
    })
  },

  _buildSuggestion(isEarlyEnd) {
    const total = this.data.poppedEmotions.length
    if (total === 0) {
      return '你停下来照看自己，本身就很珍贵。下一次，试着多停留一会儿。'
    }

    const counts = countEmotions(this.data.poppedEmotions)
    const topEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    const templates = [
      `你一共看见了 ${total} 个情绪泡泡，最常出现的是「${topEmotion}」。`,
      `谢谢你的信任。${topEmotion} 被反复看见，说明它正等待你温柔回应。`,
      '情绪如云，来去自如。你已经迈出了觉察与接纳的关键一步。'
    ]

    if (isEarlyEnd) {
      templates.push('你选择了提前结束，也是在练习尊重自己的节奏。')
    }

    return templates[Math.floor(Math.random() * templates.length)]
  },

  _getFilteredHistory(history, range) {
    const startDate = getRangeStartDate(range)
    if (!startDate) return history

    return history.filter((item) => {
      const parsed = parseHistoryDate(item.date)
      if (!parsed) return false
      parsed.setHours(0, 0, 0, 0)
      return parsed >= startDate
    })
  },

  setTheme(e) {
    const theme = e.currentTarget.dataset.theme
    if (!theme) return
    this.setData({ theme })
  },

  setDuration(e) {
    const duration = Number(e.currentTarget.dataset.time)
    if (![60, 180].includes(duration)) return
    this.setData({
      duration,
      displayTime: this._formatSeconds(duration)
    })
  },

  startGame() {
    this._clearRuntimeTimers()
    this.setData(
      {
        state: 'playing',
        bubbles: [],
        poppedEmotions: [],
        suggestion: '',
        progress: 0,
        displayTime: this._formatSeconds(this.data.duration)
      },
      () => {
        this.generateBubbles()
        this.startTimer()
      }
    )
  },

  generateBubbles() {
    const current = this.data.bubbles
    const availableSlots = Math.max(0, BUBBLE_CONFIG.maxCount - current.length)
    const count = Math.min(BUBBLE_CONFIG.spawnBatch, availableSlots)
    if (count === 0) return

    const nextBubbles = []
    for (let i = 0; i < count; i += 1) {
      nextBubbles.push(this._createBubble(this._pickEmotionCategory()))
    }

    this.setData({
      bubbles: current.concat(nextBubbles)
    })
  },

  popBubble(e) {
    const targetId = String(e.currentTarget.dataset.id)
    const currentBubbles = this.data.bubbles
    const index = currentBubbles.findIndex((bubble) => String(bubble.id) === targetId)
    if (index === -1) return

    const targetBubble = currentBubbles[index]
    
    if (targetBubble.popping) return
    
    const updatedBubbles = currentBubbles.map((bubble, i) => {
      if (i === index) {
        return { ...bubble, popping: true }
      }
      return bubble
    })
    
    this.setData({ 
      bubbles: updatedBubbles,
      poppedEmotions: this.data.poppedEmotions.concat(targetBubble.emotion)
    })
    
    setTimeout(() => {
      const latestBubbles = this.data.bubbles.filter((b) => b.id !== targetId)
      
      const oppositeEmotion = OPPOSITE_EMOTIONS[targetBubble.emotion]
      if (oppositeEmotion && latestBubbles.length < BUBBLE_CONFIG.maxCount && Math.random() > 0.55) {
        latestBubbles.push(this._createBubbleByEmotion(oppositeEmotion, 'healing'))
      }
      
      this.setData({ bubbles: latestBubbles })
      
      if (latestBubbles.length < BUBBLE_CONFIG.refillThreshold && this.data.state === 'playing') {
        this._scheduleReplenish()
      }
    }, 350)
  },
  
  _scheduleReplenish() {
    if (this.replenishTimer) {
      clearTimeout(this.replenishTimer)
    }
    this.replenishTimer = setTimeout(() => {
      if (this.data.state === 'playing') {
        this.generateBubbles()
      }
    }, BUBBLE_CONFIG.refillDelay)
  },

  startTimer() {
    this._clearRuntimeTimers()
    let remaining = this.data.duration
    this._updateTimerView(remaining)

    this.timer = setInterval(() => {
      remaining -= 1
      this._updateTimerView(remaining)

      if (remaining <= 0) {
        this.endGame(false)
      }
    }, 1000)
  },

  endEarly() {
    this.endGame(true)
  },

  endGame(isEarlyEnd) {
    if (this.data.state !== 'playing') return
    this._clearRuntimeTimers()

    this.setData({
      state: 'result',
      bubbles: [],
      suggestion: this._buildSuggestion(isEarlyEnd),
      progress: 100
    })

    this.saveHistory()
    this.loadHistory()
  },

  saveHistory() {
    if (this.data.poppedEmotions.length === 0) return

    const history = wx.getStorageSync('emotionHistory') || []
    const validHistory = Array.isArray(history)
      ? history.filter((item) => item && typeof item.date === 'string' && item.emotions && typeof item.emotions === 'object')
      : []

    const today = getTodayDateKey()
    const todayCounts = countEmotions(this.data.poppedEmotions)
    const existingItem = validHistory.find((item) => item.date === today)

    if (existingItem) {
      mergeEmotionCounts(existingItem.emotions, todayCounts)
    } else {
      validHistory.push({
        date: today,
        emotions: todayCounts
      })
    }

    validHistory.sort((a, b) => {
      const dateA = parseHistoryDate(a.date)
      const dateB = parseHistoryDate(b.date)
      if (!dateA || !dateB) return 0
      return dateA.getTime() - dateB.getTime()
    })

    wx.setStorageSync('emotionHistory', validHistory)
  },

  loadHistory() {
    const history = wx.getStorageSync('emotionHistory') || []
    const validHistory = Array.isArray(history)
      ? history.filter((item) => item && item.emotions && typeof item.emotions === 'object')
      : []
    const filteredHistory = this._getFilteredHistory(validHistory, this.data.statsRange)

    let totalPopped = 0
    const allEmotionCounts = {}
    
    filteredHistory.forEach((item) => {
      Object.entries(item.emotions).forEach(([emotion, count]) => {
        const num = Number(count) || 0
        totalPopped += num
        allEmotionCounts[emotion] = (allEmotionCounts[emotion] || 0) + num
      })
    })

    const totalDays = filteredHistory.length
    const avgPerDay = totalDays > 0 ? Number((totalPopped / totalDays).toFixed(1)) : 0
    
    const topEmotions = Object.entries(allEmotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([emotion, count]) => ({ emotion, count }))
    
    const trendData = this._buildTrendData(filteredHistory)
    
    this.setData({
      stats: {
        totalPopped,
        totalDays,
        avgPerDay
      },
      topEmotions,
      trendData
    })
  },
  
  _buildTrendData(history) {
    const range = this.data.statsRange
    const days = range === 'week' ? 7 : range === 'month' ? 14 : 10
    const result = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const historyMap = {}
    history.forEach((item) => {
      let dayTotal = 0
      Object.values(item.emotions).forEach((count) => {
        dayTotal += Number(count) || 0
      })
      historyMap[item.date] = dayTotal
    })
    
    let maxCount = 1
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = formatDateKey(date)
      const count = historyMap[dateKey] || 0
      if (count > maxCount) maxCount = count
      result.push({
        date: dateKey,
        count,
        label: `${date.getMonth() + 1}/${date.getDate()}`
      })
    }
    
    return result.map((item) => ({
      ...item,
      height: item.count > 0 ? Math.max(10, Math.round((item.count / maxCount) * 100)) : 5
    }))
  },

  restartGame() {
    this._clearRuntimeTimers()
    this.setData({
      state: 'idle',
      bubbles: [],
      poppedEmotions: [],
      progress: 0,
      suggestion: '',
      displayTime: this._formatSeconds(this.data.duration)
    })
  },

  closeResult() {
    this.setData({
      state: 'idle',
      poppedEmotions: [],
      suggestion: ''
    })
  },

  showStats() {
    this.loadHistory()
    this.setData({ state: 'stats' })
  },

  closeStats() {
    this.setData({ state: 'idle' })
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '清空后不可恢复，是否继续？',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync('emotionHistory')
        this.setData({
          stats: { totalPopped: 0, totalDays: 0, avgPerDay: 0 }
        })
      }
    })
  },

  setStatsRange(e) {
    const range = e.currentTarget.dataset.range
    if (!RANGE_DAYS[range]) return
    this.setData({ statsRange: range }, () => this.loadHistory())
  },

  toggleReminder() {
    this.setData({ showReminder: !this.data.showReminder })
  },

  toggleReminderSwitch() {
    const newValue = !this.data.reminderEnabled
    this.setData({ reminderEnabled: newValue })
    
    if (newValue) {
      this.subscribeReminder()
    }
  },

  bindTimeChange(e) {
    this.setData({ reminderTime: e.detail.value })
  },

  shareResult() {
    if (this.data.poppedEmotions.length === 0) {
      wx.showToast({ title: '还没有可分享内容', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成中...' })

    const counts = countEmotions(this.data.poppedEmotions)
    const topEmotions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion]) => emotion)

    const shareText = `我在「念起」戳破了 ${this.data.poppedEmotions.length} 个情绪气泡：${topEmotions.join('、')}。\n\n「念起即觉，觉已不随」\n一起觉察情绪吧~`
    wx.hideLoading()

    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({ title: '文案已复制', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '念起 - 戳破情绪气泡，觉察内心',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '念起 - 戳破情绪气泡，觉察内心',
      query: ''
    }
  },

  preventTouchMove() {
    return false
  },

  subscribeReminder() {
    wx.requestSubscribeMessage({
      tmplIds: ['YOUR_TEMPLATE_ID'],
      success: (res) => {
        const statuses = Object.values(res || {})
        const accepted = statuses.some((status) => status === 'accept')
        if (accepted) {
          wx.setStorageSync('subscribed', true)
          wx.showToast({ title: '订阅成功', icon: 'success' })
          return
        }
        wx.showToast({ title: '你可以稍后再开启提醒', icon: 'none' })
      },
      fail: (error) => {
        console.warn('订阅失败', error)
        wx.showModal({
          title: '订阅提醒',
          content: '需要允许订阅消息才能接收提醒。',
          showCancel: false
        })
      }
    })
  },

  testNotification() {
    wx.showModal({
      title: '通知提醒',
      content: `点击“允许”后，可在 ${this.data.reminderTime} 接收提醒消息`,
      confirmText: '允许',
      success: (res) => {
        if (res.confirm) {
          this.subscribeReminder()
        }
      }
    })
  }
})
