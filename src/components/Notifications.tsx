import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

interface Notification {
  id: string;
  type: 'request_accepted' | 'request_rejected' | 'new_request' | 'project_invite' | 'new_message';
  projectId: string;
  projectTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content?: string;
  createdAt: Date;
  read: boolean;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      console.log('No user found for notifications');
      return;
    }

    console.log('Setting up notifications listener for user:', user.uid);

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      console.log('Notifications snapshot received:', snapshot.size, 'notifications');
      const newNotifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as Notification[];

      console.log('Processed notifications:', newNotifications);
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });

    return () => {
      console.log('Cleaning up notifications listener');
      unsubscribe();
    };
  }, [user]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'request_accepted':
        return `Your request to join "${notification.projectTitle}" has been accepted`;
      case 'request_rejected':
        return `Your request to join "${notification.projectTitle}" has been declined`;
      case 'new_request':
        return `${notification.userName} has requested to join "${notification.projectTitle}"`;
      case 'project_invite':
        return `You've been invited to join "${notification.projectTitle}"`;
      case 'new_message':
        return `${notification.userName}: ${notification.content}`;
      default:
        return '';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    handleClose();
    // Add navigation logic here if needed
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          position: 'relative',
          border: '1px solid',
          borderColor: 'primary.main',
          m: 1,
          color: theme.palette.mode === 'dark' ? 'inherit' : 'primary.main'
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 360,
            maxHeight: 400,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        {notifications.length === 0 ? (
          <MenuItem>
            <Typography color="textSecondary">No notifications</Typography>
          </MenuItem>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={`${notification.id}-${notification.createdAt.getTime()}`}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: !notification.read 
                      ? theme.palette.action.hover 
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={notification.userAvatar}>
                      {notification.userName?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getNotificationMessage(notification)}
                    secondary={notification.createdAt.toLocaleString()}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: !notification.read ? 'textPrimary' : 'textSecondary',
                      fontWeight: !notification.read ? 500 : 400,
                    }}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}; 