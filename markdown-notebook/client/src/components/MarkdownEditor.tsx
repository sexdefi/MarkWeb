import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, ToggleButtonGroup, ToggleButton, Divider } from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { FileItem } from '../types';
import { getFileContent, saveFile } from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SplitscreenIcon from '@mui/icons-material/Splitscreen';

interface MarkdownEditorProps {
  selectedFile: FileItem | null;
}

type EditorMode = 'edit' | 'preview' | 'split';

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ selectedFile }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [editorMode, setEditorMode] = useState<EditorMode>('split');

  useEffect(() => {
    if (selectedFile && !selectedFile.isDirectory) {
      loadFileContent();
    } else {
      setContent('');
      setIsModified(false);
    }
  }, [selectedFile]);

  const loadFileContent = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    try {
      const data = await getFileContent(selectedFile.path);
      setContent(data.content);
      setIsModified(false);
    } catch (error) {
      console.error('Error loading file content:', error);
      showSnackbar('加载文件内容失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsModified(true);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    try {
      await saveFile(selectedFile.path, content);
      setIsModified(false);
      showSnackbar('文件保存成功!', 'success');
    } catch (error) {
      console.error('Error saving file:', error);
      showSnackbar('保存文件失败', 'error');
    }
  };

  const handleEditorModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: EditorMode | null,
  ) => {
    if (newMode !== null) {
      setEditorMode(newMode);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (!selectedFile) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 3,
          bgcolor: '#f9f9f9'
        }}
      >
        <Typography variant="subtitle1" color="text.secondary">
          请从左侧选择一个文件进行编辑
        </Typography>
      </Paper>
    );
  }

  if (selectedFile.isDirectory) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 3,
          bgcolor: '#f9f9f9'
        }}
      >
        <Typography variant="subtitle1" color="text.secondary">
          {`当前选择的是文件夹: ${selectedFile.name}`}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mr: 2 }}>
            {selectedFile.name} {isModified ? '(已修改)' : ''}
          </Typography>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <ToggleButtonGroup
            value={editorMode}
            exclusive
            onChange={handleEditorModeChange}
            aria-label="编辑器模式"
            size="small"
            sx={{ ml: 1 }}
          >
            <ToggleButton value="edit" aria-label="编辑模式">
              <EditIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="split" aria-label="分屏模式">
              <SplitscreenIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="preview" aria-label="预览模式">
              <VisibilityIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!isModified || loading}
        >
          保存
        </Button>
      </Toolbar>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          preview={editorMode}
          data-color-mode="light"
        />
      </Box>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MarkdownEditor; 