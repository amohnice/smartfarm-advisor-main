import express from 'express';
import multer from 'multer';
import cors from 'cors';
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import * as z from 'zod';

// Initialize Genkit with GoogleAI
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}

const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY as string,
        }),
    ],
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://192.168.100.7:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ======================
// GENKIT FLOWS
// ======================

// Disease Detection Flow (unchanged)
const diseaseDetectionFlow = defineFlow(
    {
        name: 'diseaseDetection',
        inputSchema: z.object({
            imageBase64: z.string(),
            cropType: z.string().optional(),
            location: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }).optional(),
            language: z.enum(['en', 'sw', 'ha', 'am', 'yo']).default('en'),
        }),
        outputSchema: z.object({
            disease: z.string(),
            confidence: z.number(),
            severity: z.enum(['mild', 'moderate', 'severe']),
            treatment: z.object({
                immediate: z.array(z.string()),
                preventive: z.array(z.string()),
                organic: z.array(z.string()),
            }),
            estimatedLoss: z.string(),
            localizedText: z.string(),
        }),
    },
    async (input) => {
        // Logging removed for production
        const analysisResult = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: [
                {
                    media: {
                        contentType: 'image/jpeg',
                        url: `data:image/jpeg;base64,${input.imageBase64}`,
                    },
                },
                {
                    text: `Analyze this ${input.cropType || 'crop'} image for diseases. Return ONLY valid JSON:
{
  "disease": "disease name or No disease detected",
  "confidence": 85,
  "severity": "mild",
  "affectedArea": "10%",
  "symptoms": ["symptom1", "symptom2", "symptom3"]
}

Use severity: mild, moderate, or severe.
Keep symptoms list to 3 items max.`,
                },
            ],
            config: {
                temperature: 0.2,
                maxOutputTokens: 2048, // Increased from 1000
            },
        });

        const analysisText = typeof analysisResult.text === 'function' ? analysisResult.text() : analysisResult.text;
        const diseaseInfo = parseJSON(analysisText);

        const treatmentResult = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: `You are an agricultural extension officer in Africa helping farmers treat crop diseases.
      
      Disease: ${diseaseInfo.disease}
      Severity: ${diseaseInfo.severity}
      Crop: ${input.cropType || 'General crop'}
      
      Provide treatment recommendations. Return ONLY this JSON structure with no other text:
      {
        "immediate": ["Specific action 1", "Specific action 2", "Specific action 3"],
        "preventive": ["Prevention step 1", "Prevention step 2", "Prevention step 3"],
        "organic": ["Organic method 1", "Organic method 2", "Organic method 3"],
        "estimatedLoss": "XX-XX% if untreated within X weeks",
        "timeline": "X-X weeks"
      }
      
      Make recommendations practical for smallholder farmers in Africa.
      Focus on locally available, affordable solutions.`,
            config: {
                temperature: 0.3,
                maxOutputTokens: 800,
            },
        });

        const treatmentText = typeof treatmentResult.text === 'function' ? treatmentResult.text() : treatmentResult.text;
        // Parse treatment or use fallback
        let treatment;
        if (!treatmentText || treatmentText.trim() === '') {
            treatment = {
                immediate: [
                    'Isolate affected plants to prevent spread',
                    'Remove severely infected parts carefully',
                    'Consult with local agricultural extension officer'
                ],
                preventive: [
                    'Use disease-resistant crop varieties',
                    'Practice crop rotation',
                    'Maintain proper field sanitation'
                ],
                organic: [
                    'Apply neem-based organic pesticides',
                    'Use compost to improve soil health',
                    'Encourage beneficial insects'
                ],
                estimatedLoss: '20-40% if left untreated',
                timeline: '2-4 weeks for recovery with treatment'
            };
        } else {
            treatment = parseJSON(treatmentText);
        }

        const targetLanguage = input.language || 'en';
        const targetLanguageName = getLanguageName(targetLanguage);
        
        // Translation debug info removed

        // Create the English text that would be translated
        const englishText = `Disease: ${diseaseInfo.disease || 'Unknown disease'}
Severity: ${diseaseInfo.severity || 'moderate'}

Key Actions:
${treatment.immediate ? treatment.immediate.slice(0, 3).join('\n') : 'No immediate actions available'}`;

        // If the target language is English, skip translation
        if (targetLanguage === 'en') {
            // Skipping translation for English
            return {
                disease: diseaseInfo.disease || 'Unknown disease',
                confidence: diseaseInfo.confidence || 0,
                severity: diseaseInfo.severity || 'moderate',
                treatment: {
                    immediate: treatment.immediate || ['Consult agricultural extension officer'],
                    preventive: treatment.preventive || ['Monitor crops regularly'],
                    organic: treatment.organic || ['Use organic methods when possible'],
                },
                estimatedLoss: treatment.estimatedLoss || 'Cannot estimate',
                localizedText: englishText,
                language: targetLanguage // Include the language in the response for debugging
            };
        }
        
        // For non-English languages, perform translation
        // Starting translation
        
        // Ensure we have a valid language code
        const safeTargetLanguage = ['en', 'sw', 'ha', 'am', 'yo'].includes(targetLanguage) ? targetLanguage : 'en';
        
        const translationPrompt = `You are an expert agricultural translator. 
Translate the following agricultural advice to ${targetLanguageName} (${safeTargetLanguage}).

IMPORTANT: Your response should be ONLY the translated text, with no additional explanations or formatting.

${englishText}

Guidelines:
- Use simple, farmer-friendly language
- Use relevant agricultural terms in ${targetLanguageName}
- Be clear and direct
- Keep the translation natural and conversational`;

        // Translation in progress
        
        const translationResult = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: translationPrompt,
            config: {
                temperature: 0.3,
            },
        });

        const translatedText = typeof translationResult.text === 'function' ? translationResult.text() : translationResult.text;

        return {
            disease: diseaseInfo.disease || 'Unknown disease',
            confidence: diseaseInfo.confidence || 0,
            severity: diseaseInfo.severity || 'moderate',
            treatment: {
                immediate: treatment.immediate || ['Consult agricultural extension officer'],
                preventive: treatment.preventive || ['Monitor crops regularly'],
                organic: treatment.organic || ['Use organic methods when possible'],
            },
            estimatedLoss: treatment.estimatedLoss || 'Cannot estimate',
            localizedText: translatedText,
        };
    }
);

