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
