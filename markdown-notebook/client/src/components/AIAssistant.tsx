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
  Snackbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
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

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, id = 'ai-assistant' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    setMessages(prev => [...prev, userMessage]);
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

  return (
    <Paper 
      id={id}
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.paper'
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
              {message.role === 'assistant' && (
                <SmartToyIcon color="primary" />
              )}
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