// FIXED: Agricultural Chat Flow
const agriculturalChatFlow = defineFlow(
    {
        name: 'agriculturalChat',
        inputSchema: z.object({
            message: z.string(),
            history: z.array(z.object({
                role: z.enum(['user', 'assistant']),
                text: z.string(),
            })).optional(),
            farmerProfile: z.object({
                farmSize: z.string().optional(),
                crops: z.array(z.string()).optional(),
                location: z.string().optional(),
            }).optional(),
            language: z.string().default('en'),
        }),
        outputSchema: z.object({
            response: z.string(),
            followUpQuestions: z.array(z.string()).optional(),
        }),
    },
    async (input) => {
        try {
            // Build a simpler, more focused system prompt
            const farmerContext = input.farmerProfile ?
                `Farmer: ${input.farmerProfile.farmSize || 'small-scale'} farm, grows ${input.farmerProfile.crops?.join(', ') || 'mixed crops'}, ${input.farmerProfile.location || 'East Africa'}. ` : '';

            // Build conversation history as a simple string
            const conversationContext = (input.history || [])
                .slice(-3) // Only keep last 3 exchanges to save tokens
                .map(msg => `${msg.role === 'user' ? 'Farmer' : 'Advisor'}: ${msg.text}`)
                .join('\n');

            // Create a concise, single-turn prompt
            const fullPrompt = `You are an agricultural advisor in Africa helping smallholder farmers.

${farmerContext}${conversationContext ? '\nRecent conversation:\n' + conversationContext + '\n\n' : ''}
Farmer asks: ${input.message}

Provide practical farming advice in 2-3 short sentences. Be direct and actionable.`;

            // Generating response

            // Use a simpler generation call
            const response = await ai.generate({
                model: googleAI.model('gemini-2.5-flash'),
                prompt: fullPrompt,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 1024, // Increased token limit
                    topK: 40,
                    topP: 0.95,
                },
            });

            // Response received

            // Extract the response text - it's a property, not a function
            let responseText = typeof response.text === 'function' ? response.text() : response.text;

            // Handle empty responses
            if (!responseText || responseText.trim() === '') {
                console.error('Empty response received from model');

                if (response.finishReason === 'MAX_TOKENS' || response.finishReason === 'length') {
                    responseText = 'Your question requires a detailed answer. Could you make it more specific? For example, ask about a particular crop or farming activity.';
                } else if (response.finishReason === 'SAFETY') {
                    responseText = 'I cannot provide advice on that topic due to safety guidelines. Please ask about farming practices, crops, or agricultural techniques.';
                } else {
                    responseText = 'I apologize, I could not generate a response. Please try rephrasing your question or ask something more specific about farming.';
                }
            }

            // Generate simple follow-up questions based on the query
            const followUpQuestions = generateFollowUpQuestions(input.message);

            return {
                response: responseText,
                followUpQuestions,
            };

        } catch (error) {
            console.error('Error in chat flow:', error.message);

            // Return a helpful error message
            return {
                response: 'I apologize, but I encountered an error processing your question. Please try asking again, perhaps in a simpler way. For example: "When should I plant maize?" or "How do I control pests?"',
                followUpQuestions: [
                    'What are the best crops for my region?',
                    'How can I improve my soil?',
                    'What should I do about pests?'
                ],
            };
        }
    }
);

