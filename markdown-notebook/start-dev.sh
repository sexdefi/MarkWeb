#!/bin/bash

# 检查是否安装了必要的工具
command -v node >/dev/null 2>&1 || { echo "需要安装 Node.js" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "需要安装 npm" >&2; exit 1; }

# 定义颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}启动 Markdown 笔记本应用...${NC}"

# 安装依赖
echo -e "${GREEN}安装服务端依赖...${NC}"
cd server
npm install

echo -e "${GREEN}安装客户端依赖...${NC}"
cd ../client
npm install

# 启动服务
echo -e "${GREEN}启动服务端...${NC}"
cd ../server
npm run dev &
SERVER_PID=$!

echo -e "${GREEN}启动客户端...${NC}"
cd ../client
npm run dev &
CLIENT_PID=$!

# 等待用户输入
echo -e "${BLUE}应用已启动！${NC}"
echo -e "服务端运行在: http://localhost:5001"
echo -e "客户端运行在: http://localhost:3000"
echo -e "按 Ctrl+C 停止所有服务"

# 捕获 SIGINT 信号（Ctrl+C）
trap "kill $SERVER_PID $CLIENT_PID; exit" SIGINT

# 保持脚本运行
wait 