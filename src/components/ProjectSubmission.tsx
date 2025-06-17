import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { extractKeywords, analyzeProject } from '../services/gemini';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ProjectSubmission {
  id: string;
  title: string;
  description: string;
  extractedSkills: string[];
  requirements: string[];
  summary: string;
  insights: string[];
  createdBy: string;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'completed';
}

export const ProjectSubmission: React.FC = () => {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectSubmission>({
    id: '',
    title: '',
    description: '',
    extractedSkills: [],
    requirements: [],
    summary: '',
    insights: [],
    createdBy: user?.uid || '',
    createdAt: new Date(),
    status: 'open'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Analyze project description using Gemini
      const analysis = await analyzeProject(project.description);

      // Create project document
      const projectRef = doc(collection(db, 'projects'));
      const projectId = projectRef.id;

      await setDoc(projectRef, {
        ...project,
        id: projectId,
        extractedSkills: analysis.skills,
        requirements: analysis.requirements,
        summary: analysis.summary,
        insights: analysis.insights,
        createdAt: new Date(),
        createdBy: user.uid,
        status: 'open'
      });

      setSuccess(true);
      navigate('/manage-projects');
    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Submit a Project
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Project submitted successfully!
          </Alert>
        )}
        
        <Stack spacing={3}>
          <TextField
            label="Project Title"
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
            fullWidth
            required
            error={!project.title.trim()}
            helperText={!project.title.trim() ? 'Title is required' : ''}
          />

          <TextField
            label="Project Description"
            value={project.description}
            onChange={(e) => setProject({ ...project, description: e.target.value })}
            multiline
            rows={6}
            fullWidth
            required
            error={!project.description.trim()}
            helperText={!project.description.trim() ? 'Description is required' : 'Describe your project, required skills, and expectations in detail'}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            size="large"
            disabled={loading || !project.title.trim() || !project.description.trim()}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Project'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}; 