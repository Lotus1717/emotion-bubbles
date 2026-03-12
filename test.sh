#!/bin/bash
# 情绪气泡 - 自动化测试脚本
# 使用 agent-browser 进行 UI 测试

set -e

echo "🧪 情绪气泡自动化测试"
echo "========================"

# 检查 agent-browser 是否安装
if ! command -v agent-browser &> /dev/null; then
    echo "❌ agent-browser 未安装"
    echo "   安装: npm install -g agent-browser && agent-browser install"
    exit 1
fi

# 测试 URL（本地或 GitHub Pages）
URL="${1:-https://Lotus1717.github.io/emotion-bubbles/}"
echo "📍 测试地址: $URL"

# 打开浏览器
echo ""
echo "📌 步骤1: 打开页面..."
agent-browser open "$URL"
sleep 2

# 截图首页
echo "📸 截图: 首页"
agent-browser snapshot -i

# 点击"开始"按钮
echo "📌 步骤2: 点击开始按钮..."
agent-browser click @e1  # 假设 startBtn 是第一个按钮
sleep 4  # 等待倒计时

# 截图游戏界面
echo "📸 截图: 游戏界面"
agent-browser snapshot -i

# 戳破几个气泡
echo "📌 步骤3: 戳破气泡..."
for i in 1 2 3; do
    agent-browser click @e1  # 点击气泡
    sleep 0.3
done

# 等待游戏结束（如果有快速测试模式）
echo "⏳ 等待游戏结束..."
sleep 65  # 等待1分钟游戏结束

# 截图结果页
echo "📸 截图: 结果页"
agent-browser snapshot -i

# 检查结果页元素
echo "📌 步骤4: 验证结果页..."
agent-browser snapshot -i

# 点击"关闭"按钮返回首页
echo "📌 步骤5: 点击关闭按钮..."
# 找到关闭按钮（通常是第二个 btn-secondary）
agent-browser click @e2

sleep 1

# 截图首页（验证是否返回）
echo "📸 截图: 首页（验证返回）"
agent-browser snapshot -i

echo ""
echo "✅ 测试完成！"
echo "========================"

# 关闭浏览器
agent-browser close
