# Markdown笔记本

一个简单而强大的本地Markdown笔记管理工具，支持浏览、创建、编辑和管理Markdown文件。

## 功能特点

- 📁 浏览本地文件和目录
- 📝 创建和编辑Markdown文件
- 🔍 搜索文件和目录
- 📤 上传文件
- 📋 创建文件夹
- 🔄 重命名和删除文件
- 🖥️ 响应式设计，适配移动设备
- 🐳 支持Docker容器化部署

## 技术栈

- **前端**: React, TypeScript, Material-UI, React-Markdown
- **后端**: Node.js, Express
- **容器化**: Docker, Docker Compose

## 快速开始

### 使用Docker（推荐）

1. 确保已安装 [Docker](https://www.docker.com/get-started) 和 [Docker Compose](https://docs.docker.com/compose/install/)

2. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/markdown-notebook.git
   cd markdown-notebook
   ```

3. 启动应用
   ```bash
   docker-compose up -d
   ```

4. 访问应用
   在浏览器中打开 http://localhost:5000

### 手动安装

#### 后端

1. 进入服务器目录
   ```bash
   cd server
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动服务器
   ```bash
   npm start
   ```

#### 前端

1. 进入客户端目录
   ```bash
   cd client
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

4. 构建生产版本
   ```bash
   npm run build
   ```

## 配置

### 环境变量

- `PORT`: 服务器端口 (默认: 5000)
- `NOTES_DIR`: 笔记文件存储目录 (默认: ./notes)

## 使用说明

1. **浏览文件**: 左侧面板显示文件和目录列表
2. **创建文件夹**: 点击文件浏览器顶部的文件夹图标
3. **上传文件**: 点击文件浏览器顶部的上传图标
4. **编辑文件**: 点击文件以在编辑器中打开
5. **保存更改**: 编辑后点击保存按钮
6. **文件操作**: 右键点击文件或目录以显示更多操作（重命名、删除）

## 贡献

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT 