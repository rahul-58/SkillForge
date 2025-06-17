import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Avatar,
  Chip,
  Stack,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction
} from '@mui/material';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from './Chat';
import SearchIcon from '@mui/icons-material/Search';
import MessageIcon from '@mui/icons-material/Message';
import EmailIcon from '@mui/icons-material/Email';

interface User {
  id: string;
  name: string;
  avatar?: string;
  skills: string[];
  email: string;
}

export const UserDirectory: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<{ userId: string; userName: string } | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, skillQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          skills: doc.data().skills || []
        } as User))
        .filter(u => u.id !== user?.uid); // Exclude current user

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by name/email
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Filter by skills
    if (skillQuery) {
      const skills = skillQuery.toLowerCase().split(',').map(s => s.trim());
      filtered = filtered.filter(user =>
        skills.every(skill =>
          user.skills.some(userSkill => 
            userSkill.toLowerCase().includes(skill)
          )
        )
      );
    }

    setFilteredUsers(filtered);
  };

  const handleOpenChat = (userId: string, userName: string) => {
    if (!user) {
      setError('Please sign in to send messages');
      return;
    }
    if (userId === user.uid) {
      setError('You cannot message yourself');
      return;
    }
    setSelectedChat({ userId, userName });
    setChatDialogOpen(true);
  };

  const handleSendEmail = (recipientEmail: string, recipientName: string) => {
    const subject = encodeURIComponent(`Hello from SkillForge`);
    const body = encodeURIComponent(`Hi ${recipientName},\n\nI found your profile on SkillForge and would like to connect with you.\n\nBest regards,\n${user?.displayName || 'A SkillForge User'}`);
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        py: 4
      }}>
        <Typography 
          variant="h3" 
          gutterBottom
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(45deg, #2196f3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            mb: 2
          }}
        >
          User Directory
        </Typography>
        <Typography 
          variant="h6" 
          color="textSecondary"
          sx={{ maxWidth: 600, mb: 4 }}
        >
          Find and connect with talented individuals based on their skills
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
        <TextField
          fullWidth
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-root': {
              borderRadius: 3,
              backgroundColor: 'background.paper',
            }
          }}
        />

        <TextField
          fullWidth
          placeholder="Filter by skills (comma-separated)"
          value={skillQuery}
          onChange={(e) => setSkillQuery(e.target.value)}
          helperText="Enter skills separated by commas (e.g., React, TypeScript, Node.js)"
          sx={{
            '& .MuiInputBase-root': {
              borderRadius: 3,
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 800, mx: 'auto' }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
        {filteredUsers.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user.id} sx={{ display: 'flex' }}>
            <Card 
              sx={{
                width: '100%',
                height: 280,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => `0 8px 16px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'}`,
                },
                position: 'relative',
                flexShrink: 0
              }}
            >
              <CardContent 
                sx={{ 
                  p: 3, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:last-child': { pb: 3 }
                }}
              >
                {/* Header Section */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    height: 72,
                    mb: 2,
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <Avatar
                    src={user.avatar}
                    sx={{ 
                      width: 56, 
                      height: 56,
                      flexShrink: 0,
                      mr: 2
                    }}
                  >
                    {user.name[0]}
                  </Avatar>
                  
                  <Box sx={{ 
                    flex: '1 1 auto',
                    minWidth: 0,
                    mr: 1
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}
                    >
                      {user.name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.skills.length} {user.skills.length === 1 ? 'skill' : 'skills'}
                    </Typography>
                  </Box>

                  <Stack 
                    direction="row" 
                    spacing={1} 
                    sx={{ 
                      flexShrink: 0,
                      position: 'absolute',
                      right: 0,
                      top: 0
                    }}
                  >
                    <Tooltip title="Send Email">
                      <IconButton
                        onClick={() => handleSendEmail(user.email, user.name)}
                        size="small"
                        sx={{
                          width: 32,
                          height: 32,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Send Message">
                      <IconButton
                        onClick={() => handleOpenChat(user.id, user.name)}
                        size="small"
                        sx={{
                          width: 32,
                          height: 32,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                      >
                        <MessageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Skills Section */}
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100% - 90px)',
                  position: 'relative'
                }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      mb: 1,
                      flexShrink: 0
                    }}
                  >
                    Skills:
                  </Typography>
                  
                  <Box sx={{ 
                    flex: 1,
                    overflowY: 'auto',
                    pr: 1,
                    '&::-webkit-scrollbar': {
                      width: 4,
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: (theme) => 
                        theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.1)' 
                          : 'rgba(0,0,0,0.1)',
                      borderRadius: 2,
                    }
                  }}>
                    <Stack 
                      direction="row" 
                      spacing={0.5} 
                      flexWrap="wrap" 
                      sx={{ gap: 0.5 }}
                    >
                      {user.skills.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.75rem',
                            borderRadius: 1.5,
                            backgroundColor: (theme) => 
                              theme.palette.mode === 'dark' 
                                ? 'rgba(33, 150, 243, 0.15)'
                                : 'rgba(33, 150, 243, 0.1)',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: (theme) => 
                                theme.palette.mode === 'dark' 
                                  ? 'rgba(33, 150, 243, 0.25)'
                                  : 'rgba(33, 150, 243, 0.2)',
                            }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={chatDialogOpen}
        onClose={() => {
          setChatDialogOpen(false);
          setSelectedChat(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '80vh' },
            maxHeight: { xs: '100%', sm: '80vh' }
          }
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {selectedChat && user && (
            <Chat
              recipientId={selectedChat.userId}
              recipientName={selectedChat.userName}
              containerStyle={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}; 