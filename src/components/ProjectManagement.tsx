import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  Badge
} from '@mui/material';
import { Edit as EditIcon, Search as SearchIcon, Chat as ChatIcon } from '@mui/icons-material';
import { collection, query, getDocs, doc, updateDoc, getDoc, where, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { extractKeywords, findMatchingUsers } from '../services/gemini';
import { SearchBar } from './SearchBar';
import { Chat } from './Chat';

interface Project {
  id: string;
  title: string;
  description: string;
  extractedSkills: string[];
  createdBy: string;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'completed';
  requests?: ProjectRequest[];
}

interface ProjectRequest {
  id: string;
  userId: string;
  projectId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  matchScore?: number;
  matchAnalysis?: string;
  userProfile?: {
    name: string;
    skills: string[];
  };
}

interface MatchingUser {
  id: string;
  name: string;
  skills: string[];
  matchScore: number;
  experienceLevel: string;
}

export const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchingUsers, setMatchingUsers] = useState<MatchingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedChat, setSelectedChat] = useState<{ userId: string; userName: string; projectId: string } | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProjects();
    }
  }, [user]);

  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  const loadUserProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get all projects
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsData = await Promise.all(projectsSnapshot.docs.map(async (doc) => {
        const projectData = doc.data();
        
        // Get requests for this project
        const requestsQuery = query(
          collection(db, 'project_requests'),
          where('projectId', '==', doc.id)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requests = requestsSnapshot.docs.map(reqDoc => ({
          id: reqDoc.id,
          ...reqDoc.data()
        })) as ProjectRequest[];

        return {
          id: doc.id,
          ...projectData,
          createdAt: projectData.createdAt?.toDate() || new Date(),
          requests
        } as Project;
      }));

      // Filter to show:
      // 1. Projects created by the user
      // 2. Projects where the user has an accepted request
      const userProjects = projectsData.filter(project => 
        project.createdBy === user.uid ||
        project.requests?.some(request => 
          request.userId === user.uid && 
          request.status === 'accepted'
        )
      );

      setProjects(userProjects);
      setLoading(false);
    } catch (err) {
      console.error('Error loading user projects:', err);
      setError('Failed to load projects. Please try again.');
      setLoading(false);
    }
  };

  const handleEditProject = async () => {
    if (!editingProject) return;

    try {
      await updateDoc(doc(db, 'projects', editingProject.id), {
        title: editingProject.title,
        description: editingProject.description,
        updatedAt: new Date()
      });

      setEditDialogOpen(false);
      loadUserProjects();
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project. Please try again.');
    }
  };

  const handleRequestResponse = async (request: ProjectRequest, accept: boolean) => {
    try {
      await updateDoc(doc(db, 'project_requests', request.id), {
        status: accept ? 'accepted' : 'rejected',
        updatedAt: new Date()
      });

      if (accept) {
        await updateDoc(doc(db, 'projects', request.projectId), {
          status: 'in_progress'
        });
      }

      // Create notification for the user who requested to join
      await addDoc(collection(db, 'notifications'), {
        type: accept ? 'request_accepted' : 'request_rejected',
        userId: request.userId,
        projectId: request.projectId,
        projectTitle: projects.find(p => p.id === request.projectId)?.title || '',
        userName: user?.displayName || 'Project Owner',
        userAvatar: user?.photoURL || '',
        createdAt: new Date(),
        read: false
      });

      loadUserProjects();
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update request. Please try again.');
    }
  };

  const findPotentialCollaborators = async (project: Project) => {
    try {
      setSearchingUsers(true);
      setMatchDialogOpen(true);

      // Use Gemini to analyze the project requirements and find matching profiles
      const matchAnalysis = await findMatchingUsers(project.extractedSkills);
      
      // Query users with matching skills
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const potentialMatches: MatchingUser[] = [];
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userDoc.id === user!.uid) continue; // Skip project owner

        // Calculate match score based on skills overlap
        const userSkills = userData.skills || [];
        const requiredSkills = project.extractedSkills;
        const matchingSkills = userSkills.filter((skill: string) => requiredSkills.includes(skill));
        const matchScore = (matchingSkills.length / requiredSkills.length) * 100;

        if (matchScore > 0) {
          potentialMatches.push({
            id: userDoc.id,
            name: userData.name,
            skills: userData.skills || [],
            matchScore,
            experienceLevel: matchAnalysis.experienceLevels[matchingSkills[0]] || 'Not specified'
          });
        }
      }

      setMatchingUsers(potentialMatches.sort((a, b) => b.matchScore - a.matchScore));
    } catch (err) {
      console.error('Error finding potential collaborators:', err);
      setError('Failed to find matching users. Please try again.');
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSearch = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    const filtered = projects.filter(project => 
      project.title.toLowerCase().includes(lowercaseQuery) ||
      project.description.toLowerCase().includes(lowercaseQuery) ||
      project.extractedSkills.some(skill => 
        skill.toLowerCase().includes(lowercaseQuery)
      ) ||
      project.requests?.some(request =>
        request.userProfile?.name.toLowerCase().includes(lowercaseQuery) ||
        request.userProfile?.skills.some(skill =>
          skill.toLowerCase().includes(lowercaseQuery)
        )
      )
    );
    setFilteredProjects(filtered);
  };

  const handleOpenChat = (userId: string, userName: string, projectId: string) => {
    setSelectedChat({ userId, userName, projectId });
    setChatDialogOpen(true);
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
      <Typography variant="h4" gutterBottom>
        My Projects
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SearchBar 
        onSearch={handleSearch}
        placeholder="Search projects, skills, or collaborators..."
      />

      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} key={project.id}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" component="div">
                    {project.title}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={() => {
                        setEditingProject(project);
                        setEditDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <Button
                      variant="contained"
                      startIcon={<SearchIcon />}
                      onClick={() => findPotentialCollaborators(project)}
                    >
                      Find Collaborators
                    </Button>
                  </Stack>
                </Stack>

                <Typography component="div" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  {project.extractedSkills.map((skill) => (
                    <Chip key={skill} label={skill} size="small" />
                  ))}
                </Stack>

                {project.requests && project.requests.length > 0 && (
                  <Box>
                    <Typography variant="h6" component="div" gutterBottom>
                      Join Requests
                    </Typography>
                    <List>
                      {project.requests.map((request) => (
                        <React.Fragment key={request.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar>{request.userProfile?.name?.[0]}</Avatar>
                                  <Typography variant="subtitle1" component="span">
                                    {request.userProfile?.name}
                                  </Typography>
                                </Stack>
                              }
                              secondary={
                                <Typography component="div">
                                  <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary" component="span">
                                      Match Score: {request.matchScore}%
                                    </Typography>
                                    <Typography variant="body2" component="span">
                                      {request.matchAnalysis}
                                    </Typography>
                                  </Stack>
                                </Typography>
                              }
                            />
                            <Stack direction="row" spacing={1} alignItems="center">
                              {request.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    onClick={() => handleRequestResponse(request, true)}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => handleRequestResponse(request, false)}
                                  >
                                    Decline
                                  </Button>
                                </>
                              ) : (
                                <Chip
                                  label={request.status}
                                  color={request.status === 'accepted' ? 'success' : 'error'}
                                />
                              )}
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenChat(request.userId, request.userProfile?.name || 'User', project.id)}
                              >
                                <ChatIcon />
                              </IconButton>
                            </Stack>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Project Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Project Title"
              value={editingProject?.title || ''}
              onChange={(e) =>
                setEditingProject(prev =>
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
              fullWidth
            />
            <TextField
              label="Project Description"
              value={editingProject?.description || ''}
              onChange={(e) =>
                setEditingProject(prev =>
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
              multiline
              rows={6}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditProject} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Find Collaborators Dialog */}
      <Dialog
        open={matchDialogOpen}
        onClose={() => setMatchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Potential Collaborators</DialogTitle>
        <DialogContent>
          {searchingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {matchingUsers.map((user) => (
                <React.Fragment key={user.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar>{user.name[0]}</Avatar>
                          <Typography variant="subtitle1" component="span">
                            {user.name}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={1} component="div">
                          <Typography variant="body2" color="text.secondary" component="span">
                            Match Score: {user.matchScore.toFixed(1)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            Experience Level: {user.experienceLevel}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            {user.skills.map((skill) => (
                              <Chip key={skill} label={skill} size="small" />
                            ))}
                          </Stack>
                        </Stack>
                      }
                    />
                    <IconButton
                      color="primary"
                      onClick={() => {
                        handleOpenChat(user.id, user.name, editingProject?.id || '');
                        setMatchDialogOpen(false);
                      }}
                    >
                      <ChatIcon />
                    </IconButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog
        open={chatDialogOpen}
        onClose={() => setChatDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {selectedChat && (
            <Chat
              recipientId={selectedChat.userId}
              recipientName={selectedChat.userName}
              projectId={selectedChat.projectId}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}; 