// Helper function to generate contextual follow-up questions
function generateFollowUpQuestions(userMessage: string): string[] {
    const message = userMessage.toLowerCase();

    // Context-aware follow-up questions
    if (message.includes('plant') || message.includes('seed')) {
        return [
            'What seed variety should I use?',
            'How should I prepare my land?',
            'When is the best time to plant?'
        ];
    } else if (message.includes('fertilizer') || message.includes('manure')) {
        return [
            'How much fertilizer do I need?',
            'What organic alternatives exist?',
            'When should I apply fertilizer?'
        ];
    } else if (message.includes('pest') || message.includes('disease')) {
        return [
            'How do I identify this pest?',
            'What organic treatments work?',
            'How can I prevent this problem?'
        ];
    } else if (message.includes('water') || message.includes('irrigation')) {
        return [
            'How much water do my crops need?',
            'What irrigation method is best?',
            'How often should I water?'
        ];
    } else if (message.includes('harvest') || message.includes('sell')) {
        return [
            'When should I harvest?',
            'How do I store my harvest?',
            'Where can I get better prices?'
        ];
    }

    // Default follow-up questions
    return [
        'What are the best crops for my region?',
        'How can I improve my yield?',
        'What should I watch out for?'
    ];
}

// Weather Advisory Flow (unchanged)
const weatherAdvisoryFlow = defineFlow(
    {
        name: 'weatherAdvisory',
        inputSchema: z.object({
            location: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }),
            cropType: z.string().optional(),
            activity: z.enum(['planting', 'fertilizing', 'spraying', 'harvesting']),
        }),
        outputSchema: z.object({
            recommendation: z.string(),
            optimalTiming: z.string(),
            risks: z.array(z.string()),
            weatherSummary: z.string(),
        }),
    },
    async (input) => {
        const weatherData = await fetchWeatherData(input.location);

        const advisoryResult = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: `You are a climate-smart agriculture advisor.

Weather Forecast:
${JSON.stringify(weatherData, null, 2)}

Activity: ${input.activity}
Crop: ${input.cropType || 'general farming'}

Provide practical timing advice in JSON format:
{
  "recommendation": "clear yes/no/wait recommendation",
  "optimalTiming": "specific dates or timeframe",
  "risks": ["weather-related risks to consider"],
  "reasoning": "why this timing is best"
}

Consider:
- Rainfall patterns
- Temperature
- Soil moisture needs
- Activity-specific requirements`,
            config: {
                temperature: 0.3,
            },
        });

        const advisory = parseJSON(typeof advisoryResult.text === 'function' ? advisoryResult.text() : advisoryResult.text);

        return {
            ...advisory,
            weatherSummary: formatWeatherSummary(weatherData),
        };
    }
);

// ======================
// API ENDPOINTS
// ======================

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/analyze-disease', upload.single('image'), async (req, res) => {
    // Disease detection request received

    try {
        if (!req.file) {
            console.error('No image file in request');
            return res.status(400).json({ error: 'No image provided' });
        }

        const imageBase64 = req.file.buffer.toString('base64');
        const cropType = req.body.cropType;
        const language = req.body.language || 'en';
        const location = req.body.location ? JSON.parse(req.body.location) : undefined;

        // Run the actual disease detection flow
        const result = await runFlow(diseaseDetectionFlow, {
            imageBase64,
            cropType,
            language,
            location,
        });

        // Analysis complete
        res.json(result);
    } catch (error: any) {
        console.error('Error analyzing disease:', error.message);
        res.status(500).json({
            error: 'Failed to analyze image',
            details: error.message
        });
    }
});

