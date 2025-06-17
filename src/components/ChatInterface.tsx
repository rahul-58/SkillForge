import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Badge,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  doc, 
  getDoc,
  DocumentData,
  DocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from './Chat';

interface UserData {
  name: string;
  avatar?: string;
  lastSeen?: Timestamp;
}

interface ConversationData {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  };
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  unreadCount: number;
}

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  lastSeen?: Timestamp;
}

export const ChatInterface: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, UserInfo>>({});
  const [filteredConversations, setFilteredConversations] = useState<ConversationData[]>([]);

  useEffect(() => {
    if (!user) return;

    try {
      // Create a simpler query that will work without complex indexing
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );

      const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
        const conversationsData: ConversationData[] = [];

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const conversation: ConversationData = {
            id: docSnapshot.id,
            participants: data.participants || [],
            lastMessage: data.lastMessage ? {
              text: data.lastMessage.text || '',
              timestamp: data.lastMessage.timestamp,
              senderId: data.lastMessage.senderId || ''
            } : undefined,
            isGroup: data.isGroup || false,
            groupName: data.groupName,
            groupAvatar: data.groupAvatar,
            unreadCount: data.unreadCount || 0
          };

          // Fetch user info for participants if not in cache
          for (const participantId of conversation.participants) {
            if (participantId !== user.uid && !userInfoCache[participantId]) {
              try {
                const userDocRef = doc(db, 'users', participantId);
                const userDocSnapshot = await getDoc(userDocRef);
                
                if (userDocSnapshot.exists()) {
                  const userData = userDocSnapshot.data() as UserData;
                  setUserInfoCache(prev => ({
                    ...prev,
                    [participantId]: {
                      id: participantId,
                      name: userData.name || 'Unknown User',
                      avatar: userData.avatar,
                      lastSeen: userData.lastSeen
                    }
                  }));
                }
              } catch (error) {
                console.error('Error fetching user data:', error);
              }
            }
          }

          conversationsData.push(conversation);
        }

        // Sort conversations by last message timestamp client-side
        const sortedConversations = conversationsData.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
          const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        setConversations(sortedConversations);
        setFilteredConversations(sortedConversations);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up conversations listener:', error);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const filtered = conversations.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const getConversationName = (conversation: ConversationData): string => {
    if (conversation.isGroup) {
      return conversation.groupName || 'Group Chat';
    }
    
    const otherParticipantId = conversation.participants.find(id => id !== user?.uid);
    return otherParticipantId ? userInfoCache[otherParticipantId]?.name || 'Loading...' : 'Unknown User';
  };

  const getConversationAvatar = (conversation: ConversationData): string | undefined => {
    if (conversation.isGroup) {
      return conversation.groupAvatar;
    }
    
    const otherParticipantId = conversation.participants.find(id => id !== user?.uid);
    return otherParticipantId ? userInfoCache[otherParticipantId]?.avatar : undefined;
  };

  const formatTimestamp = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          bgcolor: 'background.paper'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        bgcolor: theme.palette.background.paper
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {selectedConversation ? (
            <>
              <IconButton onClick={() => setSelectedConversation(null)}>
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {getConversationName(selectedConversation)}
              </Typography>
              <Box width={40} /> {/* Spacer for alignment */}
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Messages
              </Typography>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </>
          )}
        </Box>

        {!selectedConversation && (
          <>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search conversations..."
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
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  }
                }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ 
                flex: 1, 
                overflowY: 'auto',
                px: 2,
                '& .MuiListItem-root': {
                  borderRadius: 2,
                  mb: 1,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  }
                }
              }}>
                {filteredConversations.length > 0 ? filteredConversations.map((conversation: ConversationData) => (
                  <Paper
                    key={conversation.id}
                    elevation={0}
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      bgcolor: selectedConversation?.id === conversation.id 
                        ? alpha(theme.palette.primary.main, 0.08)
                        : 'transparent'
                    }}
                  >
                    <ListItem
                      button
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          invisible={!conversation.unreadCount}
                          color="primary"
                        >
                          <Avatar src={getConversationAvatar(conversation)}>
                            {getConversationName(conversation)[0]}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {getConversationName(conversation)}
                            </Typography>
                            {conversation.lastMessage?.timestamp && (
                              <Typography variant="caption" color="text.secondary">
                                {formatTimestamp(conversation.lastMessage.timestamp)}
                              </Typography>
                            )}
                          </Stack>
                        }
                        secondary={
                          conversation.lastMessage ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: conversation.unreadCount ? 600 : 400
                              }}
                            >
                              {conversation.lastMessage.text}
                            </Typography>
                          ) : 'No messages yet'
                        }
                      />
                    </ListItem>
                  </Paper>
                )) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No conversations found
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </>
        )}

        {selectedConversation && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Chat
              recipientId={selectedConversation.participants.find(id => id !== user?.uid) || ''}
              recipientName={getConversationName(selectedConversation)}
              containerStyle={{ flex: 1 }}
            />
          </Box>
        )}
      </Box>
    </Drawer>
  );
}; 