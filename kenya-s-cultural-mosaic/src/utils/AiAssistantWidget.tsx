import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePageContext } from "@/hooks/usePageContext";
import { useTextSelection } from "@/hooks/useTextSelection";
import { createAiActions } from "@/utils/aiActions";
import { askAI } from "@/utils/aiServices";

import { 
  Mic, 
  Volume2, 
  Square, 
  Bot,
  Loader2,
  X,
  Send,
  MessageCircle
} from "lucide-react";


type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type ConversationStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'waiting';

// Generate persistent conversation ID
function getPersistentConversationId(): string {
  const storageKey = "ai_conversation_id";
  let id = localStorage.getItem(storageKey);
  
  if (!id) {
    // Generate unique ID based on browser data
    const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute buckets
    const randomStr = Math.random().toString(36).substring(2, 9);
    id = `conv_${timestamp}_${randomStr}`;
    localStorage.setItem(storageKey, id);
  }
  
  return id;
}

const getEnhancedAudioConstraints = () => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

const extractCommunityFromPath = (pathname: string): string | null => {
  // Match /community/:id pattern and extract the community name
  const communityMatch = pathname.match(/\/community\/([^/]+)/);
  if (communityMatch && communityMatch[1]) {
    // Capitalize first letter, handle URL encoding
    const decoded = decodeURIComponent(communityMatch[1]);
    return decoded.charAt(0).toUpperCase() + decoded.slice(1).toLowerCase();
  }
  return null;
};

const getCurrentPageContext = (): { path: string; fullUrl: string; title: string; community: string | null } => {
  const pathname = window.location.pathname;
  const community = extractCommunityFromPath(pathname);
  
  let title = 'Home';
  if (pathname === '/communities') {
    title = 'Communities';
  } else if (community) {
    title = community;
  }
  
  return {
    path: pathname,
    fullUrl: window.location.href,
    title,
    community,
  };
};

// Global voice activation class
class VoiceActivation {
  private recognition: any;
  private isActive = true;
  private activationWord = 'johnson';
  private onActivation: () => void;
  private onTranscript: (text: string) => void;
  private onListeningStart: () => void;
  private onSpeechStart: () => void;
  private timeoutId: NodeJS.Timeout | null = null;
  private deactivationTimeout = 60000;
  private isRecognizing = false;
  private shouldBeListening = true;
  private restartLock = false;
  private isPaused = false;
  private mediaStream: MediaStream | null = null;

  constructor(
    onActivation: () => void,
    onTranscript: (text: string) => void,
    onListeningStart: () => void,
    onSpeechStart: () => void = () => {}
  ) {
    this.onActivation = onActivation;
    this.onTranscript = onTranscript;
    this.onListeningStart = onListeningStart;
    this.onSpeechStart = onSpeechStart;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isRecognizing = true;
      console.log("Recognition started");
    };

    this.recognition.onspeechstart = () => {
      console.log("[VoiceActivation] User started speaking, interrupting TTS");
      this.onSpeechStart();
    };

