'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Cloud, TrendingUp, Leaf, Send, Volume2, AlertCircle, CheckCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface DiseaseAnalysis {
    disease: string;
    confidence: number;
    severity: 'mild' | 'moderate' | 'severe';
    treatment: {
        immediate: string[];
        preventive: string[];
        organic: string[];
    };
    estimatedLoss: string;
    localizedText: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    isVoice?: boolean;
    timestamp: Date;
}

interface AnalysisError {
    message: string;
    isRetryable: boolean;
}

// Define color & language types
type ColorType = 'green' | 'blue' | 'purple' | 'yellow';
type LanguageCode = 'en' | 'sw' | 'ha' | 'am' | 'yo';

const languageNames: Record<LanguageCode, string> = {
    en: 'English',
    sw: 'Swahili',
    ha: 'Hausa',
    am: 'Amharic',
    yo: 'Yoruba',
};

export default function SmartFarmDashboard() {
    const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'voice' | 'weather' | 'market'>('home');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<AnalysisError | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [language, setLanguage] = useState<LanguageCode>('en');
    const languageRef = useRef(language);
    
    // Keep the ref in sync with state
    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Handle language change
    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value as LanguageCode;
        setLanguage(newLang);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Analyze crop disease
    const analyzeCropImage = async (file: File, retryCount = 0) => {
        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const currentLanguage = languageRef.current;
            
            // Create form data and append all fields
            const formData = new FormData();
            formData.append('image', file);
            formData.append('language', currentLanguage);
            formData.append('cropType', 'general');
            
            // Send the request
            const response = await fetch('http://localhost:3001/api/analyze-disease', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let the browser set it with the correct boundary
            });
            
            // Response received

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 503 || response.status === 429) {
                    // Service Unavailable or Too Many Requests
                    if (retryCount < 2) {
                        // Wait 2 seconds before retrying
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return analyzeCropImage(file, retryCount + 1);
                    }
                    throw new Error('The AI service is currently overloaded. Please try again in a few minutes.');
                }

                throw new Error(errorData.message || 'Failed to analyze image. Please try again.');
            }

            const data: DiseaseAnalysis = await response.json();
            setAnalysis(data);
            // Don't set activeTab here since it's already set in handleImageUpload
        } catch (error) {
            console.error('Error analyzing image');

            const errorMessage = error instanceof Error
                ? error.message
                : 'An unexpected error occurred. Please try again.';

            setAnalysisError({
                message: errorMessage,
                isRetryable: !errorMessage.includes('overloaded')
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Switch to scan tab immediately to show loading state
        setActiveTab('scan');
        setAnalysis(null);
        setAnalysisError(null);

        // Preview image
        const reader = new FileReader();
        reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Analyze image
        analyzeCropImage(file);
    };

    // Send chat message
    const sendMessage = async () => {
        if (!inputText.trim() || isSending) return;

        const userMessage: ChatMessage = {
            role: 'user',
            text: inputText,
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsSending(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputText,
                    history: chatMessages,
                }),
            });

            if (!response.ok) throw new Error('Chat failed');

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                text: data.response,
                timestamp: new Date(),
            };

            setChatMessages(prev => [...prev, assistantMessage]);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Failed to send message');
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    // Handle voice recording
    const toggleVoiceRecording = async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setIsRecording(true);

                // Simulate voice recording
                setTimeout(() => {
                    setIsRecording(false);
                    setInputText("When should I plant maize?");
                }, 3000);
            } catch (error) {
                console.error('Microphone access error');
                alert('Could not access microphone. Please check permissions.');
            }
        } else {
            setIsRecording(false);
        }
    };

    // Add language selector component
    const LanguageSelector = () => (
        <div className="fixed top-4 right-4 z-50">
            <div className="flex items-center gap-3">
                <select 
                    value={language}
                    onChange={handleLanguageChange}
                    className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold border-0 text-black"
                >
                    <option value="en">🇬🇧 English</option>
                    <option value="sw">🇰🇪 Swahili</option>
                    <option value="ha">🇳🇬 Hausa</option>
                    <option value="am">🇪🇹 Amharic</option>
                    <option value="yo">🇳🇬 Yoruba</option>
                </select>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 relative">
            {/* Header */}
            <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Leaf className="w-10 h-10" />
                            <div>
                                <h1 className="text-2xl font-bold">SmartFarm Advisor</h1>
                                <p className="text-sm text-green-100">Your AI Farming Assistant</p>
                            </div>
                            <LanguageSelector />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 pb-24">
                {activeTab === 'home' && <HomeView
                    onScanClick={() => fileInputRef.current?.click()}
                    onVoiceClick={() => setActiveTab('voice')}
                    onWeatherClick={() => setActiveTab('weather')}
                    onMarketClick={() => setActiveTab('market')}
                />}

                {activeTab === 'scan' && (
                    <DiseaseAnalysisView
                        selectedImage={selectedImage}
                        analysis={analysis}
                        isAnalyzing={isAnalyzing}
                        error={analysisError}
                        onRetry={() => fileInputRef.current?.click()}
                        onBack={() => setActiveTab('home')}
                        language={language}
                    />
                )}

                {activeTab === 'voice' && (
                    <VoiceAdvisorView
                        chatMessages={chatMessages}
                        inputText={inputText}
                        setInputText={setInputText}
                        isRecording={isRecording}
                        isSending={isSending}
                        onSendMessage={sendMessage}
                        onToggleRecording={toggleVoiceRecording}
                        chatEndRef={chatEndRef}
                    />
                )}

                {activeTab === 'weather' && <WeatherView />}
                {activeTab === 'market' && <MarketView />}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
                <div className="container mx-auto px-4">
                    <div className="flex justify-around py-3">
                        <NavButton
                            icon={Leaf}
                            label="Home"
                            active={activeTab === 'home'}
                            onClick={() => setActiveTab('home')}
                        />
                        <NavButton
                            icon={Camera}
                            label="Scan"
                            active={activeTab === 'scan'}
                            onClick={() => fileInputRef.current?.click()}
                        />
                        <NavButton
                            icon={Mic}
                            label="Voice"
                            active={activeTab === 'voice'}
                            onClick={() => setActiveTab('voice')}
                        />
                        <NavButton
                            icon={Cloud}
                            label="Weather"
                            active={activeTab === 'weather'}
                            onClick={() => setActiveTab('weather')}
                        />
                        <NavButton
                            icon={TrendingUp}
                            label="Market"
                            active={activeTab === 'market'}
                            onClick={() => setActiveTab('market')}
                        />
                    </div>
                </div>
            </nav>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
            />
        </div>
    );
}

