import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Toolbar,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCommentIcon from '@mui/icons-material/AddComment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BugReportIcon from '@mui/icons-material/BugReport';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CodeIcon from '@mui/icons-material/Code';
import { AIAssistantProps } from '../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIConfig {
  apiKey: string;
  serverUrl: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: AIConfig = {
  apiKey: '',
  serverUrl: 'https://api.openai.com/v1',
  systemPrompt: `你是一个专业的AI编程助手，专注于代码分析和优化。在分析代码时，请遵循以下原则：

1. 代码结构分析
   - 评估代码的整体架构和设计模式
   - 识别关键组件和它们之间的交互
   - 分析代码的可维护性和可扩展性

2. 性能优化建议
   - 识别潜在的性能瓶颈
   - 提供具体的优化方案
   - 建议合适的算法和数据结构

3. 代码质量评估
   - 检查代码规范和最佳实践
   - 识别潜在的bug和安全问题
   - 提供重构建议

4. 文档和注释建议
   - 评估代码文档的完整性
   - 建议需要补充的注释
   - 提供API文档建议

5. 测试建议
   - 评估测试覆盖率
   - 建议需要补充的测试用例
   - 提供测试策略建议

请使用 Markdown 格式输出，代码块请标注语言。对于每个建议，请提供具体的示例代码。`,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000
};

interface RangeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (start: number, end: number) => void;
}

