import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  CircularProgress,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName?: string;
  senderAvatar?: string;
  conversationId: string;
  read: boolean;
}

interface ChatProps {
  recipientId: string;
  recipientName: string;
  projectId?: string;
  containerStyle?: React.CSSProperties;
}

export const Chat: React.FC<ChatProps> = ({ 
  recipientId, 
  recipientName, 
  projectId,
  containerStyle 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Wait for auth to be ready
  useEffect(() => {
    if (user) {
      setIsInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!recipientId) {
      console.error('No recipient ID provided');
      setError("Recipient information is missing");
      setLoading(false);
      return;
    }

    try {
      // Create a unique conversation ID
      const participantIds = [user!.uid, recipientId].sort();
      const convId = projectId 
        ? `${participantIds.join('_')}_${projectId}`
        : participantIds.join('_');
      
      console.log('Setting up chat with conversation ID:', convId);
      setConversationId(convId);

      // Create a simpler query first to check if we have any messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', convId)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];

        // Sort messages by timestamp client-side
        const sortedMessages = messagesData.sort((a, b) => {
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeA - timeB;
        });

        console.log('Loaded messages:', sortedMessages.length);
        setMessages(sortedMessages);
        setLoading(false);
        setError(null);
        scrollToBottom();
      }, (err) => {
        console.error('Error loading messages:', err);
        setError('Failed to load messages. Please try again.');
        setLoading(false);
      });

      return () => {
        console.log('Cleaning up chat subscription');
        unsubscribe();
      };
    } catch (err) {
      console.error('Error in chat setup:', err);
      setError('Failed to setup chat. Please try again.');
      setLoading(false);
    }
  }, [isInitialized, recipientId, projectId, user]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      // Add the message
      const messageData = {
        conversationId,
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderAvatar: user.photoURL,
        timestamp: serverTimestamp(),
        projectId: projectId || null,
        read: false
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      // Update or create conversation document
      const conversationRef = doc(db, 'conversations', conversationId);
      
      const conversationData = {
        id: conversationId,
        participants: [user.uid, recipientId],
        lastMessage: {
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
          senderId: user.uid,
          messageId: messageRef.id
        },
        isGroup: false,
        unreadCount: {
          [recipientId]: 1
        },
        projectId: projectId || null,
        updatedAt: serverTimestamp()
      };

      await setDoc(conversationRef, conversationData, { merge: true });

      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      return timestamp.toDate().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting message time:', error);
      return '';
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
        ...containerStyle
      }}
    >
      {error ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          p: 3,
          color: 'error.main'
        }}>
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: 300
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%',
                color: 'text.secondary'
              }}>
                <Typography>No messages yet. Start the conversation!</Typography>
              </Box>
            ) : (
              messages.map((message) => (
                <Stack
                  key={message.id}
                  direction="row"
                  spacing={1}
                  alignSelf={message.senderId === user?.uid ? 'flex-end' : 'flex-start'}
                  sx={{ maxWidth: '70%' }}
                >
                  {message.senderId !== user?.uid && (
                    <Avatar 
                      src={message.senderAvatar} 
                      sx={{ width: 32, height: 32 }}
                    >
                      {message.senderName?.[0] || recipientName[0]}
                    </Avatar>
                  )}
                  <Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: message.senderId === user?.uid 
                          ? 'primary.main' 
                          : 'background.paper',
                        color: message.senderId === user?.uid 
                          ? 'primary.contrastText' 
                          : 'text.primary'
                      }}
                    >
                      <Typography variant="body2">
                        {message.text}
                      </Typography>
                    </Paper>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        textAlign: message.senderId === user?.uid ? 'right' : 'left'
                      }}
                    >
                      {formatMessageTime(message.timestamp)}
                    </Typography>
                  </Box>
                </Stack>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSendMessage}
            sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                sx={{
                  '& .MuiInputBase-root': {
                    borderRadius: 3
                  }
                }}
              />
              <IconButton 
                type="submit" 
                color="primary"
                disabled={!newMessage.trim() || sending}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled'
                  }
                }}
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}; 