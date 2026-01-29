import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconSend, IconMicrophone, IconMicrophoneOff, IconPhoto, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSend: (message: string) => void;
  onImageRequest?: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

export function MessageComposer({ 
  onSend, 
  onImageRequest,
  disabled,
  placeholder = "Type a message..." 
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition || 
                                  (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      const SpeechRecognitionConstructor = SpeechRecognitionAPI as new () => SpeechRecognitionInstance;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        let transcript = '';
        for (let i = 0; i < results.length; i++) {
          transcript += results[i][0].transcript;
        }
        setMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleImageGenerate = () => {
    if (imagePrompt.trim() && onImageRequest) {
      onImageRequest(imagePrompt.trim());
      setImagePrompt('');
      setShowImageModal(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="relative">
        <div className="composer-container p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "flex-1 bg-transparent resize-none outline-none",
                "text-foreground placeholder:text-muted-foreground",
                "min-h-[24px] max-h-[200px]",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            />
            
            <div className="flex items-center gap-1">
              {/* Voice input */}
              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isRecording 
                      ? "bg-destructive text-destructive-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <IconMicrophoneOff className="w-5 h-5" />
                  ) : (
                    <IconMicrophone className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Image generation */}
              {onImageRequest && (
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Generate image"
                >
                  <IconPhoto className="w-5 h-5" />
                </button>
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={!message.trim() || disabled}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  message.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <IconSend className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 pt-2 border-t border-border"
            >
              <div className="flex items-center gap-2 text-sm text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Recording... Speak now
              </div>
            </motion.div>
          )}
        </div>
      </form>

      {/* Image Generation Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generate Image</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={4}
              className="w-full p-3 bg-secondary rounded-xl border border-border outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImageGenerate}
                disabled={!imagePrompt.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  imagePrompt.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Generate
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
