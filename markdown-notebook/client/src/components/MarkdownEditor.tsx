import React, { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, Toolbar, Snackbar, Alert, IconButton, Divider, 
  Tooltip, Menu, MenuItem, Slider, Fade, useTheme, ListItemIcon, ListItemText, Switch,
  FormControl, Select, SelectChangeEvent } from '@mui/material';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { FileItem } from '../types';
import { getFileContent, saveFile } from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArticleIcon from '@mui/icons-material/Article';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import SettingsIcon from '@mui/icons-material/Settings';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import CompressIcon from '@mui/icons-material/Compress';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface MarkdownEditorProps {
  selectedFile: FileItem | null;
}

// 可选字体列表
const FONT_OPTIONS = [
  { value: 'system-ui', label: '系统默认' },
  { value: '"Noto Sans SC", sans-serif', label: 'Noto Sans' },
  { value: '"Source Han Sans CN", sans-serif', label: '思源黑体' },
  { value: '"Roboto", sans-serif', label: 'Roboto' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
];

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
  
  // 新增设置菜单状态
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFont, setSelectedFont] = useState<string>(FONT_OPTIONS[0].value);
  const [isMiniMode, setIsMiniMode] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

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

  // 设置菜单打开与关闭
  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  // 字体更改处理
  const handleFontChange = (event: SelectChangeEvent<string>) => {
    setSelectedFont(event.target.value as string);
  };

  // Mini模式切换
  const toggleMiniMode = () => {
    setIsMiniMode(!isMiniMode);
  };

  // 深色模式切换
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // 一键复制Word格式文本
  const copyWordFormattedText = () => {
    if (!previewRef.current) return;
    
    try {
      // 创建一个临时容器来处理HTML内容
      const container = document.createElement('div');
      container.innerHTML = previewRef.current.innerHTML;
      
      // 处理标题
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        // 为标题添加Word样式
        (heading as HTMLElement).style.fontWeight = 'bold';
        
        // 根据标题级别设置字体大小
        const level = parseInt(heading.tagName.substring(1));
        const fontSize = 22 - (level - 1) * 2;
        (heading as HTMLElement).style.fontSize = `${fontSize}pt`;
        
        // 确保标题之后有空行
        if (heading.nextSibling && heading.nextSibling.nodeName !== 'BR') {
          const br = document.createElement('br');
          heading.parentNode?.insertBefore(br, heading.nextSibling);
        }
      });
      
      // 处理段落
      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach(paragraph => {
        // 添加段落样式
        (paragraph as HTMLElement).style.margin = '0';
        (paragraph as HTMLElement).style.lineHeight = '1.5';
        
        // 在段落后添加换行
        if (paragraph.nextSibling && paragraph.nextSibling.nodeName !== 'BR') {
          const br = document.createElement('br');
          paragraph.parentNode?.insertBefore(br, paragraph.nextSibling);
        }
      });
      
      // 处理列表
      const lists = container.querySelectorAll('ul, ol');
      lists.forEach(list => {
        // 确保列表具有适当的缩进
        (list as HTMLElement).style.marginLeft = '20px';
        
        // 处理列表项
        const items = list.querySelectorAll('li');
        items.forEach((item, index) => {
          // 为有序列表添加数字
          if (list.tagName.toLowerCase() === 'ol') {
            item.textContent = `${index + 1}. ${item.textContent}`;
          } else {
            // 为无序列表添加符号
            item.textContent = `• ${item.textContent}`;
          }
          
          // 添加行距
          (item as HTMLElement).style.lineHeight = '1.5';
          
          // 移除默认的列表样式
          (item as HTMLElement).style.listStyleType = 'none';
        });
      });
      
      // 处理表格
      const tables = container.querySelectorAll('table');
      tables.forEach(table => {
        // 添加表格边框
        (table as HTMLElement).style.borderCollapse = 'collapse';
        (table as HTMLElement).style.width = '100%';
        
        // 处理表格单元格
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
          (cell as HTMLElement).style.border = '1px solid #000';
          (cell as HTMLElement).style.padding = '4px 8px';
        });
        
        // 处理表头单元格
        const headerCells = table.querySelectorAll('th');
        headerCells.forEach(headerCell => {
          (headerCell as HTMLElement).style.backgroundColor = '#f0f0f0';
          (headerCell as HTMLElement).style.fontWeight = 'bold';
        });
      });
      
      // 处理代码块
      const codeBlocks = container.querySelectorAll('pre code');
      codeBlocks.forEach(codeBlock => {
        // 为代码块添加背景和边框
        if (codeBlock.parentElement) {
          (codeBlock.parentElement as HTMLElement).style.backgroundColor = '#f8f8f8';
          (codeBlock.parentElement as HTMLElement).style.border = '1px solid #ddd';
          (codeBlock.parentElement as HTMLElement).style.borderRadius = '3px';
          (codeBlock.parentElement as HTMLElement).style.padding = '10px';
          (codeBlock.parentElement as HTMLElement).style.fontFamily = 'monospace';
          (codeBlock.parentElement as HTMLElement).style.whiteSpace = 'pre-wrap';
        }
      });
      
      // 处理行内代码
      const inlineCodes = container.querySelectorAll('code:not(pre code)');
      inlineCodes.forEach(code => {
        (code as HTMLElement).style.backgroundColor = '#f8f8f8';
        (code as HTMLElement).style.padding = '2px 4px';
        (code as HTMLElement).style.borderRadius = '3px';
        (code as HTMLElement).style.fontFamily = 'monospace';
      });
      
      // 处理引用块
      const blockquotes = container.querySelectorAll('blockquote');
      blockquotes.forEach(blockquote => {
        (blockquote as HTMLElement).style.borderLeft = '4px solid #ddd';
        (blockquote as HTMLElement).style.paddingLeft = '10px';
        (blockquote as HTMLElement).style.color = '#555';
        (blockquote as HTMLElement).style.margin = '10px 0';
      });
      
      // 处理图片
      const images = container.querySelectorAll('img');
      images.forEach(image => {
        // 确保图片大小适中
        (image as HTMLElement).style.maxWidth = '100%';
        (image as HTMLElement).style.height = 'auto';
      });
      
      // 获取处理后的HTML内容
      const formattedHTML = container.innerHTML;
      
      // 将HTML复制到剪贴板
      const blob = new Blob([formattedHTML], { type: 'text/html' });
      const data = new ClipboardItem({ 'text/html': blob });
      
      navigator.clipboard.write([data]).then(() => {
        showSnackbar('已复制Word格式文本到剪贴板', 'success');
      }).catch((error) => {
        console.error('复制Word格式文本失败:', error);
        showSnackbar('复制Word格式文本失败', 'error');
      });
    } catch (error) {
      console.error('处理Word格式文本时出错:', error);
      showSnackbar('处理Word格式文本时出错', 'error');
    }
  };

  // 渲染设置菜单
  const renderSettingsMenu = () => (
    <Menu
      anchorEl={settingsMenuAnchor}
      open={Boolean(settingsMenuAnchor)}
      onClose={handleSettingsMenuClose}
      TransitionComponent={Fade}
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '8px',
          boxShadow: theme.shadows[4],
          width: '250px'
        }
      }}
    >
      <MenuItem sx={{ height: '50px' }}>
        <ListItemIcon>
          <FontDownloadIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="字体选择" />
      </MenuItem>
      <MenuItem sx={{ px: 2, pt: 0, pb: 2 }}>
        <FormControl fullWidth size="small">
          <Select
            value={selectedFont}
            onChange={handleFontChange}
            variant="outlined"
          >
            {FONT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </MenuItem>
      
      <Divider />
      
      <MenuItem onClick={toggleMiniMode}>
        <ListItemIcon>
          <CompressIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Mini模式" />
        <Switch
          edge="end"
          checked={isMiniMode}
          onChange={toggleMiniMode}
          size="small"
        />
      </MenuItem>
      
      <MenuItem onClick={toggleDarkMode}>
        <ListItemIcon>
          {darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
        </ListItemIcon>
        <ListItemText primary="深色模式" />
        <Switch
          edge="end"
          checked={darkMode}
          onChange={toggleDarkMode}
          size="small"
        />
      </MenuItem>
    </Menu>
  );

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
      {/* 主工具栏 */}
      {!isMiniMode && (
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
              flexShrink: 0
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
              
              <Tooltip title="复制Word格式文本">
                <IconButton size="small" onClick={copyWordFormattedText}>
                  <ArticleIcon fontSize="small" />
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

              <Tooltip title="设置">
                <IconButton size="small" onClick={handleSettingsMenuOpen}>
                  <SettingsIcon fontSize="small" />
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
      )}
      
      {/* Mini 模式工具栏 */}
      {isMiniMode && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          backgroundColor: 'rgba(0,0,0,0.03)',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Tooltip title="设置">
            <IconButton size="small" onClick={handleSettingsMenuOpen}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={showPreview ? "收起预览" : "显示预览"}>
            <IconButton size="small" onClick={togglePreview}>
              {showPreview ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isModified || loading}
            sx={{ ml: 1, minWidth: 'auto' }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>保存</Box>
          </Button>
        </Box>
      )}
      
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

        {/* 设置菜单 */}
        {renderSettingsMenu()}

        {/* 编辑器区域 */}
        <Box 
          ref={editorRef}
          sx={{ 
            flex: showPreview ? '1 1 50%' : '1 1 100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            bgcolor: theme.palette.background.paper,
            fontFamily: selectedFont
          }}
        >
          <MDEditor
            value={content}
            onChange={handleContentChange}
            preview="edit"
            style={{ flex: '1 1 auto', overflow: 'hidden' }}
            hideToolbar={isMiniMode}
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
                borderColor: theme.palette.divider,
                fontFamily: selectedFont
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
                    fontFamily: selectedFont,
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
                      fontSize: '0.9em',
                      fontFamily: FONT_OPTIONS[4].value // 代码使用等宽字体
                    },
                    '& pre': {
                      backgroundColor: theme.palette.action.hover,
                      padding: '16px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      '& code': {
                        fontFamily: FONT_OPTIONS[4].value // 代码块使用等宽字体
                      }
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