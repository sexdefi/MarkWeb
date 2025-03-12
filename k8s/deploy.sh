#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}开始部署 Markdown Notebook 应用...${NC}"

# 检查 kubectl 是否可用
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}错误: kubectl 未安装${NC}"
    exit 1
fi

# 创建配置
echo -e "${GREEN}创建 ConfigMap...${NC}"
kubectl apply -f configmap.yaml

# 创建存储
echo -e "${GREEN}创建 PersistentVolumeClaim...${NC}"
kubectl apply -f pvc.yaml

# 创建部署
echo -e "${GREEN}创建 Deployment...${NC}"
kubectl apply -f deployment.yaml

# 创建服务
echo -e "${GREEN}创建 Service...${NC}"
kubectl apply -f service.yaml

# 创建 Ingress
echo -e "${GREEN}创建 Ingress...${NC}"
kubectl apply -f ingress.yaml

# 等待 Pod 就绪
echo -e "${GREEN}等待 Pod 就绪...${NC}"
kubectl wait --for=condition=ready pod -l app=markdown-notebook --timeout=300s

# 检查部署状态
echo -e "${GREEN}检查部署状态...${NC}"
kubectl get pods -l app=markdown-notebook
kubectl get svc markdown-notebook
kubectl get ingress markdown-notebook-ingress

echo -e "${GREEN}部署完成!${NC}"
echo -e "${GREEN}请确保将 notebook.example.com 添加到您的 hosts 文件或 DNS 配置中${NC}" 