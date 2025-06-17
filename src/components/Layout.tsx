import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Menu, 
  MenuItem,
  useTheme,
  alpha,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Badge
} from '@mui/material';
import { 
  DarkMode as DarkModeIcon, 
  LightMode as LightModeIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useColorMode } from '../App';
import { Notifications } from './Notifications';
import { ChatInterface } from './ChatInterface';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  const [projectsMenu, setProjectsMenu] = React.useState<null | HTMLElement>(null);
  const [userMenu, setUserMenu] = React.useState<null | HTMLElement>(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const theme = useTheme();
  const { toggleColorMode, mode } = useColorMode();

  useEffect(() => {
    console.log('Auth state in Layout:', { 
      user: user?.email, 
      isLoggedIn: !!user,
      displayName: user?.displayName,
      uid: user?.uid 
    });
    console.log('Theme state:', { mode, isDark: mode === 'dark' });
  }, [user, mode]);

  const handleLogin = async () => {
    try {
      console.log('Starting login process...');
      await signIn();
      console.log('Login successful');
      navigate('/profile');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setUserMenu(null);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProjectsMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setProjectsMenu(event.currentTarget);
  };

  const handleProjectsMenuClose = () => {
    setProjectsMenu(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenu(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenu(null);
  };

  const handleProjectsNavigation = (path: string) => {
    navigate(path);
    handleProjectsMenuClose();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      bgcolor: theme.palette.background.default
    }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : 'white',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ padding: '0.5rem 0' }}>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                cursor: 'pointer',
                color: theme.palette.primary.main,
                fontWeight: 700,
                '&:hover': {
                  color: theme.palette.primary.dark,
                }
              }}
              onClick={() => navigate('/')}
            >
              SkillForge
            </Typography>
            
            {user ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Button 
                  sx={{
                    color: theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    }
                  }} 
                  onClick={handleProjectsMenuOpen}
                  aria-controls="projects-menu"
                  aria-haspopup="true"
                >
                  Projects
                </Button>

                <Button
                  color="inherit"
                  onClick={() => navigate('/users')}
                  sx={{ color: 'text.primary' }}
                >
                  Find Users
                </Button>

                <Tooltip title="Messages">
                  <IconButton
                    onClick={() => setChatOpen(true)}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Badge color="primary" variant="dot">
                      <ChatIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <IconButton 
                  onClick={toggleColorMode} 
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                    border: '1px solid',
                    borderColor: 'primary.main',
                    m: 1,
                    color: theme.palette.mode === 'dark' ? 'inherit' : 'primary.main'
                  }}
                >
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>

                <Notifications />

                <Tooltip title="Account settings">
                  <IconButton
                    onClick={handleUserMenuOpen}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      }
                    }}
                  >
                    <Avatar 
                      src={user.photoURL || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  id="projects-menu"
                  anchorEl={projectsMenu}
                  open={Boolean(projectsMenu)}
                  onClose={handleProjectsMenuClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
                      mt: 1.5,
                    },
                  }}
                >
                  <MenuItem 
                    onClick={() => handleProjectsNavigation('/')}
                    sx={{ minWidth: 200 }}
                  >
                    Browse Projects
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleProjectsNavigation('/submit-project')}
                    sx={{ minWidth: 200 }}
                  >
                    Submit Project
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleProjectsNavigation('/manage-projects')}
                    sx={{ minWidth: 200 }}
                  >
                    Manage My Projects
                  </MenuItem>
                </Menu>

                <Menu
                  id="user-menu"
                  anchorEl={userMenu}
                  open={Boolean(userMenu)}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
                      mt: 1.5,
                      minWidth: 200,
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {user.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => {
                    handleUserMenuClose();
                    navigate('/profile');
                  }}>
                    Profile
                  </MenuItem>
                  <MenuItem onClick={() => navigate('/manage-projects')}>
                    My Projects
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    Logout
                  </MenuItem>
                </Menu>
              </Stack>
            ) : (
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton 
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                    border: '1px solid',
                    borderColor: 'primary.main',
                    m: 1,
                    color: theme.palette.mode === 'dark' ? 'inherit' : 'primary.main'
                  }}
                  onClick={(e) => {
                    console.log('Dark mode toggle clicked');
                    toggleColorMode();
                  }}
                >
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
                <Button 
                  variant="contained"
                  onClick={handleLogin}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    px: 4,
                    py: 1,
                    borderRadius: '50px',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    }
                  }}
                >
                  Login with Google
                </Button>
              </Stack>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Container 
        maxWidth="lg" 
        sx={{ 
          mt: 4, 
          mb: 4,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Outlet />
      </Container>

      <ChatInterface open={chatOpen} onClose={() => setChatOpen(false)} />

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.5)
            : theme.palette.grey[100],
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} SkillForge. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}; 