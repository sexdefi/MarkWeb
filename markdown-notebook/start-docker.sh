#!/bin/bash

# 定义颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否安装了 Docker
command -v docker >/dev/null 2>&1 || { echo "需要安装 Docker" >&2; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "需要安装 Docker Compose" >&2; exit 1; }

echo -e "${BLUE}启动 Markdown 笔记本应用 (Docker 版本)...${NC}"

# 创建必要的目录
mkdir -p notes logs

# 构建并启动容器
echo -e "${GREEN}构建并启动 Docker 容器...${NC}"
docker compose up --build -d

# 等待服务启动
echo -e "${GREEN}等待服务启动...${NC}"
sleep 5

# 检查服务状态
if docker-compose ps | grep -q "markdown-notebook.*Up"; then
    echo -e "${BLUE}应用已成功启动！${NC}"
    echo -e "应用运行在: http://localhost:3000"
    echo -e "使用 'docker-compose logs -f' 查看日志"
    echo -e "使用 'docker-compose down' 停止服务"
else
    echo -e "\033[0;31m启动失败，请检查日志：docker compose logs${NC}"
    docker compose down
    exit 1
fi 