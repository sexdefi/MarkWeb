export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

export interface FileBrowserProps {
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
}



export interface FileContent {
  content: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  path?: string;
}

export interface FileTreeNode extends FileItem {
  children?: FileTreeNode[];
  parent?: FileTreeNode;
  level: number;
} 