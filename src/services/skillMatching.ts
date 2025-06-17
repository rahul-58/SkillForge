import { analyzeSkillMatch } from './gemini';

interface SkillWeight {
  exact: number;
  related: number;
  experience: number;
  category: number;
  projectRelevance: number;
}

interface SkillMatchResult {
  score: number;
  analysis: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  skillBreakdown: {
    exactMatches: string[];
    relatedMatches: string[];
    categoryMatches: string[];
  };
  matchDetails: {
    exactScore: number;
    relatedScore: number;
    categoryScore: number;
    projectRelevanceScore: number;
  };
}

// Define related skills and their relationships
const SKILL_RELATIONSHIPS: Record<string, string[]> = {
  'react': ['javascript', 'typescript', 'frontend', 'web development', 'redux', 'react-router', 'nextjs'],
  'javascript': ['typescript', 'web development', 'frontend', 'nodejs', 'es6', 'webpack'],
  'python': ['django', 'flask', 'backend', 'data science', 'machine learning', 'pandas', 'numpy'],
  'java': ['spring', 'backend', 'enterprise', 'hibernate', 'maven', 'junit'],
  'nodejs': ['javascript', 'backend', 'express', 'npm', 'mongodb', 'rest-api'],
  'typescript': ['javascript', 'angular', 'react', 'nodejs', 'type-safety'],
  'aws': ['cloud', 'devops', 's3', 'ec2', 'lambda', 'cloudformation'],
  'docker': ['kubernetes', 'devops', 'containerization', 'microservices'],
  'sql': ['mysql', 'postgresql', 'database', 'data modeling', 'orm'],
  'machine learning': ['python', 'data science', 'tensorflow', 'pytorch', 'scikit-learn'],
  'ui/ux': ['figma', 'design', 'wireframing', 'prototyping', 'user research'],
  'agile': ['scrum', 'project management', 'jira', 'kanban'],
  'testing': ['jest', 'cypress', 'selenium', 'unit testing', 'e2e testing']
};

// Define skill categories for better matching
const SKILL_CATEGORIES: Record<string, string[]> = {
  'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'webpack', 'nextjs', 'gatsby'],
  'backend': ['nodejs', 'python', 'java', 'php', 'ruby', 'golang', 'express', 'django', 'spring', 'graphql'],
  'database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'orm', 'sql', 'nosql'],
  'devops': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'terraform', 'ansible', 'ci/cd'],
  'mobile': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
  'ai/ml': ['machine learning', 'deep learning', 'python', 'tensorflow', 'pytorch', 'nlp', 'computer vision'],
  'design': ['ui/ux', 'figma', 'adobe xd', 'sketch', 'user research', 'wireframing'],
  'testing': ['jest', 'cypress', 'selenium', 'unit testing', 'e2e testing', 'test automation'],
  'project management': ['agile', 'scrum', 'jira', 'trello', 'project planning', 'team leadership'],
  'security': ['cybersecurity', 'oauth', 'jwt', 'encryption', 'penetration testing', 'security audit']
};

export class SkillMatcher {
  private weights: SkillWeight = {
    exact: 1.0,    // Weight for exact skill matches
    related: 0.5,  // Weight for related skill matches
    experience: 0.3, // Weight for experience level
    category: 0.4,  // Weight for category matches
    projectRelevance: 0.6 // Weight for project-specific relevance
  };

