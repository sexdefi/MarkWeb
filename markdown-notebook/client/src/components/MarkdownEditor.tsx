import React, { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, IconButton, Divider, Tooltip, Menu, MenuItem, Slider, Fade } from '@mui/material';
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
        transition: 'all 0.3s ease' // 添加过渡效果
      }}
    >
      <Toolbar 
        variant="dense" 
        sx={{ 
          justifyContent: 'space-between', 
          bgcolor: '#f5f5f5',
          minHeight: '48px',
          flex: '0 0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' // 增加阴影，提升层次感
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '400px', width: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mr: 2 }}>
            {selectedFile.name} {isModified ? '(已修改)' : ''}
          </Typography>
          
          <Tooltip title="一键全选文本">
            <IconButton
              size="small"
              onClick={selectAllText}
              sx={{ ml: 1 }}
            >
              <SelectAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="复制纯文本">
            <IconButton
              size="small"
              onClick={copyRenderedText}
              sx={{ ml: 1 }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="导出PDF">
            <IconButton
              size="small"
              onClick={exportToPdf}
              disabled={isExporting}
              sx={{ ml: 1 }}
            >
              <PictureAsPdfIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="调整字体大小">
            <IconButton
              size="small"
              onClick={handleFontSizeMenuOpen}
              sx={{ ml: 1 }}
            >
              <FormatSizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={fontSizeMenuAnchor}
            open={Boolean(fontSizeMenuAnchor)}
            onClose={handleFontSizeMenuClose}
            TransitionComponent={Fade}
          >
            <MenuItem sx={{ width: 200, padding: '10px 16px' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                字体大小: {fontSize}px
              </Typography>
              <Slider
                value={fontSize}
                onChange={handleFontSizeChange}
                min={10}
                max={24}
                step={1}
                valueLabelDisplay="auto"
                size="small"
              />
            </MenuItem>
          </Menu>

          <IconButton 
            size="small" 
            onClick={togglePreview}
            sx={{ ml: 1 }}
            title={showPreview ? "收起预览" : "显示预览"}
          >
            {showPreview ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
          </IconButton>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!isModified || loading}
          sx={{
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }
          }}
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
        <Box 
          ref={editorRef}
          sx={{ 
            flex: showPreview ? '1 1 50%' : '1 1 100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
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
        sx={{
          '& .MuiAlert-filledSuccess': {
            background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)'
          },
          '& .MuiAlert-filledError': {
            background: 'linear-gradient(45deg, #f44336 30%, #e57373 90%)'
          }
        }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MarkdownEditor; 