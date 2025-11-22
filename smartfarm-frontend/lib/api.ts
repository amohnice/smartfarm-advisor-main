const isDev = process.env.NODE_ENV === 'development';
const API_BASE = isDev ? 'http://localhost:3001' : 'https://smartfarm-backend.vercel.app';

export async function analyzeDiseaseImage(
    imageFile: File,
    options?: {
        cropType?: string;
        language?: string;
        location?: { latitude: number; longitude: number };
    }
) {
    const formData = new FormData();
    formData.append('image', imageFile);

    if (options?.cropType) formData.append('cropType', options.cropType);
    if (options?.language) formData.append('language', options.language);
    if (options?.location) formData.append('location', JSON.stringify(options.location));

    const response = await fetch(`${API_BASE}/api/analyze-disease`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to analyze disease');
    }

    return response.json();
}

export async function sendChatMessage(
    message: string,
    history: Array<{ role: string; text: string }> = [],
    options?: {
        language?: string;
        farmerProfile?: any;
    }
) {
    const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            history,
            language: options?.language || 'en',
            farmerProfile: options?.farmerProfile,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to send message');
    }

    return response.json();
}

export async function getWeatherAdvisory(
    location: { latitude: number; longitude: number },
    activity: 'planting' | 'fertilizing' | 'spraying' | 'harvesting',
    cropType?: string
) {
    const response = await fetch(`${API_BASE}/api/weather-advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, activity, cropType }),
    });

    if (!response.ok) {
        throw new Error('Failed to get weather advisory');
    }

    return response.json();
}

export interface ReportData {
    analysis: any; // Replace 'any' with your analysis type
    timestamp: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    notes?: string;
    language?: string;
}

export async function saveReportToServer(reportData: ReportData) {
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...reportData,
                savedAt: new Date().toISOString()
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('Failed to save report to server:', errorData.error || 'Unknown error');
            return { success: false, error: errorData.error || 'Failed to save report' };
        }

        return { success: true, message: 'Report saved successfully' };
    } catch (error) {
        console.warn('Error saving report to server:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save report'
        };
    }
}
