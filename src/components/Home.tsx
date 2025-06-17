import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  const handleGetStarted = async () => {
    if (!user) {
      try {
        await signIn();
        navigate('/profile');
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h2" gutterBottom>
        Welcome to SkillForge
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        Connect with skilled professionals for your next project
      </Typography>
      {user ? (
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/profile')}
            sx={{ mr: 2 }}
          >
            View Profile
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => navigate('/projects')}
          >
            Browse Projects
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
        </Box>
      )}
    </Box>
  );
}; 