import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Box,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Button,
  Tooltip,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Fade,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface LayoutProps {
  title: string;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const drawerWidth = 300;

const Layout: React.FC<LayoutProps> = ({ title, sidebar, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(2);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null);
  
  // 模拟切换主题的功能
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // 在实际应用中，这里应该调用真正的主题切换函数
  };

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleInfoOpen = (event: React.MouseEvent<HTMLElement>) => {
    setInfoAnchor(event.currentTarget);
  };

  const handleInfoClose = () => {
    setInfoAnchor(null);
  };

  // 模拟清除通知
  const clearNotifications = () => {
    setNotificationCount(0);
  };

  const drawer = (
    <Box sx={{ 
      width: drawerWidth, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: isDarkMode ? '#1e1e1e' : '#f8f9fa',
      transition: 'background-color 0.3s ease',
      borderRight: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`
    }}>
      {sidebar}
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: isDarkMode ? '#121212' : '#fff',
      transition: 'background-color 0.3s ease',
      color: isDarkMode ? '#fff' : 'inherit'
    }}>
      <CssBaseline />
      
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: isDarkMode ? '#1e1e1e' : theme.palette.primary.main,
          borderBottom: `1px solid ${isDarkMode ? '#333' : 'rgba(0,0,0,0.05)'}`,
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(8px)',
          boxShadow: isDarkMode 
            ? '0 2px 8px rgba(0,0,0,0.5)' 
            : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600,
              background: isDarkMode 
                ? 'linear-gradient(45deg, #ce93d8 30%, #5c6bc0 90%)' 
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'all 0.3s ease',
              animation: 'fadeIn 0.5s ease-in-out'
            }}
          >
            {title}
          </Typography>
          
          <Tooltip title="产品信息">
            <IconButton 
              color="inherit" 
              aria-label="info" 
              sx={{ ml: 1 }}
              onClick={handleInfoOpen}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={infoAnchor}
            open={Boolean(infoAnchor)}
            onClose={handleInfoClose}
            TransitionComponent={Fade}
          >
            <Box sx={{ p: 2, width: 280 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                Markdown 笔记本
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                版本: 1.0.0
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                这是一个功能强大的Markdown编辑器，支持实时预览、文件管理、PDF导出等功能。
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth 
                sx={{ mt: 1 }}
                onClick={handleInfoClose}
              >
                了解更多
              </Button>
            </Box>
          </Menu>
          
          <Tooltip title="通知">
            <IconButton 
              color="inherit" 
              aria-label="notifications" 
              sx={{ ml: 1 }}
              onClick={clearNotifications}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={isDarkMode ? "切换到亮色模式" : "切换到深色模式"}>
            <IconButton 
              color="inherit" 
              aria-label="theme-toggle" 
              sx={{ ml: 1 }}
              onClick={toggleTheme}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="设置">
            <IconButton 
              color="inherit" 
              aria-label="settings" 
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="用户菜单">
            <IconButton 
              onClick={handleUserMenuOpen}
              sx={{ 
                ml: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.1)'
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                U
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            TransitionComponent={Fade}
          >
            <MenuItem onClick={handleUserMenuClose}>个人资料</MenuItem>
            <MenuItem onClick={handleUserMenuClose}>我的笔记</MenuItem>
            <Divider />
            <MenuItem onClick={handleUserMenuClose}>登出</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Mobile drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { 
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            },
          }}
          open
        >
          <Toolbar />
          {drawer}
        </Drawer>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: isDarkMode ? '#121212' : '#fafafa',
          transition: 'background-color 0.3s ease',
          position: 'relative'
        }}
      >
        <Toolbar />
        <Paper 
          elevation={isDarkMode ? 2 : 0}
          sx={{ 
            flexGrow: 1, 
            overflow: 'hidden',
            bgcolor: isDarkMode ? '#1e1e1e' : '#fff',
            transition: 'all 0.3s ease',
            border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.05)'
          }}
        >
          {children}
        </Paper>
      </Box>
      
      {/* 全局CSS动画 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </Box>
  );
};

export default Layout; 