export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
  size?: number;
  modifiedAt?: string;
}

export interface FileBrowserProps {
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
}

export interface MarkdownEditorProps {
  selectedFile: FileItem | null;
  onAnalyzeFile: (content: string) => void;
}

export interface AIAssistantProps {
  onClose?: () => void;
  id?: string;
} 