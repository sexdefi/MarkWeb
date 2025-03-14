import React, { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, IconButton, Divider, Tooltip, Menu, MenuItem, Slider, Fade, useTheme } from '@mui/material';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { FileItem } from '../types';
import { getFileContent, saveFile } from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import SelectAllIcon from '@mui/icons-material/SelectAll';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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
  const editorRef = useRef<HTMLDivElement>(null);
  
  // 新增状态
  const [fontSize, setFontSize] = useState<number>(14);
  const [fontSizeMenuAnchor, setFontSizeMenuAnchor] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 添加自动保存相关状态
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const theme = useTheme();

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
      setLastSavedTime(new Date());
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
            result += `\n${'='.repeat(30)}\n${el.textContent?.trim()}\n`;
            break;
          case 'h2':
            result += `\n${'-'.repeat(20)}\n${el.textContent?.trim()}\n`;
            break;
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            result += `\n${el.textContent?.trim()}\n`;
            break;
          case 'p':
            const paragraphText = processTextWithIndentation(el).trim();
            result += paragraphText ? `${paragraphText}\n\n` : '';
            break;
          case 'ul':
          case 'ol':
            const listText = processListItems(el).trim();
            result += listText ? `\n${listText}\n` : '';
            break;
          case 'blockquote':
            const quoteText = processTextWithIndentation(el).trim();
            result += quoteText ? `\n${quoteText.split('\n').map(line => `> ${line.trim()}`).join('\n')}\n` : '';
            break;
          case 'table':
            result += `\n${processTable(el)}\n`;
            break;
          case 'pre':
            const preText = processTextWithIndentation(el).trim();
            result += preText ? `\n${preText}\n` : '';
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
        const bullet = isOrdered ? `${counter}.` : '•';
        const bulletWidth = bullet.length + 1; // 包含一个空格
        const indent = ' '.repeat(level * 2); // 每级缩进2个空格
        
        // 获取当前列表项的直接文本内容（不包括嵌套列表）
        let itemText = '';
        for (const node of item.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            itemText += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.tagName.toLowerCase() !== 'ul' && el.tagName.toLowerCase() !== 'ol') {
              itemText += processTextWithIndentation(el);
            }
          }
        }
        itemText = itemText.trim();
        
        if (itemText) {
          // 处理多行文本的对齐
          const lines = itemText.split('\n');
          const firstLine = `${indent}${bullet} ${lines[0]}`;
          const restLines = lines.slice(1).map(line => 
            `${indent}${' '.repeat(bulletWidth)}${line}`
          );
          
          result += firstLine + (restLines.length ? '\n' + restLines.join('\n') : '') + '\n';
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

  const processTable = (tableElement: Element): string => {
    const rows = Array.from(tableElement.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    // 获取所有单元格的文本内容
    const tableData = rows.map(row => 
      Array.from(row.querySelectorAll('th, td')).map(cell => 
        cell.textContent?.trim() || ''
      )
    );

    // 计算每列的最大宽度
    const columnWidths = tableData[0].map((_, colIndex) => 
      Math.max(...tableData.map(row => 
        (row[colIndex] || '').length
      ))
    );

    // 生成表格内容
    let result = '';
    tableData.forEach((row, rowIndex) => {
      // 使用制表符分隔单元格
      result += row.map(cell => cell.padEnd(0)).join('\t') + '\n';
      
      // 在表头后添加分隔行
      if (rowIndex === 0) {
        result += columnWidths.map(width => '-'.repeat(width)).join('\t') + '\n';
      }
    });

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

  // 添加PDF导出功能
  const exportToPdf = async () => {
    if (!previewRef.current || !selectedFile) return;
    
    try {
      setIsExporting(true);
      showSnackbar('正在准备PDF导出...', 'success');
      
      const element = previewRef.current;
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "") || 'document';
      
      const opt = {
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      showSnackbar('PDF导出成功!', 'success');
    } catch (error) {
      console.error('PDF导出失败:', error);
      showSnackbar('PDF导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 添加字体大小菜单打开与关闭功能
  const handleFontSizeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFontSizeMenuAnchor(event.currentTarget);
  };

  const handleFontSizeMenuClose = () => {
    setFontSizeMenuAnchor(null);
  };

  // 处理字体大小更改
  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setFontSize(newValue as number);
  };

  // 一键全选文本功能
  const selectAllText = () => {
    if (!editorRef.current) return;
    
    try {
      // 查找编辑器内的textarea元素
      const textarea = editorRef.current.querySelector('textarea');
      if (textarea) {
        textarea.select();
        showSnackbar('已全选编辑器中的文本', 'success');
      } else {
        showSnackbar('无法找到编辑区域', 'error');
      }
    } catch (error) {
      console.error('全选文本失败:', error);
      showSnackbar('全选文本失败', 'error');
    }
  };

  // 自动保存功能
  useEffect(() => {
    if (isModified) {
      // 清除之前的定时器
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      // 设置新的定时器，2秒后自动保存
      const timer = setTimeout(() => {
        if (isModified && !loading) {
          handleSave();
        }
      }, 2000);
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [content, isModified]);

  // 优化快捷键处理
  const handleEditorKeyDown = (event: KeyboardEvent) => {
    // 已有的快捷键
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (isModified && !loading) {
        handleSave();
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      selectAllText();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      togglePreview();
    }
    
    // 新增快捷键
    // Ctrl/Cmd + Z: 撤销
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      // TODO: 实现撤销功能
    }
    // Ctrl/Cmd + Shift + Z: 重做
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      // TODO: 实现重做功能
    }
    // Ctrl/Cmd + F: 查找
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      // TODO: 实现查找功能
    }
  };

  useEffect(() => {
    // 添加全局快捷键监听
    document.addEventListener('keydown', handleEditorKeyDown);
    return () => {
      document.removeEventListener('keydown', handleEditorKeyDown);
    };
  }, [isModified, loading]); // 依赖项包含会影响处理函数的状态

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
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        bgcolor: theme.palette.background.default
      }}
    >
      <Toolbar 
        variant="dense" 
        sx={{ 
          justifyContent: 'space-between', 
          bgcolor: theme.palette.background.paper,
          minHeight: '48px',
          flex: '0 0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          p: { xs: 0.5, sm: 1 },
          overflow: 'hidden',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexGrow: 1,
          minWidth: 0,
          gap: { xs: 0.5, sm: 1 }
        }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'medium',
              flexShrink: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: theme.palette.text.primary
            }}
          >
            {selectedFile.name} {isModified ? '(已修改)' : ''}
            {lastSavedTime && !isModified && (
              <Typography 
                component="span" 
                variant="caption" 
                sx={{ 
                  ml: 1, 
                  color: theme.palette.text.secondary,
                  display: { xs: 'none', sm: 'inline' }
                }}
              >
                (上次保存: {lastSavedTime.toLocaleTimeString()})
              </Typography>
            )}
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 0.5, sm: 1 },
            flexShrink: 0 // 防止图标缩小
          }}>
            <Tooltip title="一键全选文本">
              <IconButton size="small" onClick={selectAllText}>
                <SelectAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="复制纯文本">
              <IconButton size="small" onClick={copyRenderedText}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="导出PDF">
              <IconButton
                size="small"
                onClick={exportToPdf}
                disabled={isExporting}
              >
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="调整字体大小">
              <IconButton size="small" onClick={handleFontSizeMenuOpen}>
                <FormatSizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={showPreview ? "收起预览" : "显示预览"}>
              <IconButton size="small" onClick={togglePreview}>
                {showPreview ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!isModified || loading}
          sx={{
            ml: { xs: 1, sm: 2 },
            minWidth: { xs: 'auto', sm: '80px' },
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }
          }}
        >
          {/* 在小屏幕上只显示图标 */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>保存</Box>
        </Button>
      </Toolbar>
      
      <Box sx={{ 
        flex: '1 1 auto',
        display: 'flex', 
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: theme.palette.background.default
      }}>
        {/* 添加字体大小菜单 */}
        <Menu
          anchorEl={fontSizeMenuAnchor}
          open={Boolean(fontSizeMenuAnchor)}
          onClose={handleFontSizeMenuClose}
          TransitionComponent={Fade}
          sx={{
            '& .MuiPaper-root': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '8px'
            }
          }}
        >
          <MenuItem sx={{ width: 200, padding: '16px' }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                字体大小: {fontSize}px
              </Typography>
              <Slider
                value={fontSize}
                onChange={handleFontSizeChange}
                min={10}
                max={24}
                step={1}
                marks={[
                  { value: 12, label: '12' },
                  { value: 14, label: '14' },
                  { value: 16, label: '16' },
                  { value: 18, label: '18' },
                  { value: 20, label: '20' }
                ]}
                valueLabelDisplay="auto"
                size="small"
                sx={{
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Box>
          </MenuItem>
        </Menu>

        {/* 编辑器区域 */}
        <Box 
          ref={editorRef}
          sx={{ 
            flex: showPreview ? '1 1 50%' : '1 1 100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            bgcolor: theme.palette.background.paper
          }}
        >
          <MDEditor
            value={content}
            onChange={handleContentChange}
            preview="edit"
            style={{ flex: '1 1 auto', overflow: 'hidden' }}
            hideToolbar={false}
            enableScroll={true}
            toolbarHeight={50}
            height="100%"
            textareaProps={{
              style: {
                fontSize: `${fontSize}px`,
                lineHeight: '1.6',
                padding: '12px 16px',
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.paper,
                borderColor: theme.palette.divider
              }
            }}
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
              commands.help
            ]}
            extraCommands={[
              {
                name: 'save',
                keyCommand: 'save',
                buttonProps: { 'aria-label': '保存' },
                icon: <SaveIcon />,
                execute: handleSave,
              }
            ]}
          />
        </Box>

        {/* 预览区域 */}
        {showPreview && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ 
              flex: '1 1 50%',
              overflow: 'auto',
              p: 2,
              bgcolor: theme.palette.background.paper,
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box 
                ref={previewRef}
                sx={{ 
                  flex: '1 1 auto', 
                  overflow: 'auto',
                  '& .wmde-markdown': {
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.6,
                    padding: '0 16px',
                    color: theme.palette.text.primary,
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    },
                    '& table': {
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '1rem',
                      '& th, & td': {
                        border: `1px solid ${theme.palette.divider}`,
                        padding: '8px 12px'
                      },
                      '& th': {
                        backgroundColor: theme.palette.action.hover
                      }
                    },
                    '& blockquote': {
                      borderLeft: `4px solid ${theme.palette.primary.main}`,
                      backgroundColor: theme.palette.action.hover,
                      padding: '12px 16px',
                      margin: '16px 0'
                    },
                    '& code': {
                      backgroundColor: theme.palette.action.hover,
                      padding: '2px 4px',
                      borderRadius: '3px',
                      fontSize: '0.9em'
                    },
                    '& pre': {
                      backgroundColor: theme.palette.action.hover,
                      padding: '16px',
                      borderRadius: '4px',
                      overflow: 'auto'
                    }
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
        sx={{
          '& .MuiAlert-filledSuccess': {
            background: `linear-gradient(45deg, ${theme.palette.success.main} 30%, ${theme.palette.success.light} 90%)`
          },
          '& .MuiAlert-filledError': {
            background: `linear-gradient(45deg, ${theme.palette.error.main} 30%, ${theme.palette.error.light} 90%)`
          }
        }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: theme.shadows[3]
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MarkdownEditor; 