import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconSend, 
  IconMicrophone, 
  IconMicrophoneOff, 
  IconPhoto, 
  IconX,
  IconUpload,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconPlus
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSend: (message: string) => void;
  onImageRequest?: (prompt: string, imageFile?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
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
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

    // Keyboard navigation for images
    const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
      if (!showImageModal || uploadedImages.length <= 1) return;
      
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : uploadedImages.length - 1);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => prev < uploadedImages.length - 1 ? prev + 1 : 0);
      }
    }, [showImageModal, uploadedImages.length]);

    useEffect(() => {
      window.addEventListener('keydown', handleKeyNavigation);
      return () => window.removeEventListener('keydown', handleKeyNavigation);
    }, [handleKeyNavigation]);

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
      const files = Array.from(e.target.files || []);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const newImage: UploadedImage = {
            file,
            preview: reader.result as string,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          setUploadedImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleRemoveImage = (id: string) => {
      setUploadedImages(prev => {
        const newImages = prev.filter(img => img.id !== id);
        if (currentImageIndex >= newImages.length && newImages.length > 0) {
          setCurrentImageIndex(newImages.length - 1);
        }
        return newImages;
      });
    };

    const handleRemoveCurrentImage = () => {
      if (uploadedImages[currentImageIndex]) {
        handleRemoveImage(uploadedImages[currentImageIndex].id);
      }
    };

    const handleImageGenerate = () => {
      if (imagePrompt.trim() && onImageRequest) {
        const currentImage = uploadedImages[currentImageIndex];
        onImageRequest(imagePrompt.trim(), currentImage?.file || undefined);
        setImagePrompt('');
        setUploadedImages([]);
        setCurrentImageIndex(0);
        setShowImageModal(false);
      }
    };

    const handleCloseModal = () => {
      setShowImageModal(false);
      setImagePrompt('');
      setUploadedImages([]);
      setCurrentImageIndex(0);
    };

    const navigateImage = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : uploadedImages.length - 1);
      } else {
        setCurrentImageIndex(prev => prev < uploadedImages.length - 1 ? prev + 1 : 0);
      }
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
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <IconSparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Generate Image</h3>
                      <p className="text-xs text-muted-foreground">Create stunning visuals with AI</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Image Gallery Section */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-3">
                      Reference Images (Optional)
                    </label>
                    
                    {uploadedImages.length > 0 ? (
                      <div className="space-y-3">
                        {/* Main Image Display with Navigation */}
                        <div className="relative aspect-video bg-muted/50 rounded-xl overflow-hidden border border-border">
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={uploadedImages[currentImageIndex]?.id}
                              src={uploadedImages[currentImageIndex]?.preview}
                              alt="Reference preview"
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -50 }}
                              transition={{ duration: 0.2 }}
                              className="w-full h-full object-contain"
                            />
                          </AnimatePresence>
                          
                          {/* Navigation Arrows */}
                          {uploadedImages.length > 1 && (
                            <>
                              <button
                                onClick={() => navigateImage('prev')}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg transition-all hover:scale-110"
                              >
                                <IconChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => navigateImage('next')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg transition-all hover:scale-110"
                              >
                                <IconChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          
                          {/* Delete Current Image */}
                          <button
                            onClick={handleRemoveCurrentImage}
                            className="absolute top-2 right-2 p-2 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground shadow-lg transition-all hover:scale-110"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                          
                          {/* Image Counter */}
                          {uploadedImages.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/80 border border-border text-xs font-medium">
                              {currentImageIndex + 1} / {uploadedImages.length}
                            </div>
                          )}
                        </div>
                        
                        {/* Thumbnail Strip */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {uploadedImages.map((img, index) => (
                            <button
                              key={img.id}
                              onClick={() => setCurrentImageIndex(index)}
                              className={cn(
                                "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                                index === currentImageIndex 
                                  ? "border-primary ring-2 ring-primary/30" 
                                  : "border-border hover:border-muted-foreground"
                              )}
                            >
                              <img 
                                src={img.preview} 
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          
                          {/* Add More Button */}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground flex items-center justify-center transition-colors"
                          >
                            <IconPlus className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed border-border rounded-xl hover:bg-muted/30 hover:border-muted-foreground transition-all group"
                      >
                        <div className="p-3 rounded-full bg-muted group-hover:bg-muted/80 transition-colors">
                          <IconUpload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Upload reference images</p>
                          <p className="text-xs text-muted-foreground mt-1">Click or drag & drop</p>
                        </div>
                      </button>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Prompt Input */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Image Description
                    </label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe what you want to generate... Be specific about style, colors, and details."
                      rows={3}
                      className="w-full p-4 bg-muted/50 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                    />
                  </div>

                  {/* Tips */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-primary">💡 Tips:</span> For Roblox icons, mention specific sizes like "64x64 game icon" or "inventory slot". 
                      Include style keywords: pixel art, cartoon, realistic, neon, minimalist.
                    </p>
                  </div>
                </div>
                
                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-muted/20">
                  <button
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImageGenerate}
                    disabled={!imagePrompt.trim()}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                      imagePrompt.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
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
