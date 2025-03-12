import axios from 'axios';

const API_URL = '/api';

// 文件和目录API
export const getFiles = async (directory = '') => {
  const response = await axios.get(`${API_URL}/files`, {
    params: { directory }
  });
  return response.data;
};

export const getFileContent = async (filepath: string) => {
  const response = await axios.get(`${API_URL}/files/${filepath}`);
  return response.data;
};

export const saveFile = async (filepath: string, content: string) => {
  const response = await axios.post(`${API_URL}/files/${filepath}`, { content });
  return response.data;
};

export const createDirectory = async (path: string) => {
  const response = await axios.post(`${API_URL}/directories`, { path });
  return response.data;
};

export const deleteFile = async (filepath: string) => {
  const response = await axios.delete(`${API_URL}/files/${filepath}`);
  return response.data;
};

export const renameFile = async (oldPath: string, newPath: string) => {
  const response = await axios.put(`${API_URL}/files/${oldPath}`, { newPath });
  return response.data;
};

// 文件上传API
export const uploadFile = async (file: File, directory = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('directory', directory);
  
  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
}; 