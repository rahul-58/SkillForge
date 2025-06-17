import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Typography,
  Paper,
  Stack,
  Autocomplete,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@mui/material/styles';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { extractKeywords } from '../services/gemini';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  skills: string[];
  bio: string;
  experience: string;
  resumeUrl?: string;
}

interface ExtractedSkill {
  skill: string;
  confidence: number;
}

const commonSkills = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
  'Machine Learning', 'Data Science', 'Cloud Computing', 'DevOps',
  'UI/UX Design', 'Project Management', 'Agile', 'AWS', 'Google Cloud'
];

export const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    skills: [],
    bio: '',
    experience: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile({ ...userDoc.data() as UserProfile, id: user.uid });
        } else {
          // Initialize with user's email if profile doesn't exist
          setProfile({
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            skills: [],
            bio: '',
            experience: ''
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      
      // Validate required fields
      if (!profile.name.trim()) {
        throw new Error('Name is required');
      }
      if (!profile.email.trim()) {
        throw new Error('Email is required');
      }

      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: new Date()
      });

      setSuccessMessage('Profile saved successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingResume(true);
      setError(null);

      // Upload resume to Firebase Storage
      const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Read the file content
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
      
      // Extract skills using Gemini API
      const extractedSkills = await extractKeywords(fileContent);
      
      // Filter extracted skills to match with common skills
      const matchedSkills = extractedSkills.filter(extractedSkill => 
        commonSkills.some(commonSkill => 
          commonSkill.toLowerCase().includes(extractedSkill.toLowerCase()) ||
          extractedSkill.toLowerCase().includes(commonSkill.toLowerCase())
        )
      );

      // Update profile with new skills and resume URL
      setProfile(prev => ({
        ...prev,
        skills: Array.from(new Set([...prev.skills, ...matchedSkills])),
        resumeUrl: downloadUrl
      }));

      setSuccessMessage('Resume uploaded and skills extracted successfully!');
    } catch (err) {
      console.error('Error uploading resume:', err);
      setError('Failed to upload resume. Please try again.');
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        backgroundColor: theme => theme.palette.mode === 'dark' 
          ? theme.palette.background.default 
          : theme.palette.grey[50],
        py: 4
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          width: '100%',
          maxWidth: 800,
          p: 4,
          backgroundColor: theme => theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : '#ffffff',
          borderRadius: 2,
          mb: 3
        }}
      >
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center" 
          sx={{ mb: 4 }}
        >
          <Typography 
            variant="h4" 
            sx={{
              fontWeight: 600,
              color: theme => theme.palette.primary.main,
            }}
          >
            Profile
          </Typography>
          <Tooltip title="Upload Resume to Extract Skills">
            <IconButton
              color="primary"
              component="label"
              disabled={uploadingResume}
              sx={{
                border: '1px dashed',
                borderColor: 'primary.main',
                p: 1,
                '&:hover': {
                  backgroundColor: alpha => theme.palette.primary.main + '0a'
                }
              }}
            >
              {uploadingResume ? (
                <CircularProgress size={24} />
              ) : (
                <UploadFileIcon />
              )}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                ref={fileInputRef}
              />
            </IconButton>
          </Tooltip>
        </Stack>
        
        <Stack spacing={3}>
          <TextField
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            fullWidth
            required
            error={!profile.name.trim()}
            helperText={!profile.name.trim() ? 'Name is required' : ''}
            variant="outlined"
            sx={{ backgroundColor: theme => theme.palette.background.paper }}
          />

          <TextField
            label="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            fullWidth
            required
            error={!profile.email.trim()}
            helperText={!profile.email.trim() ? 'Email is required' : ''}
            variant="outlined"
            sx={{ backgroundColor: theme => theme.palette.background.paper }}
          />

          <Autocomplete
            multiple
            options={commonSkills}
            value={profile.skills}
            onChange={(_, newValue) => setProfile({ ...profile, skills: newValue })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Skills"
                placeholder="Add skills"
                variant="outlined"
                sx={{ backgroundColor: theme => theme.palette.background.paper }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...chipProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    {...chipProps}
                    label={option}
                    color="primary"
                    sx={{ borderRadius: '16px' }}
                  />
                );
              })
            }
          />

          <TextField
            label="Bio"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            sx={{ backgroundColor: theme => theme.palette.background.paper }}
          />

          <TextField
            label="Experience"
            value={profile.experience}
            onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            sx={{ backgroundColor: theme => theme.palette.background.paper }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            size="large"
            disabled={saving || !profile.name.trim() || !profile.email.trim()}
            sx={{
              mt: 2,
              py: 1.5,
              fontWeight: 600,
              borderRadius: '8px',
              boxShadow: 2
            }}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Profile'}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 