// Navigation Button Component with proper types
interface NavButtonProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    onClick: () => void;
}

function NavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                active ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:text-green-600'
            }`}
        >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-semibold">{label}</span>
        </button>
    );
}

// Home View Component with proper types
interface HomeViewProps {
    onScanClick: () => void;
    onVoiceClick: () => void;
    onWeatherClick: () => void;
    onMarketClick: () => void;
}

function HomeView({ onScanClick, onVoiceClick, onWeatherClick, onMarketClick }: HomeViewProps) {
    return (
        <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-2">Welcome back, Farmer!</h2>
                <p className="text-green-100 text-lg">Ready to help your farm thrive today</p>
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                        <div className="text-2xl font-bold">5</div>
                        <div className="text-sm text-green-100">Scans this week</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-sm text-green-100">Questions asked</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                        <div className="text-2xl font-bold">+23%</div>
                        <div className="text-sm text-green-100">Yield increase</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <ActionCard
                        icon={Camera}
                        title="Scan Crop"
                        description="Detect diseases instantly"
                        color="green"
                        onClick={onScanClick}
                    />
                    <ActionCard
                        icon={Mic}
                        title="Ask Question"
                        description="Voice or text chat"
                        color="blue"
                        onClick={onVoiceClick}
                    />
                    <ActionCard
                        icon={Cloud}
                        title="Weather Forecast"
                        description="7-day predictions"
                        color="purple"
                        onClick={onWeatherClick}
                    />
                    <ActionCard
                        icon={TrendingUp}
                        title="Market Prices"
                        description="Latest crop prices"
                        color="yellow"
                        onClick={onMarketClick}
                    />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    <ActivityItem
                        icon={CheckCircle}
                        title="Maize disease detected"
                        description="MLN identified - treatment provided"
                        time="2 hours ago"
                        color="green"
                    />
                    <ActivityItem
                        icon={Volume2}
                        title="Asked about planting time"
                        description="Optimal window: Nov 20-25"
                        time="Yesterday"
                        color="blue"
                    />
                    <ActivityItem
                        icon={TrendingUp}
                        title="Market price alert"
                        description="Tomato prices up 15%"
                        time="2 days ago"
                        color="yellow"
                    />
                </div>
            </div>
        </div>
    );
}

// ActionCard with proper type definitions
interface ActionCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    color: ColorType;
    onClick: () => void;
}

function ActionCard({ icon: Icon, title, description, color, onClick }: ActionCardProps) {
    const colorClasses: Record<ColorType, string> = {
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-cyan-600',
        purple: 'from-purple-500 to-pink-600',
        yellow: 'from-yellow-500 to-orange-600',
    };

    return (
        <button
            onClick={onClick}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
        >
            <div className={`bg-gradient-to-r ${colorClasses[color]} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 text-lg mb-1">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
        </button>
    );
}

