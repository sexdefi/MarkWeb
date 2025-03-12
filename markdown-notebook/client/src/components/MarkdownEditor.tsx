import React, { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, IconButton, Divider, Tooltip } from '@mui/material';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import { FileItem } from '../types';
import { getFileContent, saveFile } from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
  const previewRef = useRef<HTMLDivElement>(null);

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

  const processTextWithIndentation = (element: Element): string => {
    let result = '';
    const children = element.childNodes;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        result += text.trim() ? text : ' ';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        switch (tagName) {
          case 'h1':
            result += `${el.textContent?.trim()}\n${'='.repeat(30)}\n\n`;
            break;
          case 'h2':
            result += `${el.textContent?.trim()}\n${'-'.repeat(20)}\n\n`;
            break;
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            result += `${el.textContent?.trim()}\n\n`;
            break;
          case 'p':
            const paragraphText = processTextWithIndentation(el).trim();
            result += paragraphText ? `${paragraphText}\n\n` : '';
            break;
          case 'ul':
          case 'ol':
            const listText = processListItems(el).trim();
            result += listText ? `${listText}\n` : '';
            break;
          case 'blockquote':
            const quoteText = processTextWithIndentation(el).trim();
            result += quoteText ? quoteText.split('\n').map(line => `> ${line.trim()}`).join('\n') + '\n\n' : '';
            break;
          case 'pre':
            const preText = processTextWithIndentation(el).trim();
            result += preText ? `${preText}\n\n` : '';
            break;
          case 'code':
            const isInPre = el.closest('pre');
            const codeText = el.textContent?.trim() || '';
            result += isInPre ? codeText : codeText ? `\`${codeText}\`` : '';
            break;
          case 'br':
            result += '\n';
            break;
          default:
            result += processTextWithIndentation(el);
        }
      }
    }

    return result;
  };

  const processListItems = (listElement: Element, level = 0): string => {
    let result = '';
    const items = listElement.children;
    const isOrdered = listElement.tagName.toLowerCase() === 'ol';
    let counter = 1;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.tagName.toLowerCase() === 'li') {
        const indent = '  '.repeat(level);
        const bullet = isOrdered ? `${counter}.` : '•';
        const itemText = processTextWithIndentation(item).trim();
        
        if (itemText) {
          result += `${indent}${bullet} ${itemText}\n`;
          counter++;
        }

        // 处理嵌套列表
        const nestedList = item.querySelector('ul, ol');
        if (nestedList) {
          result += processListItems(nestedList, level + 1);
        }
      }
    }

    return result;
  };

  const copyRenderedText = () => {
    if (!previewRef.current) return;
    
    try {
      // 获取格式化的文本
      const formattedText = processTextWithIndentation(previewRef.current);
      
      // 复制到剪贴板
      navigator.clipboard.writeText(formattedText).then(() => {
        showSnackbar('文本已复制到剪贴板', 'success');
      }).catch((error) => {
        console.error('复制失败:', error);
        showSnackbar('复制失败', 'error');
      });
    } catch (error) {
      console.error('处理文本时出错:', error);
      showSnackbar('处理文本时出错', 'error');
    }
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

          {showPreview && (
            <Tooltip title="复制渲染后的文本">
              <IconButton
                size="small"
                onClick={copyRenderedText}
                sx={{ ml: 1 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
              <Box 
                ref={previewRef}
                sx={{ 
                  flex: '1 1 auto', 
                  overflow: 'auto',
                  '& .wmde-markdown': {
                    fontSize: '14px',
                    lineHeight: 1.6,
                    padding: '0 16px'
                  }
                }}
              >
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