const RangeDialog: React.FC<RangeDialogProps> = ({ open, onClose, onConfirm }) => {
  const [startLine, setStartLine] = useState<string>('');
  const [endLine, setEndLine] = useState<string>('');

  const handleConfirm = () => {
    const start = parseInt(startLine);
    const end = parseInt(endLine);
    if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
      onConfirm(start, end);
      onClose();
      setStartLine('');
      setEndLine('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>选择行数范围</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="起始行"
            type="number"
            value={startLine}
            onChange={(e) => setStartLine(e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField
            label="结束行"
            type="number"
            value={endLine}
            onChange={(e) => setEndLine(e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button 
          onClick={handleConfirm}
          disabled={!startLine || !endLine || parseInt(startLine) > parseInt(endLine)}
          variant="contained"
        >
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MAX_CONTEXT_MESSAGES = 10; // 限制上下文消息数量

// 定义代码组件的属性类型
interface CodeComponentProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
}

// 修改 ReactMarkdown 组件的代码渲染部分
const MarkdownCodeComponent = ({ inline, className, children }: CodeComponentProps) => {
  const match = /language-(\w+)/.exec(className || '');
  return !inline && match ? (
    <SyntaxHighlighter
      style={materialDark}
      language={match[1]}
      PreTag="div"
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={className}>
      {children}
    </code>
  );
};

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  onClose, 
  id = 'ai-assistant',
  getCurrentContent,
  getContentRange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('aiAssistantConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading AI config:', e);
      }
    }
  }, []);

  // 保存配置到localStorage
  const saveConfig = () => {
    localStorage.setItem('aiAssistantConfig', JSON.stringify(config));
    setConfigOpen(false);
  };

  // 添加文件分析事件监听
  useEffect(() => {
    const handleAnalyzeFile = (event: CustomEvent<string>) => {
      const fileContent = event.detail;
      if (fileContent && !loading) {
        const userMessage: Message = {
          role: 'user',
          content: `请分析以下文件内容：\n\n${fileContent}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        handleAnalyze(fileContent);
      }
    };

    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('analyzeFile', handleAnalyzeFile as EventListener);
      return () => {
        element.removeEventListener('analyzeFile', handleAnalyzeFile as EventListener);
      };
    }
  }, [id, loading]);

  // 添加自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  // 处理SSE流式响应
  const handleStreamResponse = async (response: Response, role: 'assistant') => {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI服务请求失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    let accumulatedContent = '';
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              accumulatedContent += content;
              setCurrentStreamingMessage(accumulatedContent);
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 完成流式输出后，添加完整消息
    const finalMessage: Message = {
      role,
      content: accumulatedContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, finalMessage]);
    setCurrentStreamingMessage('');
  };

  const handleAnalyze = async (fileContent: string) => {
    if (!fileContent.trim() || loading) return;

    console.log('开始分析文件内容:', {
      serverUrl: config.serverUrl,
      apiKey: config.apiKey ? '已设置' : '未设置',
      model: config.model,
      contentLength: fileContent.length
    });

    setLoading(true);
    setError(null);

    try {
      console.log('准备发送请求到:', `${config.serverUrl}/chat/completions`);
      
      const requestBody = {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `请分析以下文件内容，并给出总结和建议：\n\n${fileContent}` }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true // 启用流式输出
      };
      
      console.log('请求体:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${config.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });

      await handleStreamResponse(response, 'assistant');
    } catch (err) {
      console.error('处理请求时出错:', err);
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    // 限制上下文消息数量
    let updatedMessages = [...messages, userMessage];
    if (updatedMessages.length > MAX_CONTEXT_MESSAGES) {
      updatedMessages = updatedMessages.slice(-MAX_CONTEXT_MESSAGES);
    }

    setMessages(updatedMessages);
    const currentInput = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          ...messages.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: currentInput }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true // 启用流式输出
      };

      const response = await fetch(`${config.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });

      await handleStreamResponse(response, 'assistant');
    } catch (err) {
      console.error('处理请求时出错:', err);
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 添加文章内容到上下文
  const handleAddArticle = async () => {
    if (!getCurrentContent) {
      setError('无法获取文章内容');
      return;
    }

    const content = getCurrentContent();
    if (!content) {
      setError('当前文章没有内容');
      return;
    }

    if (!input) {
      setInput(`当前文章的内容是：\n\n${content}`);
    } else {
      setInput(prev => `${prev}\n\n当前文章的内容是：\n\n${content}`);
    }
  };

  // 添加指定范围的内容
  const handleAddRange = async (start: number, end: number) => {
    if (!getContentRange) {
      setError('无法获取文章内容');
      return;
    }

    try {
      const content = await getContentRange(start, end);
      if (!content) {
        setError('指定范围内没有内容');
        return;
      }

      const range = `当前文章第 ${start} 到 ${end} 行的内容是：\n\n${content}`;
      if (!input) {
        setInput(range);
      } else {
        setInput(prev => `${prev}\n\n${range}`);
      }
    } catch (error) {
      setError('获取内容范围失败');
    }
  };

  // 添加代码分析功能
  const analyzeCode = async (content: string, type: 'complexity' | 'security' | 'performance' | 'quality') => {
    if (!content.trim() || loading) return;

    setLoading(true);
    setError(null);

    const analysisPrompts = {
      complexity: '请分析以下代码的复杂度，包括：\n1. 圈复杂度\n2. 认知复杂度\n3. 代码依赖关系\n4. 模块耦合度',
      security: '请分析以下代码的安全性，包括：\n1. 潜在的安全漏洞\n2. 输入验证\n3. 权限控制\n4. 数据安全',
      performance: '请分析以下代码的性能，包括：\n1. 时间复杂度\n2. 空间复杂度\n3. 内存使用\n4. 并发处理',
      quality: '请分析以下代码的质量，包括：\n1. 代码规范\n2. 设计模式\n3. 可维护性\n4. 可测试性'
    };

    try {
      const requestBody = {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `${analysisPrompts[type]}\n\n${content}` }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true
      };

      const response = await fetch(`${config.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });

      await handleStreamResponse(response, 'assistant');
    } catch (err) {
      console.error('代码分析失败:', err);
      setError(err instanceof Error ? err.message : '代码分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加代码优化建议功能
  const getOptimizationSuggestions = async (content: string) => {
    if (!content.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `请对以下代码提供具体的优化建议，包括：

1. 代码重构建议
   - 识别可以提取的公共方法
   - 建议更好的设计模式
   - 提供具体的重构示例

2. 性能优化建议
   - 算法优化
   - 数据结构优化
   - 缓存策略
   - 并发处理

3. 代码质量改进
   - 命名规范
   - 代码组织
   - 错误处理
   - 日志记录

4. 测试建议
   - 单元测试
   - 集成测试
   - 性能测试
   - 测试用例设计

请为每个建议提供具体的代码示例。\n\n${content}` }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true
      };

      const response = await fetch(`${config.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });

      await handleStreamResponse(response, 'assistant');
    } catch (err) {
      console.error('获取优化建议失败:', err);
      setError(err instanceof Error ? err.message : '获取优化建议失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt/Option + Enter 插入换行
      if (e.key === 'Enter' && (e.altKey || e.metaKey)) {
        setInput(prev => prev + '\n');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Paper 
      id={id}
      elevation={3} 
      sx={{ 
        height: isFullScreen ? '100vh' : '100%', 
        width: isFullScreen ? '100vw' : '100%',
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.paper',
        position: isFullScreen ? 'fixed' : 'relative',
        top: isFullScreen ? 0 : 'auto',
        left: isFullScreen ? 0 : 'auto',
        zIndex: isFullScreen ? 1300 : 'auto',
      }}
    >
      {/* 顶部工具栏 */}
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI助手
        </Typography>
        <IconButton onClick={() => setIsFullScreen(!isFullScreen)}>
          {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        <IconButton onClick={() => setConfigOpen(true)}>
          <SettingsIcon />
        </IconButton>
        {onClose && (
          <IconButton onClick={onClose} sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* 消息列表 */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 1,
              width: '100%'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                maxWidth: '80%',
                width: message.role === 'assistant' ? '100%' : 'auto'
              }}
            >
              {message.role === 'assistant' && (
                <SmartToyIcon color="primary" sx={{ mt: 1 }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                    '& pre': {
                      margin: 0,
                      padding: 1,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    },
                    '& code': {
                      fontFamily: 'monospace',
                    }
                  }}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        code: MarkdownCodeComponent
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
                {message.role === 'assistant' && (
                  <Toolbar 
                    variant="dense" 
                    sx={{ 
                      minHeight: '40px',
                      px: 1,
                      gap: 1
                    }}
                  >
                    <Tooltip title="复制到剪贴板">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(message.content)
                            .then(() => {
                              // 可以添加复制成功的提示
                            })
                            .catch(() => setError('复制失败'));
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="添加到输入框">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          setInput(prev => prev + (prev ? '\n\n' : '') + message.content);
                        }}
                      >
                        <AddCommentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Toolbar>
                )}
              </Box>
            </Box>
          </Box>
        ))}
        
        {/* 流式输出的当前消息 */}
        {currentStreamingMessage && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: '80%'
              }}
            >
              <SmartToyIcon color="primary" />
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  borderRadius: 2
                }}
              >
                <ReactMarkdown
                  components={{
                    code: MarkdownCodeComponent
                  }}
                >
                  {currentStreamingMessage}
                </ReactMarkdown>
                <span className="cursor">▋</span>
              </Paper>
            </Box>
          </Box>
        )}
        
        {loading && !currentStreamingMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {/* 用于自动滚动的引用元素 */}
        <div ref={messagesEndRef} />
      </Box>

      {/* 更新工具栏 */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          borderTop: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          px: 2,
          minHeight: '48px',
          gap: 1
        }}
      >
        <Tooltip title="复杂度分析">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) analyzeCode(content, 'complexity');
            }}
            disabled={loading}
          >
            <AssessmentIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="安全性分析">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) analyzeCode(content, 'security');
            }}
            disabled={loading}
          >
            <SecurityIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="性能分析">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) analyzeCode(content, 'performance');
            }}
            disabled={loading}
          >
            <SpeedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="代码质量分析">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) analyzeCode(content, 'quality');
            }}
            disabled={loading}
          >
            <BugReportIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="代码优化建议">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) getOptimizationSuggestions(content);
            }}
            disabled={loading}
          >
            <AutoFixHighIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="代码示例">
          <IconButton 
            onClick={() => {
              const content = getCurrentContent?.();
              if (content) {
                setInput(prev => `${prev}\n\n请为以下代码提供最佳实践示例：\n\n${content}`);
              }
            }}
            disabled={loading}
          >
            <CodeIcon />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="添加文章内容到上下文">
          <IconButton onClick={handleAddArticle} disabled={loading}>
            <ArticleIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="添加指定范围内容到上下文">
          <IconButton onClick={() => setRangeDialogOpen(true)} disabled={loading}>
            <FormatListNumberedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="粘贴剪贴板内容">
          <IconButton 
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setInput(prev => prev + text);
              } catch (err) {
                setError('无法访问剪贴板');
              }
            }}
            disabled={loading}
          >
            <ContentPasteIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {/* 输入区域 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息...(Alt/Option + Enter 插入换行)"
            disabled={loading}
          />
          <IconButton 
            color="primary" 
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 配置对话框 */}
      <Dialog 
        open={configOpen} 
        onClose={() => setConfigOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI助手配置</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="API密钥"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              fullWidth
            />
            <TextField
              label="服务器地址"
              value={config.serverUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
              fullWidth
            />
            <TextField
              label="系统提示词"
              multiline
              rows={4}
              value={config.systemPrompt}
              onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>模型</InputLabel>
              <Select
                value={config.model}
                label="模型"
                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              >
                <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                <MenuItem value="gpt-4">GPT-4</MenuItem>
                <MenuItem value="gpt-4-turbo-preview">GPT-4 Turbo</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="温度"
                type="number"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                fullWidth
              />
              <TextField
                label="最大Token数"
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 4000 }}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>取消</Button>
          <Button onClick={saveConfig} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 范围选择对话框 */}
      <RangeDialog
        open={rangeDialogOpen}
        onClose={() => setRangeDialogOpen(false)}
        onConfirm={handleAddRange}
      />

      {/* 错误提示 */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        .cursor {
          animation: blink 1s infinite;
          font-weight: bold;
          color: #1976d2;
        }
      `}</style>
    </Paper>
  );
};

export default AIAssistant; 