import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconChevronDown, IconCheck, IconBrain, IconBolt, IconPhoto, IconSparkles } from '@tabler/icons-react';
import { AI_MODELS, AIModel } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  const getModelIcon = (model: AIModel) => {
    switch (model.badge) {
      case 'gpt':
        return <IconBrain className="w-4 h-4" />;
      case 'image':
        return <IconPhoto className="w-4 h-4" />;
      case 'gemini':
        return model.id.includes('flash') 
          ? <IconBolt className="w-4 h-4" /> 
          : <IconSparkles className="w-4 h-4" />;
      default:
        return <IconSparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          "bg-secondary hover:bg-accent border border-border",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {getModelIcon(currentModel)}
          <span className="hidden sm:inline">{currentModel.name}</span>
        </span>
        <IconChevronDown 
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full right-0 mt-2 z-50 min-w-[280px]",
                "bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
              )}
            >
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Select Model
                </p>
                
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg transition-colors",
                      "hover:bg-accent focus:outline-none focus:bg-accent",
                      selectedModel === model.id && "bg-accent"
                    )}
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      {getModelIcon(model)}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">{model.name}</p>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                    </div>
                    {selectedModel === model.id && (
                      <IconCheck className="w-4 h-4 mt-1 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
