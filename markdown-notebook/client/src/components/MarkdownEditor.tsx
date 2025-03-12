import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, IconButton, Divider } from '@mui/material';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import { FileItem } from '../types';
import { getFileContent, saveFile } from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

interface MarkdownEditorProps {
  selectedFile: FileItem | null;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ selectedFile }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [showPreview, setShowPreview] = useState<boolean>(true);

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

  const togglePreview = () => {
    setShowPreview(!showPreview);
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
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Toolbar 
        variant="dense" 
        sx={{ 
          justifyContent: 'space-between', 
          bgcolor: '#f5f5f5',
          minHeight: '48px',
          flex: '0 0 auto'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mr: 2 }}>
            {selectedFile.name} {isModified ? '(已修改)' : ''}
          </Typography>
          
          <IconButton 
            size="small" 
            onClick={togglePreview}
            sx={{ ml: 1 }}
            title={showPreview ? "收起预览" : "显示预览"}
          >
            {showPreview ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
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
      
      <Box sx={{ 
        flex: '1 1 auto',
        display: 'flex', 
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* 编辑区 */}
        <Box sx={{ 
          flex: showPreview ? '1 1 50%' : '1 1 100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'flex 0.3s ease'
        }}>
          <MDEditor
            value={content}
            onChange={handleContentChange}
            preview="edit"
            style={{ flex: '1 1 auto', overflow: 'hidden' }}
            hideToolbar={false}
            enableScroll={true}
            toolbarHeight={50}
            height="100%"
            commands={[
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.hr,
              commands.title,
              commands.divider,
              commands.link,
              commands.quote,
              commands.code,
              commands.codeBlock,
              commands.image,
              commands.divider,
              commands.unorderedList,
              commands.orderedList,
              commands.checkedList,
              commands.divider,
              commands.help
            ]}
          />
        </Box>

        {/* 预览区 */}
        {showPreview && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ 
              flex: '1 1 50%',
              overflow: 'auto',
              p: 2,
              bgcolor: '#ffffff',
              transition: 'flex 0.3s ease',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ 
                flex: '1 1 auto', 
                overflow: 'auto',
                '& .wmde-markdown': {
                  fontSize: '14px',
                  lineHeight: 1.6,
                  padding: '0 16px'
                }
              }}>
                <MDEditor.Markdown source={content} />
              </Box>
            </Box>
          </>
        )}
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