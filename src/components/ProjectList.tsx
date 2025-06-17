import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Avatar,
  Divider,
  IconButton,
  Theme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { collection, query, getDocs, doc, updateDoc, getDoc, where, addDoc, DocumentData, DocumentReference, Firestore, CollectionReference, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { analyzeSkillMatch, extractKeywords } from '../services/gemini';
import { SearchBar } from './SearchBar';
import { Chat } from './Chat';
import ChatIcon from '@mui/icons-material/Chat';
import { Timestamp } from 'firebase/firestore';
import { SkillMatcher } from '../services/skillMatching';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

interface Project {
  id: string;
  title: string;
  description: string;
  extractedSkills: string[];
  createdBy: string;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'completed';
  requests?: ProjectRequest[];
  summary?: string;
  keyInsights?: string[];
  creatorAvatar?: string;
  creatorName?: string;
  members?: ProjectMember[];
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

interface ProjectInvite {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  createdBy: string;
}

interface ProjectMember {
  userId: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

interface UserData {
  name?: string;
  avatar?: string;
  skills?: string[];
}

interface MatchAnalysis {
  score: number;
  analysis: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  breakdown: {
    exactMatches: string[];
    relatedMatches: string[];
    categoryMatches: string[];
  };
  details: {
    exactScore: number;
    relatedScore: number;
    categoryScore: number;
    projectRelevanceScore: number;
  };
}

export const ProjectList: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [selectedChat, setSelectedChat] = useState<{ userId: string; userName: string; projectId: string } | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsData = await Promise.all(projectsSnapshot.docs.map(async (projectDoc) => {
        const projectData = projectDoc.data() as Omit<Project, 'id' | 'requests' | 'members'>;
        
        // Get requests for this project
        const requestsQuery = query(
          collection(db, 'project_requests'),
          where('projectId', '==', projectDoc.id)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requests = requestsSnapshot.docs.map(reqDoc => ({
          id: reqDoc.id,
          ...reqDoc.data()
        })) as ProjectRequest[];

        // Get project owner's data
        const ownerDoc = await getDoc(doc(db, 'users', projectData.createdBy));
        const ownerData = ownerDoc.data() as UserData;

        // Get accepted members for this project
        const acceptedRequests = requests.filter(r => r.status === 'accepted');
        const members = [
          // Add project owner as first member
          {
            userId: projectData.createdBy,
            name: ownerData?.name || 'Anonymous',
            avatar: ownerData?.avatar,
            role: 'owner' as const,
            joinedAt: projectData.createdAt
          },
          // Add other members from accepted requests
          ...(await Promise.all(acceptedRequests.map(async (request) => {
            try {
              const userRef = doc(db, 'users', request.userId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? (userSnap.data() as UserData) : null;
              
              return {
                userId: request.userId,
                name: userData?.name || request.userProfile?.name || 'Anonymous',
                avatar: userData?.avatar,
                role: 'member' as const,
                joinedAt: request.createdAt
              };
            } catch (error) {
              console.error('Error fetching user data:', error);
              return {
                userId: request.userId,
                name: request.userProfile?.name || 'Anonymous',
                role: 'member' as const,
                joinedAt: request.createdAt
              };
            }
          })))
        ];

        const createdAt = projectData.createdAt instanceof Timestamp 
          ? projectData.createdAt.toDate() 
          : new Date();

        return {
          id: projectDoc.id,
          ...projectData,
          createdAt,
          requests,
          members
        } as Project;
      }));

      setProjects(projectsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (project: Project) => {
    try {
      setSelectedProject(project);
      setAnalyzing(true);
      setRequestDialogOpen(true);

      // Get user's profile
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const userProfile = userDoc.data();

      if (!userProfile?.skills?.length) {
        throw new Error('Please add skills to your profile before requesting to join a project.');
      }

      // Use enhanced skill matching
      const skillMatcher = new SkillMatcher();
      const matchResult = await skillMatcher.calculateMatch(
        userProfile.skills,
        project.extractedSkills,
        project.description,
        userProfile.skillExperience // Optional experience levels if available
      );

      setMatchAnalysis({
        score: matchResult.score,
        analysis: matchResult.analysis,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        recommendations: matchResult.recommendations,
        breakdown: matchResult.skillBreakdown,
        details: matchResult.matchDetails
      });
      
    } catch (err) {
      console.error('Error analyzing match:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze skill match.');
    } finally {
      setAnalyzing(false);
    }
  };

  const submitRequest = async () => {
    if (!selectedProject || !user || !matchAnalysis) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userProfile = userDoc.data();

      await addDoc(collection(db, 'project_requests'), {
        projectId: selectedProject.id,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        matchScore: matchAnalysis.score,
        matchAnalysis: matchAnalysis.analysis,
        userProfile: {
          name: userProfile?.name || user.displayName,
          skills: userProfile?.skills || []
        }
      });

      // Create notification for the project owner
      await addDoc(collection(db, 'notifications'), {
        type: 'new_request',
        userId: selectedProject.createdBy,
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        userName: userProfile?.name || user.displayName || 'Anonymous',
        userAvatar: user.photoURL || '',
        createdAt: new Date(),
        read: false
      });

      setRequestDialogOpen(false);
      loadProjects(); // Reload projects to update the requests
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
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

      loadProjects(); // Reload projects to update the status
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update request. Please try again.');
    }
  };

  const handleSearch = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    const filtered = projects.filter(project => 
      project.title.toLowerCase().includes(lowercaseQuery) ||
      project.description.toLowerCase().includes(lowercaseQuery) ||
      project.extractedSkills.some(skill => 
        skill.toLowerCase().includes(lowercaseQuery)
      )
    );
    setFilteredProjects(filtered);
  };

  const handleSendInvite = async (userId: string, projectId: string) => {
    if (!user) return;

    try {
      const inviteData = {
        projectId,
        userId,
        status: 'pending',
        createdAt: new Date(),
        createdBy: user.uid
      };

      await addDoc(collection(db, 'project_invites'), inviteData);
      setError('Invite sent successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Error sending invite:', err);
      setError('Failed to send invite. Please try again.');
    }
  };

  const handleOpenChat = (userId: string, userName: string, projectId: string) => {
    setSelectedChat({ userId, userName, projectId });
    setChatDialogOpen(true);
  };

  const canRequestToJoin = (project: Project) => {
    if (!user) return false;
    if (project.createdBy === user.uid) return false;
    
    // Check if user is already a member
    if (project.members?.some(member => member.userId === user.uid)) {
      return false;
    }

    // Check if user has a pending or accepted request
    const userRequest = project.requests?.find(r => r.userId === user.uid);
    if (userRequest && (userRequest.status === 'pending' || userRequest.status === 'accepted')) {
      return false;
    }

    return true;
  };

  const getRequestStatus = (project: Project) => {
    if (!user) return null;
    const userRequest = project.requests?.find(r => r.userId === user.uid);
    return userRequest?.status || null;
  };

  const isProjectMember = (project: Project) => {
    if (!user) return false;
    return project.members?.some(member => member.userId === user.uid) || project.createdBy === user.uid;
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
          Discover Projects
        </Typography>
        <Typography 
          variant="h6" 
          color="textSecondary"
          sx={{ maxWidth: 600, mb: 4 }}
        >
          Find exciting projects that match your skills and connect with amazing collaborators
        </Typography>

        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search by title, description, or skills..."
          sx={{ 
            width: '100%', 
            maxWidth: 600,
            mb: 2,
            '& .MuiInputBase-root': {
              borderRadius: 3,
              backgroundColor: (theme: Theme) => theme.palette.background.paper,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
              }
            }
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} key={project.id}>
            <Card 
              sx={{
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme: Theme) => `0 8px 16px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'}`,
                },
                position: 'relative',
                overflow: 'visible'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1
                }}
              >
                <Chip
                  label={project.status}
                  color={
                    project.status === 'open' 
                      ? 'success' 
                      : project.status === 'in_progress' 
                        ? 'warning' 
                        : 'default'
                  }
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'capitalize',
                    fontWeight: 600
                  }}
                />
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography 
                    variant="h5"
                    sx={{ 
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    {project.title}
                  </Typography>

                  <Box
                    sx={{ 
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'text.secondary'
                    }}
                  >
                    <Avatar 
                      src={project.creatorAvatar} 
                      sx={{ width: 24, height: 24 }}
                    />
                    Posted {new Date(project.createdAt).toLocaleDateString()}
                  </Box>

                  <Typography 
                    sx={{
                      color: 'text.primary',
                      lineHeight: 1.6
                    }}
                  >
                    {project.description}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      Required Skills:
                    </Typography>
                    <Stack 
                      direction="row" 
                      spacing={1} 
                      flexWrap="wrap"
                      sx={{ gap: 1 }}
                    >
                      {project.extractedSkills.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          sx={{
                            borderRadius: 2,
                            backgroundColor: (theme: Theme) => 
                              theme.palette.mode === 'dark' 
                                ? 'rgba(33, 150, 243, 0.15)'
                                : 'rgba(33, 150, 243, 0.1)',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: (theme: Theme) =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(33, 150, 243, 0.25)'
                                  : 'rgba(33, 150, 243, 0.2)',
                            }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  {project.keyInsights && (
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mb: 1,
                          fontWeight: 600
                        }}
                      >
                        Key Requirements:
                      </Typography>
                      <Box 
                        component="ul" 
                        sx={{ 
                          pl: 2,
                          '& li': {
                            mb: 0.5,
                            color: 'text.secondary'
                          }
                        }}
                      >
                        {project.keyInsights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {isProjectMember(project) && project.members && project.members.length > 0 && (
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mb: 1,
                          fontWeight: 600
                        }}
                      >
                        Project Members:
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                        {project.members.map((member) => (
                          <Chip
                            key={member.userId}
                            avatar={<Avatar src={member.avatar}>{member.name[0]}</Avatar>}
                            label={`${member.name}${member.role === 'owner' ? ' (Owner)' : ''}`}
                            variant="outlined"
                            size="small"
                            sx={{
                              borderRadius: 2,
                              '& .MuiChip-avatar': {
                                width: 24,
                                height: 24,
                              }
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Stack 
                    direction="row" 
                    spacing={2} 
                    sx={{ 
                      mt: 2,
                      pt: 2,
                      borderTop: 1,
                      borderColor: 'divider'
                    }}
                  >
                    {canRequestToJoin(project) ? (
                      <Button
                        variant="contained"
                        onClick={() => handleRequestToJoin(project)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        Request to Join
                      </Button>
                    ) : getRequestStatus(project) === 'pending' ? (
                      <Button
                        variant="outlined"
                        disabled
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        Request Pending
                      </Button>
                    ) : null}
                    
                    {user && user.uid !== project.createdBy && (
                      <IconButton
                        onClick={() => handleOpenChat(project.createdBy, project.creatorName || 'Project Owner', project.id)}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2
                        }}
                      >
                        <ChatIcon />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Project Match Analysis</DialogTitle>
        <DialogContent>
          {analyzing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : matchAnalysis && (
            <Box>
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={matchAnalysis.score}
                  size={60}
                  sx={{
                    color: (theme) =>
                      matchAnalysis.score >= 70
                        ? theme.palette.success.main
                        : matchAnalysis.score >= 40
                        ? theme.palette.warning.main
                        : theme.palette.error.main,
                  }}
                />
                <Typography variant="h6">
                  Match Score: {matchAnalysis.score}%
                </Typography>
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {matchAnalysis.analysis}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Match Breakdown:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Exact Matches: {matchAnalysis.details.exactScore}%
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1, mt: 1 }}>
                      {matchAnalysis.breakdown.exactMatches.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          color="success"
                        />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Related Matches: {matchAnalysis.details.relatedScore}%
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1, mt: 1 }}>
                      {matchAnalysis.breakdown.relatedMatches.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          color="info"
                        />
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              {matchAnalysis.missingSkills.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Missing Skills:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    {matchAnalysis.missingSkills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        color="warning"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {matchAnalysis.recommendations.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Recommendations:
                  </Typography>
                  <List>
                    {matchAnalysis.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <LightbulbIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <DialogActions>
                <Button onClick={() => setRequestDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => submitRequest()}
                  disabled={matchAnalysis.score < 40}
                >
                  {matchAnalysis.score < 40
                    ? "Score Too Low to Join"
                    : "Request to Join"}
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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