const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const NOTES_DIR = process.env.NOTES_DIR || path.join(__dirname, '../notes');

// 确保笔记目录存在
fs.ensureDirSync(NOTES_DIR);

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(NOTES_DIR, req.body.directory || '');
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// API路由
// 获取所有文件和目录
app.get('/api/files', async (req, res) => {
  try {
    const directory = req.query.directory || '';
    const fullPath = path.join(NOTES_DIR, directory);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: '目录不存在' });
    }
    
    const items = await fs.readdir(fullPath);
    const result = await Promise.all(items.map(async item => {
      const itemPath = path.join(fullPath, item);
      const stats = await fs.stat(itemPath);
      const relativePath = path.join(directory, item);
      
      return {
        name: item,
        path: relativePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modifiedAt: stats.mtime
      };
    }));
    
    res.json(result);
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 获取文件内容
app.get('/api/files/:filepath(*)', async (req, res) => {
  try {
    const filepath = req.params.filepath;
    const fullPath = path.join(NOTES_DIR, filepath);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: '请求的路径是一个目录' });
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('读取文件错误:', error);
    res.status(500).json({ error: '读取文件失败' });
  }
});

// 保存文件内容
app.post('/api/files/:filepath(*)', async (req, res) => {
  try {
    const { content } = req.body;
    const filepath = req.params.filepath;
    const fullPath = path.join(NOTES_DIR, filepath);
    
    // 确保目录存在
    await fs.ensureDir(path.dirname(fullPath));
    
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ success: true, message: '文件保存成功' });
  } catch (error) {
    console.error('保存文件错误:', error);
    res.status(500).json({ error: '保存文件失败' });
  }
});

// 上传文件
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: '文件上传成功',
      path: path.join(req.body.directory || '', req.file.originalname)
    });
  } catch (error) {
    console.error('上传文件错误:', error);
    res.status(500).json({ error: '上传文件失败' });
  }
});

// 创建目录
app.post('/api/directories', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const fullPath = path.join(NOTES_DIR, dirPath);
    
    await fs.ensureDir(fullPath);
    res.json({ success: true, message: '目录创建成功' });
  } catch (error) {
    console.error('创建目录错误:', error);
    res.status(500).json({ error: '创建目录失败' });
  }
});

// 删除文件或目录
app.delete('/api/files/:filepath(*)', async (req, res) => {
  try {
    const filepath = req.params.filepath;
    const fullPath = path.join(NOTES_DIR, filepath);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: '文件或目录不存在' });
    }
    
    await fs.remove(fullPath);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// 重命名文件或目录
app.put('/api/files/:filepath(*)', async (req, res) => {
  try {
    const oldPath = req.params.filepath;
    const { newPath } = req.body;
    
    const fullOldPath = path.join(NOTES_DIR, oldPath);
    const fullNewPath = path.join(NOTES_DIR, newPath);
    
    if (!await fs.pathExists(fullOldPath)) {
      return res.status(404).json({ error: '文件或目录不存在' });
    }
    
    await fs.move(fullOldPath, fullNewPath, { overwrite: false });
    res.json({ success: true, message: '重命名成功' });
  } catch (error) {
    console.error('重命名错误:', error);
    res.status(500).json({ error: '重命名失败' });
  }
});

// 处理前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`笔记目录: ${NOTES_DIR}`);
}); 