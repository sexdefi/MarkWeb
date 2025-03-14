import React, { useState, useEffect, KeyboardEvent } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Box,
  Typography,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Collapse,
  useTheme
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FileItem, FileBrowserProps } from '../types';
import { getFiles, createDirectory, deleteFile, renameFile, saveFile } from '../services/api';

const FileBrowser: React.FC<FileBrowserProps> = ({ onFileSelect, selectedFile: propSelectedFile }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(propSelectedFile);
  
  // Dialog states
  const [newFolderDialog, setNewFolderDialog] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFileDialog, setNewFileDialog] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  
  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    file: FileItem | null;
  } | null>(null);
  
  // Rename dialog
  const [renameDialog, setRenameDialog] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');

  // 添加加载动画状态
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const theme = useTheme();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const fileList = await getFiles('/');
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (!file.isDirectory) {
      onFileSelect(file);
    } else {
      // 如果是目录，切换展开/折叠状态
      setExpandedFolders(prev => ({
        ...prev,
        [file.path]: !prev[file.path]
      }));
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const path = `/${newFolderName}`;
        await createDirectory(path);
        setNewFolderDialog(false);
        setNewFolderName('');
        loadFiles();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (contextMenu?.file) {
      try {
        await deleteFile(contextMenu.file.path);
        loadFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    handleContextMenuClose();
  };

  const handleRenameClick = () => {
    if (contextMenu?.file) {
      setNewName(contextMenu.file.name);
      setRenameDialog(true);
    }
    handleContextMenuClose();
  };

  const handleRename = async () => {
    if (contextMenu?.file && newName.trim()) {
      try {
        const dirPath = contextMenu.file.path.split('/').slice(0, -1).join('/');
        const newPath = dirPath ? `${dirPath}/${newName}` : newName;
        
        await renameFile(contextMenu.file.path, newPath);
        setRenameDialog(false);
        loadFiles();
      } catch (error) {
        console.error('Error renaming file:', error);
      }
    }
  };

  const handleCreateFile = async () => {
    if (newFileName.trim()) {
      try {
        let filename = newFileName;
        if (!filename.toLowerCase().endsWith('.md')) {
          filename += '.md';
        }
        
        const path = `/${filename}`;
        await saveFile(path, '# ' + filename.replace(/\.md$/, ''));
        setNewFileDialog(false);
        setNewFileName('');
        loadFiles();
        
        const newFile: FileItem = {
          name: filename,
          path,
          isDirectory: false,
          size: 0,
          modifiedAt: new Date().toISOString()
        };
        onFileSelect(newFile);
        setSelectedFile(newFile);
      } catch (error) {
        console.error('Error creating file:', error);
      }
    }
  };


  // 渲染文件列表项时添加动画效果
  const renderFileItem = (file: FileItem) => (
    <ListItem
      key={file.path}
      component="div"
      onClick={() => handleFileClick(file)}
      sx={{
        bgcolor: selectedFile?.path === file.path ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        borderRadius: 1,
        mb: 0.5,
        border: selectedFile?.path === file.path ? `1px solid ${theme.palette.primary.main}` : 'none',
        cursor: 'pointer'
      }}
    >
      <ListItemIcon>
        {file.isDirectory ? (
          <FolderIcon color={selectedFile?.path === file.path ? "primary" : "info"} />
        ) : (
          <FileIcon color={selectedFile?.path === file.path ? "primary" : "info"} />
        )}
      </ListItemIcon>
      <ListItemText 
        primary={file.name}
        sx={{ 
          fontWeight: selectedFile?.path === file.path ? 'bold' : 'normal'
        }}
      />
      <IconButton
        size="small"
        onClick={(e) => handleContextMenu(e, file)}
        sx={{ mr: 1 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </ListItem>
  );
  
  // 渲染目录子项
  const renderChildren = (parentPath: string, items: FileItem[]) => {
    const children = items.filter(file => 
      file.path.startsWith(parentPath) && 
      file.path !== parentPath &&
      file.path.split('/').length === parentPath.split('/').length + 1
    );
    
    if (children.length === 0) return null;
    
    return (
      <Collapse in={expandedFolders[parentPath]} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2 }}>
          {children.map((child) => (
            <React.Fragment key={child.path}>
              {renderFileItem(child)}
              {child.isDirectory && expandedFolders[child.path] && renderChildren(child.path, items)}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
    );
  };

  // 渲染顶级目录
  const renderRootItems = () => {
    const rootItems = files.filter(file => 
      file.path.split('/').length <= 2 && file.path !== '/'
    );
    
    return rootItems.map((item) => (
      <React.Fragment key={item.path}>
        {renderFileItem(item)}
        {item.isDirectory && renderChildren(item.path, files)}
      </React.Fragment>
    ));
  };

  // 添加快捷键处理函数
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Ctrl/Cmd + N: 新建文件
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      setNewFileDialog(true);
    }
    // Delete: 删除选中的文件
    if (event.key === 'Delete' && selectedFile) {
      event.preventDefault();
      handleDelete();
    }
    // F2: 重命名选中的文件
    if (event.key === 'F2' && selectedFile) {
      event.preventDefault();
      setNewName(selectedFile.name);
      setRenameDialog(true);
    }
  };

  // 处理新建文件对话框的回车确认
  const handleNewFileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCreateFile();
    }
  };

  // 处理重命名对话框的回车确认
  const handleRenameKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleRename();
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        position: 'relative'
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0} // 使 Box 可以接收键盘事件
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        background: 'linear-gradient(to right, #f5f7fa, #f7f9fc)',
        borderRadius: '4px',
        m: 1
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>文件浏览器</Typography>
        <Box>
          <Tooltip title="刷新">
            <IconButton 
              size="small" 
              onClick={() => loadFiles()} 
              disabled={isLoading}
              sx={{
                transition: 'all 0.2s',
                '&:hover': { transform: 'rotate(180deg)' }
              }}
            >
              {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="添加新项">
            <IconButton 
              size="small" 
              onClick={() => setNewFileDialog(true)}
              sx={{ ml: 1 }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider />
      
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        px: 1
      }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          files.length > 0 ? (
            <List dense component="nav">
              {renderRootItems()}
            </List>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                暂无文件
                <Button 
                  variant="text" 
                  color="primary" 
                  size="small" 
                  onClick={() => setNewFileDialog(true)}
                  sx={{ ml: 1 }}
                >
                  创建新文件
                </Button>
              </Typography>
            </Box>
          )
        )}
      </Box>
      
      {/* 新建文件夹对话框 */}
      <Dialog open={newFolderDialog} onClose={() => setNewFolderDialog(false)}>
        <DialogTitle>新建文件夹</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="文件夹名称"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderDialog(false)}>取消</Button>
          <Button onClick={handleCreateFolder} variant="contained" color="primary">创建</Button>
        </DialogActions>
      </Dialog>

      {/* 新建文件对话框 */}
      <Dialog 
        open={newFileDialog} 
        onClose={() => setNewFileDialog(false)}
        onKeyDown={handleNewFileKeyDown}
      >
        <DialogTitle>新建Markdown文件</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="文件名称"
            type="text"
            fullWidth
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            helperText="如果不输入.md后缀，将自动添加"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFileDialog(false)}>取消</Button>
          <Button onClick={handleCreateFile} variant="contained" color="primary">创建</Button>
        </DialogActions>
      </Dialog>

      {/* 右键菜单 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRenameClick}>重命名</MenuItem>
        <MenuItem onClick={handleDelete}>删除</MenuItem>
      </Menu>

      {/* 重命名对话框 */}
      <Dialog 
        open={renameDialog} 
        onClose={() => setRenameDialog(false)}
        onKeyDown={handleRenameKeyDown}
      >
        <DialogTitle>重命名</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="新名称"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(false)}>取消</Button>
          <Button onClick={handleRename} variant="contained" color="primary">确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileBrowser; 