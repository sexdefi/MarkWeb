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
  Toolbar
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
import { AIAssistantProps } from '../types';

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
  systemPrompt: '你是一个专业的AI助手，可以帮助用户解答问题、分析文档。',
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
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
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
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {currentStreamingMessage}
                  <span className="cursor">▋</span>
                </Typography>
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

      {/* 工具栏 */}
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
            placeholder="输入消息..."
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