    this.recognition.onresult = (event: any) => {
      // Ignore audio buffers while paused (bot is speaking)
      if (this.isPaused) {
        console.log("[VoiceActivation] Ignoring transcript while bot is speaking");
        return;
      }

      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (!transcript.trim()) return;

      this.resetDeactivationTimer();

      const lowerTranscript = transcript.toLowerCase().trim();

      if (lowerTranscript.includes(this.activationWord) && !this.isActive) {
        this.isActive = true;
        this.onActivation();
        console.log("Reactivated with word:", this.activationWord);
        return;
      }

      if (this.isActive) {
        this.onTranscript(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      this.isRecognizing = false;

      if (this.shouldBeListening && !this.isPaused) {
        this.safeRestart();
      }
    };

    this.recognition.onend = () => {
      console.log("Recognition ended");
      this.isRecognizing = false;

      if (this.shouldBeListening && !this.isPaused) {
        this.safeRestart();
      }
    };
  }

  private safeRestart() {
    if (this.restartLock) return;
    this.restartLock = true;

    try {
      this.recognition.stop();
    } catch {}

    setTimeout(() => {
      try {
        this.recognition.start();
        this.onListeningStart();
      } catch (err) {
        console.warn("Restart skipped (still active)");
      }

      setTimeout(() => {
        this.restartLock = false;
      }, 1000);

    }, 1200);
  }

  pause() {
    this.isPaused = true;
    console.log("[VoiceActivation] Paused (bot is speaking)");
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn("Failed to stop recognition while bot is speaking:", error);
      }
    }
  }

  resume() {
    this.isPaused = false;
    console.log("[VoiceActivation] Resumed (bot finished speaking)");
    if (this.shouldBeListening && !this.isRecognizing) {
      try {
        this.recognition.start();
        this.onListeningStart();
      } catch (err) {
        console.warn("Resume skipped (still active)", err);
      }
    }
  }

  isPausedState() {
    return this.isPaused;
  }

  private resetDeactivationTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      if (this.isActive) {
        this.isActive = false;
        console.log("Deactivated due to 1 minute of inactivity");
      }
    }, this.deactivationTimeout);
  }

  start() {
    this.shouldBeListening = true;

    if (this.isRecognizing) return;

    try {
      this.recognition.start();
      this.onListeningStart();
      this.resetDeactivationTimer();
    } catch (err) {
      console.error("Start failed:", err);
    }
  }

  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error("Failed to stop recognition:", error);
      }
    }
  }

  activate() {
    this.isActive = true;
    this.resetDeactivationTimer();
  }

  isListening() {
    return this.isActive;
  }
}

