import React, { useEffect, useRef, useState } from 'react';
import { Send, Sun, Moon, Brain, Smile, Frown, Meh, Heart, Mic, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

declare global {
  interface Window {
    AWS: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

let lexruntime: any;

interface Message {
  sender: 'You' | 'Lex' | 'GPT';
  content: string;
  mood?: string;
}

interface UserSession {
  userId: string;
  userName: string;
}

const moodEmojis = [
  { emoji: '😊', icon: Smile, label: 'Happy', color: 'text-yellow-500' },
  { emoji: '😢', icon: Frown, label: 'Sad', color: 'text-blue-500' },
  { emoji: '😐', icon: Meh, label: 'Neutral', color: 'text-gray-500' },
  { emoji: '❤️', icon: Heart, label: 'Loved', color: 'text-red-500' },
];

const MoodDashboardDialog = ({ userId, darkMode }: { userId: string; darkMode: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => setIsOpen(false);
  const openModal = () => {
    setIsOpen(true);
    fetchMoodHistory();
  };

  const fetchMoodHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8000/mood-history?user_id=${userId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setMoodData(data.data);
      } else {
        setError(data.message || 'Failed to load mood history');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: moodData.map(item => new Date(item.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: moodData.map(item => {
          switch(item.sentiment.toLowerCase()) {
            case 'positive': return item.confidence;
            case 'negative': return -item.confidence;
            default: return 0;
          }
        }),
        borderColor: darkMode ? '#60a5fa' : '#2563eb',
        backgroundColor: darkMode ? 'rgba(96, 165, 250, 0.5)' : 'rgba(37, 99, 235, 0.5)',
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: darkMode ? '#f3f4f6' : '#111827',
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const data = moodData[context.dataIndex];
            return `Sentiment: ${data.sentiment} (${(data.confidence * 100).toFixed(1)}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        min: -1,
        max: 1,
        ticks: {
          color: darkMode ? '#f3f4f6' : '#111827',
          callback: (value: number) => {
            if (value === 1) return 'Positive';
            if (value === -1) return 'Negative';
            if (value === 0) return 'Neutral';
            return '';
          }
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        ticks: {
          color: darkMode ? '#f3f4f6' : '#111827',
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }
      }
    }
  };

  const positiveCount = moodData.filter(item => item.sentiment.toLowerCase() === 'positive').length;
  const negativeCount = moodData.filter(item => item.sentiment.toLowerCase() === 'negative').length;
  const neutralCount = moodData.filter(item => item.sentiment.toLowerCase() === 'neutral').length;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openModal}
        className={`p-2 rounded-lg flex items-center gap-2 ${
          darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        <TrendingUp size={18} />
        <span className="hidden sm:inline">Mood Trends</span>
      </motion.button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-2xl transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className={`text-lg font-medium leading-6 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      Your Mood Trends
                    </Dialog.Title>
                    <button
                      type="button"
                      className={`p-1 rounded-full ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      onClick={closeModal}
                    >
                      <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-500'} />
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : error ? (
                    <div className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700' : 'bg-red-50'
                    } text-red-500`}>
                      {error}
                    </div>
                  ) : moodData.length === 0 ? (
                    <div className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700' : 'bg-blue-50'
                    } text-center`}>
                      No mood data available yet. Start chatting to see your mood trends!
                    </div>
                  ) : (
                    <>
                      <div className="h-64 mb-6">
                        <Line data={chartData} options={options} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-3 rounded-lg ${
                          darkMode ? 'bg-gray-700' : 'bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-300' : 'text-green-800'
                            }`}>Positive</span>
                            <span className={`text-lg font-bold ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {positiveCount}
                            </span>
                          </div>
                          <div className="h-2 mt-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: `${(positiveCount / moodData.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          darkMode ? 'bg-gray-700' : 'bg-blue-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-300' : 'text-blue-800'
                            }`}>Neutral</span>
                            <span className={`text-lg font-bold ${
                              darkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {neutralCount}
                            </span>
                          </div>
                          <div className="h-2 mt-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full" 
                              style={{ width: `${(neutralCount / moodData.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          darkMode ? 'bg-gray-700' : 'bg-red-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-300' : 'text-red-800'
                            }`}>Negative</span>
                            <span className={`text-lg font-bold ${
                              darkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {negativeCount}
                            </span>
                          </div>
                          <div className="h-2 mt-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-red-500 rounded-full" 
                              style={{ width: `${(negativeCount / moodData.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessageInput(prev => prev ? `${prev} ${transcript}` : transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }

    if (window.AWS) {
      window.AWS.config.update({
        region: 'us-east-1',
        credentials: new window.AWS.CognitoIdentityCredentials({
          IdentityPoolId: 'us-east-1:516583e2-4f0d-47fb-84b4-2775ebb0fbed',
        }),
      });
      lexruntime = new window.AWS.LexRuntimeV2();
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [messages]);

  // Add this function to generate consistent user IDs from usernames
  const generateUserId = (userName: string) => {
    // Simple hash function to create consistent user IDs
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      const char = userName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `user_${Math.abs(hash)}`;
  };

  // Modify the handleLogin function to load previous chat history
  const handleLogin = async (userName: string) => {
    const userId = generateUserId(userName);
    
    try {
      const response = await fetch(`http://localhost:8000/load-chat?user_id=${userId}`);
      const data = await response.json();
      
      setUserSession({ userId, userName });
      
      if (data.status === 'success') {
        // Reconstruct conversation history
        const loadedMessages: Message[] = [];
        const loadedConversation: { role: 'user' | 'assistant'; content: string }[] = [];
        
        // Load chat history
        data.chat_history.forEach((entry: any) => {
          loadedMessages.push({ sender: 'You', content: entry.user });
          loadedConversation.push({ role: 'user', content: entry.user });
          
          loadedMessages.push({ sender: 'GPT', content: entry.bot });
          loadedConversation.push({ role: 'assistant', content: entry.bot });
        });
        
        setMessages(loadedMessages);
        conversationHistory.current = loadedConversation;
        
        // Analyze mood context for personalized welcome
        const positiveCount = data.mood_context.filter((m: any) => m.sentiment === 'POSITIVE').length;
        const negativeCount = data.mood_context.filter((m: any) => m.sentiment === 'NEGATIVE').length;
        
        let welcomeMessage = `Welcome back ${userName}! 👋 `;
        if (positiveCount > negativeCount) {
          welcomeMessage += "I remember our positive conversations. How are you doing today?";
        } else if (negativeCount > positiveCount) {
          welcomeMessage += "I'm here to support you. How are you feeling today?";
        } else {
          welcomeMessage += "How are you feeling today?";
        }
        
        appendMessage('GPT', welcomeMessage);
      } else {
        setMessages([]);
        conversationHistory.current = [];
        appendMessage('GPT', `Hi ${userName}! 👋 I'm here to listen and support you. How are you feeling today?`);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
      setUserSession({ userId, userName });
      appendMessage('GPT', `Hi ${userName}! 👋 I'm here to listen and support you. How are you feeling today?`);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    setMessages([]);
    conversationHistory.current = [];
  };

  const startListening = () => {
    if (speechSupported && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (speechSupported && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const formatMessage = (msg: string) => {
    return msg
      .replace(/(?:\r\n|\r|\n)/g, '<br>')
      .replace(/\\n/g, '<br>');
  };

  const appendMessage = (sender: Message['sender'], content: string, mood?: string) => {
    setMessages((prev) => [...prev, { sender, content, mood }]);
  };

  const callGPT = async () => {
    if (!userSession) return;
    
    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: conversationHistory.current, 
          user_id: userSession.userId,
          user_name: userSession.userName,
          mood: selectedMood 
        }),
      });

      const data = await res.json();
      appendMessage('GPT', data.gpt_reply);
      conversationHistory.current.push({ role: 'assistant', content: data.gpt_reply });
    } catch (err) {
      console.error("GPT Error:", err);
      const fallback = "Hmm… I couldn't respond right now. Try again?";
      appendMessage('GPT', fallback);
      conversationHistory.current.push({ role: 'assistant', content: fallback });
    } finally {
      setIsLoading(false);
      setSelectedMood(undefined);
    }
  };

  // Modify the sendMessage function in App.tsx
  const sendMessage = () => {
    if (!userSession || !messageInput.trim() || isLoading || !lexruntime) return;

    setIsLoading(true);
    appendMessage('You', messageInput, selectedMood);
    conversationHistory.current.push({ role: 'user', content: messageInput });
    setMessageInput('');
    inputRef.current?.focus();

    const params = {
      botId: 'LK6WCZTBRL',
      botAliasId: 'TSTALIASID',
      localeId: 'en_US',
      sessionId: userSession.userId,
      text: messageInput,
    };

    lexruntime.recognizeText(params, async function (err: any, data: any) {
      if (err) {
        console.error("Lex error:", err);
        await callGPT();
        return;
      }

      const intentName = data.sessionState?.intent?.name;
      const lexMsg = data.messages?.[0]?.content || '';

      if (intentName && intentName !== 'FallbackIntent' && lexMsg) {
        appendMessage('Lex', lexMsg);
        conversationHistory.current.push({ role: 'assistant', content: lexMsg });
        
        // Save mood data for Lex responses too
        await saveMoodData(userSession.userId, messageInput, lexMsg);
        
        setIsLoading(false);
      } else {
        await callGPT();
      }
    });
  };

  // Add this new function to save mood data
  const saveMoodData = async (userId: string, userInput: string, botResponse: string) => {
    try {
      await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: conversationHistory.current,
          user_id: userId,
          user_name: userSession?.userName || 'Anonymous',
          mood: selectedMood,
          user_input: userInput,
          bot_response: botResponse
        }),
      });
    } catch (err) {
      console.error("Error saving mood data:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-blue-50 to-purple-50'} p-4 md:p-6`}
    >
      {!userSession ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`max-w-md mx-auto mt-20 p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="text-center mb-6">
            <Brain className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-300 mb-4" />
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
              Mental Health Assistant
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Please enter your name to start your session
            </p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const userName = formData.get('userName') as string;
            if (userName.trim()) {
              handleLogin(userName.trim());
            }
          }}>
            <input
              name="userName"
              type="text"
              placeholder="Your name"
              required
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-800'
              }`}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Session
            </motion.button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          layout
          className={`max-w-4xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden backdrop-blur-lg bg-opacity-95`}
        >
          <motion.div
            layout
            className={`border-b px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-blue-100 dark:bg-blue-900"
              >
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </motion.div>
              <div>
                <motion.h1
                  layout
                  className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}
                >
                  Welcome, {userSession.userName}
                </motion.h1>
                <motion.p
                  layout
                  className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}
                >
                  Share your thoughts in a safe, judgment-free space
                </motion.p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MoodDashboardDialog userId={userSession.userId} darkMode={darkMode} />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Logout
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-600'} hover:opacity-80 transition-all`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>
            </div>
          </motion.div>

          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=2000&q=80"
              alt="Banner"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {showVideo ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg"
                >
                  <video
                    ref={videoRef}
                    src="/bot-animation.mp4"
                    autoPlay
                    muted={false}
                    playsInline
                    onEnded={() => setShowVideo(false)}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (isSoundPlaying) return;
                    
                    setIsSoundPlaying(true);
                    setShowVideo(true);
                    
                    const audio = new Audio('/bot-sound.mp3');
                    audio.play().catch(e => console.log("Audio play failed:", e));
                    
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(e => console.log("Video play failed:", e));
                    }
                    
                    audio.onended = () => {
                      setIsSoundPlaying(false);
                    };
                  }}
                  className="cursor-pointer"
                >
                  <img
                    src="./Bot.png"
                    alt="Bot"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                  />
                </motion.div>
              )}
            </div>
          </div>

          <div
            ref={chatBoxRef}
            className={`h-[400px] overflow-y-auto p-6 space-y-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
          >
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap shadow-lg ${
                      msg.sender === 'You'
                        ? 'bg-blue-600 text-white'
                        : darkMode
                          ? 'bg-gray-800 text-gray-100 border border-gray-700'
                          : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {msg.mood && (
                      <div className="mb-1 text-sm opacity-75">
                        Feeling: {msg.mood}
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'
                  } shadow-lg`}>
                    <div className="flex space-x-2">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 rounded-full bg-blue-600"
                      />
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-blue-600"
                      />
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-blue-600"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`px-4 py-2 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-center space-x-4">
              {moodEmojis.map((mood) => (
                <motion.button
                  key={mood.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedMood(mood.label)}
                  className={`p-2 rounded-full ${
                    selectedMood === mood.label
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <mood.icon className={`w-6 h-6 ${mood.color}`} />
                </motion.button>
              ))}
            </div>
          </div>

          <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex gap-2">
              <motion.input
                layout
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={speechSupported ? "Type or speak your message..." : "Type your message..."}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-800'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {speechSupported && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`p-2 rounded-lg ${
                    isListening 
                      ? 'bg-red-600 text-white animate-pulse' 
                      : darkMode 
                        ? 'bg-gray-700 text-white' 
                        : 'bg-gray-200 text-gray-800'
                  } transition-colors`}
                >
                  <Mic size={20} />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={isLoading || !messageInput.trim()}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Send size={20} className={isLoading ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">Send</span>
              </motion.button>
            </div>
            {isListening && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-center text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                Listening... Speak now
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default App;