import { useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { Box, CssBaseline } from '@mui/material'
import theme from './theme'
import Layout from './components/Layout'
import FileBrowser from './components/FileBrowser'
import MarkdownEditor from './components/MarkdownEditor'
import { FileItem } from './types'

function App() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout 
        title="Markdown笔记本"
        sidebar={<FileBrowser onFileSelect={handleFileSelect} />}
      >
        <MarkdownEditor selectedFile={selectedFile} />
      </Layout>
    </ThemeProvider>
  )
}

export default App