const AiAssistant = () => {
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [showStatusIndicator, setShowStatusIndicator] = useState(true);
  const [isAssistantActive, setIsAssistantActive] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'voice' | 'text'>('voice');
  const [showTextChat, setShowTextChat] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isTextSending, setIsTextSending] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceActivationRef = useRef<VoiceActivation | null>(null);
  const currentQuestionRef = useRef<string>('');
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isMountedRef = useRef(true);
  const conversationIdRef = useRef<string>('');
  const stopSpeechTokenRef = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();
  const pageContextRef = usePageContext();
  const selectedTextRef = useTextSelection();
  const actions = createAiActions(navigate);

  const ensureMicrophoneConstraints = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn("Microphone constraints could not be enforced:", error);
    }
  };

  const stopSpeech = () => {
    stopSpeechTokenRef.current += 1;
    const currentToken = stopSpeechTokenRef.current;

    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      speechSynthesisRef.current = null;
    }

    document.querySelectorAll('audio').forEach((audio) => {
      try {
        audio.pause();
      } catch (error) {
        console.warn("Could not pause audio tag:", error);
      }
    });

    if (voiceActivationRef.current) {
      voiceActivationRef.current.resume();
    }

    setIsBotSpeaking(false);
    setIsSpeaking(false);
    if (conversationStatus === 'speaking') {
      setConversationStatus('listening');
    }

    return currentToken;
  };

  // Initialize conversation ID
  useEffect(() => {
    conversationIdRef.current = getPersistentConversationId();
    console.log("Using conversation ID:", conversationIdRef.current);
  }, []);

  // Capture selected text globally
  useEffect(() => {
    const handleTextSelection = () => {
      const selected = window.getSelection()?.toString().trim();
      if (selected && selected.length > 0) {
        setSelectedText(selected);
        console.log("Text selected:", selected);
        
        // Auto-acknowledge to user
        if (voiceActivationRef.current?.isListening()) {
          speakResponse(`I see you highlighted: "${selected}". What would you like to know about it?`);
          addMessage(`I see you highlighted: "${selected}". What would you like to know about it?`, 'ai');
        }
      }
    };

    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("touchend", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("touchend", handleTextSelection);
    };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      preferredVoiceRef.current =
        voices.find(v => v.lang === "en-US" && v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0] ||
        null;

      if (preferredVoiceRef.current) {
        console.log("Using voice:", preferredVoiceRef.current.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Initialize voice activation
  useEffect(() => {
    isMountedRef.current = true;

    const handleActivation = () => {
      if (!isMountedRef.current) return;
      
      setShowStatusIndicator(true);
      setIsAssistantActive(true);
      setConversationStatus('listening');
      
      setTimeout(() => {
        speakResponse("Yes? How can I help you?");
        addMessage("Yes? How can I help you?", 'ai');
      }, 500);
    };

    const processAIResponseWithContext = async (
      userQuestion: string,
      selectedTextValue: string | null
    ) => {
      try {
        const currentContext = getCurrentPageContext();
        const response = await askAI({
          message: userQuestion,
          page: currentContext.path,
          pageTitle: currentContext.title,
          url: currentContext.fullUrl,
          selectedText: selectedTextValue,
          community: currentContext.community,
          conversation_id: conversationIdRef.current
        });

        console.log("AI Response:", response);

        // Handle text message
        if (response.type === "message") {
          const content = response.content || "";
          addMessage(content, "ai");
          await speakResponse(content);
        }
        // Handle navigation action
        else if (response.type === "action" && response.action === "navigate") {
          const url = response.url || "/communities";
          const reason = response.reason || "";
          const content = response.content || "";
          
          console.log("Navigating to:", url, "Reason:", reason);
          
          if (content) {
            addMessage(content, "ai");
            await speakResponse(content);
          }
          
          // Navigate after explanation
          setTimeout(() => {
            actions.navigate(url);
          }, 1000);
        }
        // Handle highlight action
        else if (response.type === "action" && response.action === "highlight") {
          const selector = response.selector || "";
          const reason = response.reason || "";
          const content = response.content || "";
          
          console.log("Highlighting:", selector, "Reason:", reason);
          
          if (content) {
            addMessage(content, "ai");
            await speakResponse(content);
          }
          
          // Highlight element
          setTimeout(() => {
            actions.highlight(selector);
          }, 500);
        }
        // Fallback: if response has content but no recognized type, display content
        else if (response.content) {
          const content = response.content;
          addMessage(content, "ai");
          await speakResponse(content);
        }
        // Last resort fallback
        else {
          console.warn("Unexpected response format:", response);
          addMessage("I received a response but couldn't process it.", "ai");
        }

        setConversationStatus("listening");
      } catch (error) {
        console.error("Error processing AI response:", error);
        addMessage("Sorry, I encountered an error. Please try again.", "ai");
        await speakResponse("Sorry, I encountered an error. Please try again.");
        setConversationStatus("listening");
      }
    };

    const handleTranscript = async (transcript: string) => {
      if (!isMountedRef.current) return;

      const lockedSelection = selectedText;

      currentQuestionRef.current = transcript;
      setConversationStatus("processing");
      addMessage(transcript, "user");

      await processAIResponseWithContext(
        transcript,
        lockedSelection
      );

      // Clear selected text after processing
      setSelectedText(null);
    };

    const handleListeningStart = () => {
      if (!isMountedRef.current) return;
      console.log("Listening for speech...");
      setConversationStatus('listening');
    };

    voiceActivationRef.current = new VoiceActivation(
      handleActivation,
      handleTranscript,
      handleListeningStart,
      () => {
        stopSpeech();
      }
    );

    setTimeout(() => {
      void ensureMicrophoneConstraints();
      voiceActivationRef.current?.start();
    }, 1000);

    return () => {
      isMountedRef.current = false;
      cleanupSpeech();
      voiceActivationRef.current?.stop();
    };
  }, [isAssistantActive, selectedText]);

  // Handle chat mode switching
  useEffect(() => {
    if (chatMode === 'text') {
      // Stop voice recognition when switching to text mode
      voiceActivationRef.current?.stop();
    } else if (chatMode === 'voice' && isAssistantActive) {
      // Restart voice recognition when switching to voice mode
      voiceActivationRef.current?.start();
    }
  }, [chatMode, isAssistantActive]);

  const cleanupSpeech = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      speechSynthesisRef.current = null;
    }
    
    setIsSpeaking(false);
    setIsBotSpeaking(false);
    setConversationStatus('idle');
  };

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    if (!isMountedRef.current) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev.slice(-4), newMessage]);
  };

  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!isMountedRef.current) {
        resolve();
        return;
      }

      const token = stopSpeechTokenRef.current + 1;
      stopSpeechTokenRef.current = token;

      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }

      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentSentenceIndex = 0;

      const speakNextSentence = () => {
        if (!isMountedRef.current || currentSentenceIndex >= sentences.length) {
          if (stopSpeechTokenRef.current !== token) {
            resolve();
            return;
          }
          setIsSpeaking(false);
          setIsBotSpeaking(false);
          setConversationStatus('listening');
          voiceActivationRef.current?.resume();
          resolve();
          return;
        }

        if (stopSpeechTokenRef.current !== token) {
          resolve();
          return;
        }

        const sentence = sentences[currentSentenceIndex].trim();
        const utter = new SpeechSynthesisUtterance(sentence);
        
        if (preferredVoiceRef.current) {
          utter.voice = preferredVoiceRef.current;
        }

        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.volume = 1;
        utter.lang = "en-US";

        utter.onstart = () => {
          if (stopSpeechTokenRef.current !== token) {
            return;
          }
          setIsBotSpeaking(true);
          setIsSpeaking(true);
          setConversationStatus('speaking');
          voiceActivationRef.current?.pause();
        };

        utter.onend = () => {
          if (stopSpeechTokenRef.current !== token) {
            resolve();
            return;
          }

          currentSentenceIndex++;
          if (currentSentenceIndex >= sentences.length) {
            setIsBotSpeaking(false);
            setIsSpeaking(false);
            setConversationStatus('listening');
            voiceActivationRef.current?.resume();
            resolve();
            return;
          }
          setTimeout(() => {
            if (stopSpeechTokenRef.current !== token) {
              resolve();
              return;
            }
            speakNextSentence();
          }, 300);
        };
        
        utter.onerror = () => {
          if (stopSpeechTokenRef.current !== token) {
            resolve();
            return;
          }

          currentSentenceIndex++;
          if (currentSentenceIndex >= sentences.length) {
            setIsBotSpeaking(false);
            setIsSpeaking(false);
            setConversationStatus('listening');
            voiceActivationRef.current?.resume();
            resolve();
            return;
          }
          setTimeout(() => {
            if (stopSpeechTokenRef.current !== token) {
              resolve();
              return;
            }
            speakNextSentence();
          }, 300);
        };
        
        speechSynthesisRef.current = utter;
        window.speechSynthesis.speak(utter);
      };

      speakNextSentence();
    });
  };

  const stopConversation = () => {
    stopSpeech();
    setIsAssistantActive(false);
    setShowStatusIndicator(false);
  };

  const restartConversation = () => {
    voiceActivationRef.current?.activate();
    setIsAssistantActive(true);
    setShowStatusIndicator(true);
    setConversationStatus('listening');
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    const userMessage = textInput.trim();
    setTextInput('');
    setIsTextSending(true);
    setConversationStatus('processing');
    stopSpeech();
    
    try {
      addMessage(userMessage, 'user');
      
      const currentContext = getCurrentPageContext();
      const lockedSelection = selectedText;
      
      const response = await askAI({
        message: userMessage,
        page: currentContext.path,
        pageTitle: currentContext.title,
        url: currentContext.fullUrl,
        selectedText: lockedSelection,
        community: currentContext.community,
        conversation_id: conversationIdRef.current
      });
      
      console.log("AI Response (Text):", response);
      
      if (response.type === "message") {
        const content = response.content || "";
        addMessage(content, "ai");
      } else if (response.type === "action" && response.action === "navigate") {
        const url = response.url || "/communities";
        const content = response.content || "";
        if (content) addMessage(content, "ai");
        setTimeout(() => {
          actions.navigate(url);
        }, 1000);
      } else if (response.type === "action" && response.action === "highlight") {
        const content = response.content || "";
        if (content) addMessage(content, "ai");
        setTimeout(() => {
          actions.highlight(response.selector || "");
        }, 500);
      } else if (response.content) {
        // Fallback: if response has content but no recognized type
        addMessage(response.content, "ai");
      } else {
        console.warn("Unexpected response format:", response);
        addMessage("I received a response but couldn't process it.", "ai");
      }
      
      setConversationStatus('idle');
      setSelectedText(null);
    } catch (error) {
      console.error("Error processing text message:", error);
      addMessage("Sorry, I encountered an error. Please try again.", "ai");
      setConversationStatus('idle');
    } finally {
      setIsTextSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Text Chat Modal */}
      {chatMode === 'text' && showTextChat && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-96 max-h-[80vh] flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Chat with AI</h3>
            </div>
            <button
              onClick={() => setShowTextChat(false)}
              className="hover:bg-white/20 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm text-center">Start a conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-300 text-gray-900 rounded-bl-none'
                    }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-600'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-3 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isTextSending) {
                  handleTextSubmit();
                }
              }}
              placeholder="Type your question..."
              disabled={isTextSending}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isTextSending}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isTextSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Status Indicator - Always visible when assistant is available */}
      {showStatusIndicator ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col items-end gap-2">
            <div className="relative">
              <div className="absolute -top-1 -right-1 z-10">
                <div className={`w-4 h-4 rounded-full animate-pulse ${
                  conversationStatus === 'listening' ? 'bg-green-500' :
                  conversationStatus === 'speaking' ? 'bg-blue-500' :
                  conversationStatus === 'processing' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
              </div>
              
              <button
                onClick={stopConversation}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all hover:shadow-2xl hover:shadow-blue-500/30"
                title={chatMode === 'text' ? 'Text Chat Active' :
                       conversationStatus === 'speaking' ? 'AI Speaking' : 
                       conversationStatus === 'listening' ? 'Listening...' : 
                       conversationStatus === 'processing' ? 'Processing...' : 'AI Assistant Active'}
              >
                {chatMode === 'text' ? (
                  <MessageCircle className="w-5 h-5" />
                ) : conversationStatus === 'processing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : conversationStatus === 'speaking' ? (
                  <Volume2 className="w-5 h-5" />
                ) : conversationStatus === 'listening' ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </button>
            </div>

            {isBotSpeaking && (
              <button
                onClick={stopSpeech}
                className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-red-500 transition"
                title="Stop speaking"
              >
                Stop Speaking
              </button>
            )}

            <div className="flex gap-1 bg-white rounded-full shadow-lg p-1">
              <button
                onClick={() => {
                  setChatMode('voice');
                  setShowTextChat(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  chatMode === 'voice'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Switch to Voice Mode"
              >
                Voice
              </button>
              <button
                onClick={() => {
                  setChatMode('text');
                  setShowTextChat(true);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  chatMode === 'text'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Switch to Text Mode"
              >
                Text
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={restartConversation}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-3 rounded-full shadow-xl cursor-pointer hover:scale-110 transition-all hover:shadow-gray-500/30"
            title="Click to restart AI Assistant"
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Debug/Log Panel */}
      {process.env.NODE_ENV === 'development' && messages.length > 0 && (
        <div className="fixed bottom-32 right-6 w-80 max-h-64 bg-black/90 text-white rounded-lg p-4 overflow-y-auto text-xs z-40">
          <div className="font-mono">
            <div className="text-green-400 mb-2">AI Assistant Logs:</div>
            {messages.slice(-5).map((message) => (
              <div key={message.id} className="mb-1">
                <span className="text-gray-400">[{formatTime(message.timestamp)}]</span>
                <span className={message.sender === 'user' ? 'text-blue-300' : 'text-green-300'}>
                  {' '}{message.sender === 'user' ? 'You:' : 'AI:'}
                </span>
                <span className="ml-2 truncate">{message.text}</span>
              </div>
            ))}
            <div className="text-gray-500 mt-2 text-xs">
              Status: {conversationStatus} | 
              Active: {isAssistantActive ? 'Yes' : 'No'} |
              Selected: {selectedText ? `"${selectedText.substring(0, 20)}..."` : 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Instructions Tooltip */}
      {!isAssistantActive && (
        <div className="fixed bottom-24 right-6 bg-white shadow-xl rounded-lg p-4 w-64 z-40 animate-fade-in">
          <div className="flex items-center space-x-2 mb-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-sm">AI Assistant Inactive</span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Click the assistant icon to restart, or say <span className="font-bold text-blue-600">"Johnson"</span> to activate
          </p>
          <div className="text-xs text-gray-500">
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Mic is always listening in background</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Auto-deactivates after 1 minute of silence</span>
            </div>
          </div>
        </div>
      )}

      {isAssistantActive && messages.length === 0 && (
        <div className="fixed bottom-24 right-6 bg-white shadow-xl rounded-lg p-4 w-64 z-40 animate-fade-in">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="w-5 h-5 text-green-600" />
            <span className="font-medium text-sm">AI Assistant Active</span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            You can ask questions freely. The mic is always on.
          </p>
          <div className="text-xs text-gray-500">
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Listening for your questions</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Select text on page • AI will understand context</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const globalStyles = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
`;

export default AiAssistant;
