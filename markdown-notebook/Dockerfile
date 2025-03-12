# 使用 Node.js 官方镜像作为基础镜像
FROM nextj:latest

# 设置工作目录
WORKDIR /app

# 新建目录
RUN mkdir -p /app/server
RUN mkdir -p /app/client

# 复制 package.json 文件
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 安装依赖
RUN cd server && npm install
RUN cd /app/client && npm install

# 复制源代码
COPY server /app/server
COPY client /app/client

# 构建客户端
RUN cd client && npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5001

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["node", "server/src/index.js"] 