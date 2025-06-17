import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

interface SkillMatchInput {
  projectSkills: string[];
  userSkills: string[];
  projectDescription: string;
}

interface ProjectAnalysis {
  skills: string[];
  requirements: string[];
  summary: string;
  insights: string[];
}

export const analyzeSkillMatch = async ({ projectSkills, userSkills, projectDescription }: SkillMatchInput) => {
  try {
    const prompt = `
      Analyze the compatibility between a user's skills and a project's requirements.
      
      Project Description: ${projectDescription}
      Required Skills: ${projectSkills.join(', ')}
      User's Skills: ${userSkills.join(', ')}

      Please provide:
      1. A match score (0-100)
      2. A detailed analysis of the skill match
      3. Recommendations for any missing but important skills

      Format the response as a JSON object with the following structure:
      {
        "score": number,
        "analysis": string
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      // If JSON parsing fails, return a formatted response
      return {
        score: 0,
        analysis: text
      };
    }
  } catch (error) {
    console.error('Error analyzing skill match:', error);
    throw error;
  }
};

export const extractKeywords = async (text: string): Promise<string[]> => {
  try {
    const prompt = `
      Analyze the following resume text and extract technical skills, tools, frameworks, and technologies:
      
      ${text}
      
      Return only the list of skills, each on a new line. Do not include any other text or explanations.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const skills = response.text()
      .split('\n')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    return skills;
  } catch (error) {
    console.error('Error extracting skills:', error);
    return [];
  }
};

export const analyzeProject = async (description: string): Promise<ProjectAnalysis> => {
  try {
    const prompt = `
      Analyze the following project description and extract:
      1. Required technical skills
      2. Key project requirements
      3. A brief summary
      4. Important insights

      Project Description: ${description}

      Format the response as a JSON object with the following structure:
      {
        "skills": string[],
        "requirements": string[],
        "summary": string,
        "insights": string[]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      // If JSON parsing fails, return a default structure
      return {
        skills: [],
        requirements: [],
        summary: text,
        insights: []
      };
    }
  } catch (error) {
    console.error('Error analyzing project:', error);
    throw error;
  }
};

export const findMatchingUsers = async (skills: string[]) => {
  try {
    const prompt = `
      Given the following skills, analyze and create a matching profile:
      Skills: ${skills.join(', ')}

      Please provide:
      1. Required experience level for each skill
      2. Complementary skills that would be valuable
      3. Suggested roles for someone with this skill set

      Format the response as a JSON object with the following structure:
      {
        "experienceLevels": { [key: string]: string },
        "complementarySkills": string[],
        "suggestedRoles": string[]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      return {
        experienceLevels: {},
        complementarySkills: [],
        suggestedRoles: []
      };
    }
  } catch (error) {
    console.error('Error finding matching users:', error);
    throw error;
  }
}; 