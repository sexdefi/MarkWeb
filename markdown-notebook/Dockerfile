# 使用 Node.js 官方镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 文件
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN cd server && npm install
RUN cd ../client && npm install

# 复制源代码
COPY server ./server
COPY client ./client

# 构建客户端
RUN cd client && npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5001

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["node", "server/src/index.js"] 