interface AparaviConfig {
  apiKey: string;
  baseUrl: string;
}

class AparaviService {
  private config: AparaviConfig;

  constructor(config: AparaviConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Aparavi API error: ${response.statusText}`);
    }

    return response.json();
  }

  async storeUserData(userId: string, data: any) {
    return this.makeRequest('/data/store', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        data,
        metadata: {
          type: 'user_profile',
          timestamp: new Date().toISOString(),
        },
      }),
    });
  }

  async storeProjectData(projectId: string, data: any) {
    return this.makeRequest('/data/store', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        data,
        metadata: {
          type: 'project',
          timestamp: new Date().toISOString(),
        },
      }),
    });
  }

  async searchUsersBySkills(skills: string[]) {
    return this.makeRequest('/data/search', {
      method: 'POST',
      body: JSON.stringify({
        query: {
          type: 'user_profile',
          skills: skills,
        },
      }),
    });
  }

  async getDataInsights(dataType: 'user_profile' | 'project') {
    return this.makeRequest('/analytics/insights', {
      method: 'POST',
      body: JSON.stringify({
        type: dataType,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          end: new Date().toISOString(),
        },
      }),
    });
  }
}

export const aparaviService = new AparaviService({
  apiKey: process.env.REACT_APP_APARAVI_API_KEY || '',
  baseUrl: process.env.REACT_APP_APARAVI_BASE_URL || '',
}); 