  /**
   * Calculate skill match score between user skills and project requirements
   */
  async calculateMatch(
    userSkills: string[],
    projectSkills: string[],
    projectDescription: string,
    userExperience?: Record<string, number> // Optional experience levels for skills
  ): Promise<SkillMatchResult> {
    // Normalize skills (lowercase and trim)
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
    const normalizedProjectSkills = projectSkills.map(s => s.toLowerCase().trim());

    // Calculate exact matches
    const exactMatches = normalizedProjectSkills.filter(skill => 
      normalizedUserSkills.includes(skill)
    );

    // Calculate related skill matches
    const relatedMatches = this.findRelatedSkillMatches(
      normalizedUserSkills,
      normalizedProjectSkills
    );

    // Calculate category matches
    const categoryMatches = this.findCategoryMatches(
      normalizedUserSkills,
      normalizedProjectSkills
    );

    // Calculate experience bonus if experience data is provided
    const experienceBonus = userExperience ? this.calculateExperienceBonus(
      exactMatches,
      userExperience
    ) : 0;

    // Calculate project relevance score based on key skills
    const projectRelevanceScore = this.calculateProjectRelevance(
      exactMatches,
      normalizedProjectSkills
    );

    // Calculate scores for each factor
    const exactScore = (exactMatches.length / normalizedProjectSkills.length) * this.weights.exact;
    const relatedScore = (relatedMatches.length / normalizedProjectSkills.length) * this.weights.related;
    const categoryScore = (categoryMatches.length / normalizedProjectSkills.length) * this.weights.category;

    // Combined base score (0-100)
    const baseScore = Math.min(100, Math.round(
      (exactScore + relatedScore + categoryScore + experienceBonus + projectRelevanceScore * this.weights.projectRelevance) * 100
    ));

    // Get AI analysis for more nuanced matching
    let aiAnalysis;
    try {
      aiAnalysis = await analyzeSkillMatch({
        projectSkills,
        userSkills,
        projectDescription
      });
    } catch (error) {
      console.error('AI analysis failed, using base score only:', error);
      aiAnalysis = {
        score: baseScore,
        analysis: this.generateAnalysis(exactMatches, relatedMatches, normalizedProjectSkills)
      };
    }

    // Calculate final score (combine base score with AI score)
    const finalScore = Math.round((baseScore + (aiAnalysis.score || baseScore)) / 2);

    // Find missing skills
    const missingSkills = normalizedProjectSkills.filter(
      skill => !exactMatches.includes(skill) && !relatedMatches.includes(skill)
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(missingSkills);

    return {
      score: finalScore,
      analysis: aiAnalysis.analysis || this.generateAnalysis(exactMatches, relatedMatches, normalizedProjectSkills),
      matchedSkills: Array.from(new Set([...exactMatches, ...relatedMatches])),
      missingSkills,
      recommendations,
      skillBreakdown: {
        exactMatches,
        relatedMatches,
        categoryMatches
      },
      matchDetails: {
        exactScore: Math.round(exactScore * 100),
        relatedScore: Math.round(relatedScore * 100),
        categoryScore: Math.round(categoryScore * 100),
        projectRelevanceScore: Math.round(projectRelevanceScore * 100)
      }
    };
  }

  /**
   * Find related skill matches using defined relationships
   */
  private findRelatedSkillMatches(userSkills: string[], projectSkills: string[]): string[] {
    const relatedMatches: string[] = [];

    for (const projectSkill of projectSkills) {
      if (userSkills.includes(projectSkill)) continue; // Skip exact matches

      // Check skill relationships
      const relatedSkills = SKILL_RELATIONSHIPS[projectSkill] || [];
      if (userSkills.some(userSkill => relatedSkills.includes(userSkill))) {
        relatedMatches.push(projectSkill);
      }
    }

    return relatedMatches;
  }

  /**
   * Find matches based on skill categories
   */
  private findCategoryMatches(userSkills: string[], projectSkills: string[]): string[] {
    const categoryMatches: string[] = [];

    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      const projectSkillsInCategory = projectSkills.filter(skill => skills.includes(skill));
      const userSkillsInCategory = userSkills.filter(skill => skills.includes(skill));

      if (projectSkillsInCategory.length > 0 && userSkillsInCategory.length > 0) {
        categoryMatches.push(...projectSkillsInCategory);
      }
    }

    return Array.from(new Set(categoryMatches));
  }

  /**
   * Generate human-readable analysis of the skill match
   */
  private generateAnalysis(
    exactMatches: string[],
    relatedMatches: string[],
    requiredSkills: string[]
  ): string {
    const matchPercentage = Math.round(
      ((exactMatches.length + relatedMatches.length * 0.5) / requiredSkills.length) * 100
    );

    let analysis = `You match ${matchPercentage}% of the required skills. `;

    if (exactMatches.length > 0) {
      analysis += `You have direct experience with ${exactMatches.join(', ')}. `;
    }

    if (relatedMatches.length > 0) {
      analysis += `You have related experience that could apply to ${relatedMatches.join(', ')}. `;
    }

    return analysis;
  }

  /**
   * Generate learning recommendations for missing skills
   */
  private generateRecommendations(missingSkills: string[]): string[] {
    return missingSkills.map(skill => {
      const category = Object.entries(SKILL_CATEGORIES)
        .find(([_, skills]) => skills.includes(skill))?.[0];

      return `Consider learning ${skill}${category ? ` to strengthen your ${category} skills` : ''}`;
    });
  }

  /**
   * Calculate bonus score based on user's experience levels
   */
  private calculateExperienceBonus(
    matchedSkills: string[],
    experience: Record<string, number>
  ): number {
    const totalExperience = matchedSkills.reduce((sum, skill) => {
      return sum + (experience[skill] || 0);
    }, 0);
    
    // Normalize experience bonus to be between 0 and 0.3 (max experience weight)
    return Math.min(0.3, totalExperience / (matchedSkills.length * 5)) * this.weights.experience;
  }

  /**
   * Calculate project relevance score based on matching critical skills
   */
  private calculateProjectRelevance(
    matchedSkills: string[],
    projectSkills: string[]
  ): number {
    // Identify critical skills (first 3 skills in project requirements)
    const criticalSkills = projectSkills.slice(0, 3);
    const criticalMatches = matchedSkills.filter(skill => 
      criticalSkills.includes(skill)
    );

    return criticalMatches.length / criticalSkills.length;
  }
} 