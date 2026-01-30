import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconSend, 
  IconMicrophone, 
  IconMicrophoneOff, 
  IconPhoto, 
  IconX,
  IconUpload,
  IconSparkles
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSend: (message: string) => void;
  onImageRequest?: (prompt: string, imageFile?: File) => void;
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

export const MessageComposer = forwardRef<HTMLDivElement, MessageComposerProps>(
  function MessageComposer({ 
    onSend, 
    onImageRequest,
    disabled,
    placeholder = "Type a message..." 
  }, ref) {
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setUploadedImage(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const handleRemoveImage = () => {
      setUploadedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleImageGenerate = () => {
      if (imagePrompt.trim() && onImageRequest) {
        onImageRequest(imagePrompt.trim(), uploadedImage || undefined);
        setImagePrompt('');
        setUploadedImage(null);
        setImagePreview(null);
        setShowImageModal(false);
      }
    };

    const handleCloseModal = () => {
      setShowImageModal(false);
      setImagePrompt('');
      setUploadedImage(null);
      setImagePreview(null);
    };

    return (
      <>
        <div ref={ref}>
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

              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-border"
                  >
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      Recording... Speak now
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Image Generation Modal */}
        <AnimatePresence>
          {showImageModal && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IconSparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Generate Image</h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Image Upload Section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Reference Image (Optional)
                  </label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Upload preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <IconX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-xl hover:bg-muted/50 transition-colors w-full justify-center"
                    >
                      <IconUpload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload reference image</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Prompt Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Image Description
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe the image you want to generate... Be specific about style, colors, and details."
                    rows={4}
                    className="w-full p-3 bg-secondary rounded-xl border border-border outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Tips */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tips:</strong> For best results, describe colors, style (cartoon, realistic, pixel art), 
                    lighting, and mood. For Roblox icons, mention "game icon", "UI button", or "inventory icon".
                  </p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImageGenerate}
                    disabled={!imagePrompt.trim()}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                      imagePrompt.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <IconSparkles className="w-4 h-4" />
                    Generate
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }
);
