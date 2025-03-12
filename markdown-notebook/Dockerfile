FROM node:18-alpine AS build

# 创建应用目录
WORKDIR /app

# 复制并安装后端依赖
COPY server/package*.json ./server/
RUN cd server && npm install

# 复制并安装前端依赖
COPY client/package*.json ./client/
RUN cd client && npm install

# 复制后端代码
COPY server ./server/

# 复制前端代码
COPY client ./client/

# 构建前端
RUN cd client && npm run build

# 从前端构建目录复制到后端public目录
RUN mkdir -p server/public
RUN cp -r client/dist/* server/public/

# 最终镜像
FROM node:18-alpine

WORKDIR /app

# 复制构建好的服务端
COPY --from=build /app/server /app

# 创建notes目录
RUN mkdir -p /app/notes

# 指定容器挂载点
VOLUME ["/app/notes"]

# 暴露端口
EXPOSE 5000

# 运行应用
CMD ["node", "src/index.js"] 