// FIXED: Chat endpoint
app.post('/api/chat', async (req, res) => {
    // Chat request received

    try {
        const { message, history, farmerProfile, language } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'No message provided' });
        }

        // Processing chat message

        // Run the chat flow
        const result = await runFlow(agriculturalChatFlow, {
            message,
            history: history || [],
            farmerProfile,
            language: language || 'en',
        });

        // Chat response generated
        res.json(result);
    } catch (error: any) {
        console.error('Error in chat:', error.message);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
});

app.post('/api/weather-advisory', async (req, res) => {
    try {
        const { location, cropType, activity } = req.body;

        if (!location || !activity) {
            return res.status(400).json({ error: 'Location and activity required' });
        }

        const result = await runFlow(weatherAdvisoryFlow, {
            location,
            cropType,
            activity,
        });

        res.json(result);
    } catch (error: any) {
        console.error('Weather advisory error:', error.message);
        res.status(500).json({
            error: 'Failed to get weather advisory',
            details: error.message
        });
    }
});

// ======================
// HELPER FUNCTIONS
// ======================

function parseJSON(text: string): any {
    try {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Try to extract JSON if surrounded by other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        // Check if JSON seems incomplete (ends with : or ,)
        if (cleaned.endsWith(':') || cleaned.endsWith(',')) {
            console.warn('Incomplete JSON detected, attempting to fix...');
            // Try to close the JSON properly
            cleaned = cleaned.replace(/[:,]\s*$/, '') + '}';
        }

        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (error) {
        console.error('Failed to parse JSON:', text.substring(0, 200));
        console.error('Parse error:', error.message);

        // Try to extract whatever we can from incomplete JSON
        try {
            // Attempt to extract fields manually for disease info
            const diseaseMatch = text.match(/"disease":\s*"([^"]+)"/);
            const confidenceMatch = text.match(/"confidence":\s*(\d+)/);
            const severityMatch = text.match(/"severity":\s*"([^"]+)"/);

            if (diseaseMatch) {
                return {
                    disease: diseaseMatch[1],
                    confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
                    severity: severityMatch ? severityMatch[1] : 'moderate',
                    affectedArea: '10-20%',
                    symptoms: ['Visible damage on plant', 'Requires closer inspection']
                };
            }
        } catch (extractError) {
            console.error('Failed to extract fields:', extractError.message);
        }

        // Return a safe default structure based on context
        if (text.toLowerCase().includes('disease') || text.toLowerCase().includes('symptom')) {
            return {
                disease: 'Disease detected - analysis incomplete',
                confidence: 60,
                severity: 'moderate',
                affectedArea: 'Unknown',
                symptoms: ['Consult agricultural officer for detailed diagnosis']
            };
        } else if (text.toLowerCase().includes('treatment') || text.toLowerCase().includes('action')) {
            return {
                immediate: ['Isolate affected plants', 'Consult agricultural extension officer'],
                preventive: ['Monitor crops regularly', 'Maintain good field hygiene'],
                organic: ['Use organic compost', 'Practice crop rotation'],
                estimatedLoss: 'Cannot estimate without proper diagnosis',
                timeline: 'Varies depending on condition'
            };
        } else {
            return {
                error: 'Failed to parse response',
                rawText: text.substring(0, 200)
            };
        }
    }
}

function getLanguageName(code: string): string {
    const languages: Record<string, string> = {
        en: 'English',
        sw: 'Swahili',
        ha: 'Hausa',
        am: 'Amharic',
        yo: 'Yoruba',
    };
    return languages[code] || 'English';
}

async function fetchWeatherData(location: { latitude: number; longitude: number }) {
    return {
        current: {
            temperature: 25,
            humidity: 70,
            conditions: 'partly cloudy',
            rainfall: 0,
        },
        forecast: [
            { date: '2024-11-16', temp: 26, rainfall: 10, conditions: 'light rain' },
            { date: '2024-11-17', temp: 24, rainfall: 40, conditions: 'moderate rain' },
            { date: '2024-11-18', temp: 27, rainfall: 5, conditions: 'mostly sunny' },
        ],
    };
}

function formatWeatherSummary(data: any): string {
    return `Current: ${data.current.temperature}°C, ${data.current.conditions}. 
          Next 3 days: ${data.forecast.map((d: any) =>
        `${d.date}: ${d.temp}°C, ${d.rainfall}mm rain`
    ).join('; ')}`;
}

app.listen(PORT, () => {
    console.log(`🌾 SmartFarm API server running on port ${PORT}`);
    console.log(`🚀 Genkit flows initialized`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

export default app;