// ActivityItem with proper types
interface ActivityItemProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    time: string;
    color: ColorType;
}

function ActivityItem({ icon: Icon, title, description, time, color }: ActivityItemProps) {
    const iconColors: Record<ColorType, string> = {
        green: 'text-green-600 bg-green-100',
        blue: 'text-blue-600 bg-blue-100',
        yellow: 'text-yellow-600 bg-yellow-100',
        purple: 'text-purple-600 bg-purple-100',
    };

    return (
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className={`p-2 rounded-lg ${iconColors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <p className="text-sm text-gray-600">{description}</p>
                <p className="text-xs text-gray-500 mt-1">{time}</p>
            </div>
        </div>
    );
}

// Disease Analysis View Component
interface DiseaseAnalysisViewProps {
    selectedImage: string | null;
    analysis: DiseaseAnalysis | null;
    isAnalyzing: boolean;
    error?: AnalysisError | null;
    onRetry?: () => void;
    onBack?: () => void;
    language: LanguageCode;
}

function DiseaseAnalysisView({ selectedImage, analysis, isAnalyzing, error, onRetry, onBack, language }: DiseaseAnalysisViewProps) {
    if (isAnalyzing) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-16 h-16 text-green-600 animate-spin mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyzing your crop...</h3>
                    <p className="text-gray-600">This will take just a moment</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-col items-center text-center py-12 px-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Temporarily Unavailable</h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                        {error.message || 'We\'re experiencing high demand for our AI analysis service. '}
                        {error.isRetryable ? 'Please try again in a moment.' : 'Please try again later.'}
                    </p>

                    {error.isRetryable && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try Again
                        </button>
                    )}

                    {onBack && (
                        <button
                            onClick={onBack}
                            className="mt-4 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No scan yet</h3>
                <p className="text-gray-600">Take a photo of your crop to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {selectedImage && (
                    <div className="relative h-64 bg-gray-100">
                        <Image
                            src={selectedImage}
                            alt="Crop scan"
                            fill
                            className="object-cover"
                        />
                    </div>
                )}

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <div>
                            <h3 className="text-xl font-bold text-red-800">{analysis.disease}</h3>
                            <p className="text-sm text-red-600">Confidence: {analysis.confidence}%</p>
                        </div>
                        <div className="px-6 py-2 bg-yellow-500 text-white rounded-full font-bold uppercase text-sm">
                            {analysis.severity}
                        </div>
                    </div>

                    <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-800 mb-1">Estimated Loss if Untreated</h4>
                                <p className="text-red-700">{analysis.estimatedLoss}</p>
                            </div>
                        </div>
                    </div>

                    <TreatmentSection
                        title="Immediate Actions (Next 24 Hours)"
                        items={analysis.treatment.immediate}
                        color="green"
                    />

                    <TreatmentSection
                        title="Preventive Measures"
                        items={analysis.treatment.preventive}
                        color="blue"
                    />

                    <TreatmentSection
                        title="Organic Alternatives"
                        items={analysis.treatment.organic}
                        color="purple"
                    />

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Volume2 className="w-5 h-5" />
                            Translation ({languageNames[language]})
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{analysis.localizedText}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                            Find Agro-Dealers
                        </button>
                        <button className="bg-white border-2 border-green-600 text-green-600 py-4 px-6 rounded-xl font-semibold hover:bg-green-50 transition-colors">
                            Save Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// TreatmentSection with proper types
interface TreatmentSectionProps {
    title: string;
    items: string[];
    color: ColorType;
}

function TreatmentSection({ title, items, color }: TreatmentSectionProps) {
    const colorClasses: Record<ColorType, string> = {
        green: 'bg-green-50 border-green-200 text-green-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
        purple: 'bg-purple-50 border-purple-200 text-purple-800',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };

    const bulletColors: Record<ColorType, string> = {
        green: 'text-green-600',
        blue: 'text-blue-600',
        purple: 'text-purple-600',
        yellow: 'text-yellow-600',
    };

    return (
        <div className={`${colorClasses[color]} p-6 rounded-xl border-2`}>
            <h4 className="font-bold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {title}
            </h4>
            <ul className="space-y-3">
                {items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className={`${bulletColors[color]} text-xl flex-shrink-0`}>•</span>
                        <span className="text-gray-700">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Voice Advisor View Component with proper types
interface VoiceAdvisorViewProps {
    chatMessages: ChatMessage[];
    inputText: string;
    setInputText: (text: string) => void;
    isRecording: boolean;
    isSending: boolean;
    onSendMessage: () => void;
    onToggleRecording: () => void;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
}

function VoiceAdvisorView({ chatMessages, inputText, setInputText, isRecording, isSending, onSendMessage, onToggleRecording, chatEndRef }: VoiceAdvisorViewProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">AI Farm Advisor</h3>

                <div className="flex flex-col items-center mb-8">
                    <button
                        onClick={onToggleRecording}
                        disabled={isSending}
                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-lg ${
                            isRecording
                                ? 'bg-red-500 animate-pulse scale-110'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105'
                        } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Mic className="w-16 h-16 text-white" />
                    </button>
                    <p className="mt-4 text-gray-600 font-medium">
                        {isRecording ? '🎤 Listening... Speak now' : 'Tap to speak in any language'}
                    </p>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto mb-6 px-2">
                    {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="mb-4">No messages yet. Ask me anything!</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    'When should I plant?',
                                    'Weather forecast',
                                    'Best fertilizer?',
                                    'Market prices'
                                ].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setInputText(q)}
                                        className="p-3 bg-green-50 rounded-lg text-sm hover:bg-green-100 transition-colors font-medium"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        chatMessages.map((msg: ChatMessage, i: number) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    {msg.isVoice && (
                                        <div className="flex items-center gap-2 mb-2 opacity-75">
                                            <Volume2 className="w-4 h-4" />
                                            <span className="text-xs">Voice message</span>
                                        </div>
                                    )}
                                    <p className="leading-relaxed">{msg.text}</p>
                                    <p className="text-xs opacity-75 mt-2">
                                        {msg.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="flex gap-3">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isSending && onSendMessage()}
                        placeholder="Type your question here..."
                        disabled={isSending || isRecording}
                        className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={onSendMessage}
                        disabled={!inputText.trim() || isSending || isRecording}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSending ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Send className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function WeatherView() {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Weather Forecast</h3>
            <p className="text-gray-600">Weather forecast feature coming soon...</p>
        </div>
    );
}

function MarketView() {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Market Prices</h3>
            <p className="text-gray-600">Market prices feature coming soon...</p>
        </div>
    );
}

