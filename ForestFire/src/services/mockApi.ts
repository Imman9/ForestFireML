import { FireReport, MLPrediction, WeatherData, User } from '../types';

// Mock data
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
};

const mockWeatherData: WeatherData = {
  temperature: 25,
  humidity: 60,
  windSpeed: 15,
  windDirection: 'NW',
  fireRisk: 'moderate',
};

const mockReports: FireReport[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Test User',
    location: {
      latitude: 37.78825,
      longitude: -122.4324,
      address: 'San Francisco, CA',
    },
    imageUrl: 'https://example.com/fire1.jpg',
    description: 'Large fire spotted in the forest area',
    status: 'confirmed',
    confidence: 85,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    weatherData: mockWeatherData,
  },
  {
    id: '2',
    userId: '2',
    userName: 'Ranger Smith',
    location: {
      latitude: 37.7849,
      longitude: -122.4094,
      address: 'Golden Gate Park, San Francisco, CA',
    },
    imageUrl: 'https://example.com/fire2.jpg',
    description: 'Small brush fire under control',
    status: 'resolved',
    confidence: 92,
    timestamp: new Date('2024-01-14T15:45:00Z'),
    weatherData: mockWeatherData,
  },
];

// Mock API functions
export const mockAuthService = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email === 'test@example.com' && password === 'password') {
      return {
        user: mockUser,
        token: 'mock-jwt-token',
      };
    }
    throw new Error('Invalid credentials');
  },

  register: async (userData: any): Promise<{ user: User; token: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      user: { ...mockUser, ...userData },
      token: 'mock-jwt-token',
    };
  },

  getCurrentUser: async (): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockUser;
  },
};

export const mockMlService = {
  predictFire: async (imageUri: string): Promise<MLPrediction> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate ML prediction
    const hasFire = Math.random() > 0.5;
    const confidence = Math.floor(Math.random() * 40) + 60; // 60-100%
    
    return {
      hasFire,
      confidence,
      class: hasFire ? 'fire' : 'no_fire',
    };
  },

  predictFireBase64: async (imageBase64: string): Promise<MLPrediction> => {
    return mockMlService.predictFire('');
  },
};

export const mockFireReportService = {
  createReport: async (report: Omit<FireReport, 'id' | 'timestamp'>): Promise<FireReport> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newReport: FireReport = {
      ...report,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    mockReports.push(newReport);
    return newReport;
  },

  getReports: async (): Promise<FireReport[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [...mockReports];
  },

  updateReportStatus: async (reportId: string, status: FireReport['status']): Promise<FireReport> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      report.status = status;
      return report;
    }
    throw new Error('Report not found');
  },

  getReportById: async (reportId: string): Promise<FireReport> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      return report;
    }
    throw new Error('Report not found');
  },
};

export const mockWeatherService = {
  getWeatherData: async (latitude: number, longitude: number): Promise<WeatherData> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate weather data based on location
    return {
      temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      fireRisk: ['low', 'moderate', 'high', 'extreme'][Math.floor(Math.random() * 4)] as any,
    };
  },

  getFireRiskMap: async (): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      riskZones: [
        {
          center: { latitude: 37.78825, longitude: -122.4324 },
          radius: 1000,
          risk: 'high',
        },
      ],
    };
  },
};

export const mockNotificationService = {
  registerDevice: async (deviceToken: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Device registered:', deviceToken);
  },

  getNotifications: async (): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        title: 'Fire Alert',
        body: 'New fire reported in your area',
        timestamp: new Date(),
      },
    ];
  },
}; 