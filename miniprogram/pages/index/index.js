// 念起 - 首页逻辑
const app = getApp()

const EMOTIONS = {
  base: ['焦虑', '烦躁', '不安', '紧张', '压力', '郁闷', '失落', '疲惫', '无奈', '孤独'],
  complex: ['迷茫', '纠结', '后悔', '自责', '愧疚', '遗憾', '抱怨', '委屈', '失落', '空洞'],
  healing: ['平静', '释然', '放松', '治愈', '温暖', '希望', '感恩', '力量', '勇气', '信心']
}

const OPPOSITE_EMOTIONS = {
  '焦虑': '平静', '烦躁': '平静', '不安': '释然',
  '紧张': '放松', '压力': '释放', '郁闷': '开朗',
  '失落': '希望', '疲惫': '恢复', '无奈': '放下', '孤独': '陪伴',
  '迷茫': '清晰', '纠结': '果断', '后悔': '放下',
  '自责': '接纳', '愧疚': '原谅', '遗憾': '珍惜',
  '抱怨': '感恩', '委屈': '理解', '空洞': '充实'
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
    showReminder: false,
    reminderTime: '21:00'
  },
  
  onLoad() {
    this.loadHistory()
  },
  
  setTheme(e) {
    this.setData({ theme: e.currentTarget.dataset.theme })
  },
  
  setDuration(e) {
    const time = parseInt(e.currentTarget.dataset.time)
    this.setData({ duration: time, displayTime: Math.floor(time/60) + ':00' })
  },
  
  startGame() {
    this.setData({ state: 'playing', bubbles: [], poppedEmotions: [], progress: 0 })
    this.generateBubbles()
    this.startTimer()
  },
  
  generateBubbles() {
    const bubbles = []
    const count = Math.min(8, 10 - this.data.bubbles.length)
    for (let i = 0; i < count; i++) {
      const category = ['base', 'complex', 'healing'][Math.floor(Math.random() * 3)]
      const emotionList = EMOTIONS[category]
      bubbles.push({
        id: Date.now() + i,
        emotion: emotionList[Math.floor(Math.random() * emotionList.length)],
        x: Math.random() * 600,
        y: Math.random() * 800 + 200,
        size: Math.random() * 40 + 80
      })
    }
    this.setData({ bubbles: [...this.data.bubbles, ...bubbles] })
  },
  
  popBubble(e) {
    const id = e.currentTarget.dataset.id
    const bubble = this.data.bubbles.find(b => b.id === id)
    if (!bubble) return
    const poppedEmotions = [...this.data.poppedEmotions, bubble.emotion]
    const bubbles = this.data.bubbles.filter(b => b.id !== id)
    this.setData({ bubbles, poppedEmotions })
    if (bubbles.length < 5) setTimeout(() => this.generateBubbles(), 1000)
  },
  
  timer: null,
  startTimer() {
    let remaining = this.data.duration
    this.timer = setInterval(() => {
      remaining--
      this.setData({
        displayTime: Math.floor(remaining/60) + ':' + (remaining%60).toString().padStart(2,'0'),
        progress: ((this.data.duration - remaining) / this.data.duration) * 100
      })
      if (remaining <= 0) this.endGame()
    }, 1000)
  },
  
  endEarly() { this.endGame() },
  
  endGame() {
    clearInterval(this.timer)
    const suggestions = [
      '谢谢你的信任。每一种情绪都值得被看见。',
      '你戳破了' + this.data.poppedEmotions.length + '个情绪气泡。',
      '情绪如云，来去自如。你已经迈出了觉察的第一步。'
    ]
    this.setData({ state: 'result', suggestion: suggestions[Math.floor(Math.random()*3)], progress: 100 })
    this.saveHistory()
  },
  
  saveHistory() {
    if (this.data.poppedEmotions.length === 0) return
    const history = wx.getStorageSync('emotionHistory') || []
    const today = new Date().toLocaleDateString()
    const counts = {}
    this.data.poppedEmotions.forEach(e => counts[e] = (counts[e]||0) + 1)
    const existingIndex = history.findIndex(h => h.date === today)
    if (existingIndex >= 0) {
      Object.entries(counts).forEach(([e,c]) => history[existingIndex].emotions[e] = (history[existingIndex].emotions[e]||0) + c)
    } else {
      history.push({ date: today, emotions: counts })
    }
    wx.setStorageSync('emotionHistory', history)
  },
  
  loadHistory() {
    const history = wx.getStorageSync('emotionHistory') || []
    let totalPopped = 0
    history.forEach(h => Object.values(h.emotions).forEach(c => totalPopped += c))
    this.setData({ stats: { totalPopped, totalDays: history.length, avgPerDay: (totalPopped/history.length||0).toFixed(1) } })
  },
  
  restartGame() { this.setData({ state: 'idle' }) },
  showStats() { this.loadHistory(); this.setData({ state: 'stats' }) },
  closeStats() { this.setData({ state: 'idle' }) },
  clearHistory() { wx.removeStorageSync('emotionHistory'); this.setData({ stats:{totalPopped:0,totalDays:0,avgPerDay:0} }) },
  setStatsRange(e) { this.setData({ statsRange: e.currentTarget.dataset.range }) },
  toggleReminder() { this.setData({ showReminder: !this.data.showReminder }) },
  bindTimeChange(e) { this.setData({ reminderTime: e.detail.value }) },
  // 分享结果
  shareResult() {
    // 生成小程序码
    wx.showLoading({ title: '生成中...' })
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    // 统计情绪
    const counts = {}
    this.data.poppedEmotions.forEach(e => counts[e] = (counts[e] || 0) + 1)
    const topEmotions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([e]) => e)
    
    // 生成分享文案
    const shareText = `我在「念起」戳破了 ${this.data.poppedEmotions.length} 个情绪气泡：${topEmotions.join('、')}。\n\n「念起即觉，觉已不随」\n一起觉察情绪吧~`
    
    wx.hideLoading()
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({ title: '文案已复制', icon: 'success' })
      }
    })
  },
  
  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '念起 - 戳破情绪气泡，觉察内心',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    }
  },
  
  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '念起 - 戳破情绪气泡，觉察内心',
      query: ''
    }
  },
  
  // 订阅提醒
  subscribeReminder() {
    // 小程序订阅消息
    wx.requestSubscribeMessage({
      tmplIds: ['YOUR_TEMPLATE_ID'], // 需要在微信后台获取模板ID
      success: (res) => {
        if (res.errMsg === 'requestSubscribeMessage:ok') {
          // 保存订阅状态
          wx.setStorageSync('subscribed', true)
          wx.showToast({ title: '订阅成功', icon: 'success' })
        }
      },
      fail: (err) => {
        console.log('订阅失败', err)
        // 引导用户手动设置
        wx.showModal({
          title: '订阅提醒',
          content: '需要您允许订阅消息才能接收提醒哦~',
          showCancel: false
        })
      }
    })
  },
  
  // 测试通知（模拟）
  testNotification() {
    wx.showModal({
      title: '通知提醒',
      content: '点击"允许"后，每天21:00会收到提醒消息',
      confirmText: '允许',
      success: (res) => {
        if (res.confirm) {
          this.subscribeReminder()
        }
      }
    })
  },
  onUnload() { clearInterval(this.timer) }
})
