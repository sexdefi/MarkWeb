import React, { useState, useEffect } from 'react';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  Paper, 
  Divider, 
  Typography, 
  IconButton, 
  Toolbar, 
  InputBase,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Menu,
  MenuItem,
  Box
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  CreateNewFolder as CreateNewFolderIcon,
  UploadFile as UploadFileIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { FileItem } from '../types';
import { getFiles, createDirectory, uploadFile, deleteFile, renameFile } from '../services/api';

const SearchWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

interface FileBrowserProps {
  onFileSelect: (file: FileItem) => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [directoryStack, setDirectoryStack] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  
  // Dialog states
  const [newFolderDialog, setNewFolderDialog] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  
  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    file: FileItem | null;
  } | null>(null);
  
  // Rename dialog
  const [renameDialog, setRenameDialog] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');

  // Load files on mount and when directory changes
  useEffect(() => {
    loadFiles();
  }, [currentDirectory]);
  
  // Filter files when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFiles(filtered);
    } else {
      setFilteredFiles(files);
    }
  }, [searchTerm, files]);

  const loadFiles = async () => {
    try {
      const fileList = await getFiles(currentDirectory);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      setDirectoryStack([...directoryStack, currentDirectory]);
      setCurrentDirectory(file.path);
    } else {
      onFileSelect(file);
    }
  };

  const handleBackClick = () => {
    if (directoryStack.length > 0) {
      const previousDirectory = directoryStack.pop() || '';
      setDirectoryStack([...directoryStack]);
      setCurrentDirectory(previousDirectory);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const path = currentDirectory ? `${currentDirectory}/${newFolderName}` : newFolderName;
        await createDirectory(path);
        setNewFolderDialog(false);
        setNewFolderName('');
        loadFiles();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(async (file) => {
        try {
          await uploadFile(file, currentDirectory);
          loadFiles();
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      });
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
        // Get directory path
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

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense">
        <IconButton
          edge="start"
          color="inherit"
          aria-label="back"
          sx={{ mr: 1 }}
          onClick={handleBackClick}
          disabled={directoryStack.length === 0}
        >
          <ArrowBackIcon />
        </IconButton>

        <SearchWrapper>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="搜索文件..."
            inputProps={{ 'aria-label': 'search' }}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </SearchWrapper>

        <IconButton color="primary" onClick={() => setNewFolderDialog(true)}>
          <CreateNewFolderIcon />
        </IconButton>

        <IconButton color="primary" component="label">
          <input
            type="file"
            hidden
            onChange={handleUploadFile}
            multiple
          />
          <UploadFileIcon />
        </IconButton>
      </Toolbar>

      <Divider />

      <Typography variant="subtitle1" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
        {currentDirectory || '根目录'}
      </Typography>

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <ListItem 
              key={file.path} 
              disablePadding
              onContextMenu={(e) => handleContextMenu(e, file)}
            >
              <ListItemButton onClick={() => handleFileClick(file)}>
                <ListItemIcon>
                  {file.isDirectory ? <FolderIcon color="primary" /> : <FileIcon color="secondary" />}
                </ListItemIcon>
                <ListItemText 
                  primary={file.name} 
                  secondary={new Date(file.modifiedAt).toLocaleString()}
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? '没有找到匹配的文件' : '此文件夹为空'}
            </Typography>
          </Box>
        )}
      </List>

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
      <Dialog open={renameDialog} onClose={() => setRenameDialog(false)}>
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
    </Paper>
  );
};

export default FileBrowser; 