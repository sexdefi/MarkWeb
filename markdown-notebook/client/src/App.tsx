import React, { useState } from 'react'
import { Box, CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'
import FileBrowser from './components/FileBrowser'
import MarkdownEditor from './components/MarkdownEditor'
import AIAssistant from './components/AIAssistant'
import { FileItem } from './types'

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [content, setContent] = useState<string>('')
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  const theme = createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <FileBrowser 
          onFileSelect={setSelectedFile} 
          selectedFile={selectedFile}
        />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MarkdownEditor 
            selectedFile={selectedFile}
            onAnalyzeFile={(content) => {
              setContent(content)
              setShowAIAssistant(true)
              // 将文件内容传递给AI助手
              const aiAssistantElement = document.getElementById('ai-assistant')
              if (aiAssistantElement) {
                const event = new CustomEvent('analyzeFile', { detail: content })
                aiAssistantElement.dispatchEvent(event)
              }
            }}
          />
        </Box>
        {showAIAssistant && (
          <Box sx={{ width: '400px', borderLeft: 1, borderColor: 'divider' }}>
            <AIAssistant 
              onClose={() => setShowAIAssistant(false)}
              id="ai-assistant"
              getCurrentContent={() => content}
              getContentRange={async (start, end) => {
                if (!selectedFile) return '';
                try {
                  const response = await fetch(`/api/files/content/${selectedFile.path}?start=${start}&end=${end}`);
                  if (!response.ok) throw new Error('获取内容失败');
                  const data = await response.json();
                  return data.content;
                } catch (error) {
                  console.error('获取内容范围失败:', error);
                  return '';
                }
              }}
            />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  )
}

export default App
