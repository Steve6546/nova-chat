import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { IconSparkles, IconCode, IconBrain, IconRocket } from '@tabler/icons-react';

interface EmptyStateProps {
  onStartChat: (prompt: string) => void;
}

const suggestions = [
  {
    icon: IconCode,
    title: "Write Luau code",
    prompt: "Write a Luau script that creates a simple player leaderboard system for Roblox",
  },
  {
    icon: IconBrain,
    title: "Explain concepts",
    prompt: "Explain how RemoteEvents work in Roblox and when to use them",
  },
  {
    icon: IconRocket,
    title: "Debug my code",
    prompt: "Help me debug this Roblox script that isn't working properly",
  },
];

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState({ onStartChat }, ref) {
    return (
      <div ref={ref} className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent flex items-center justify-center">
            <IconSparkles className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl font-bold mb-2">Welcome to Roblox AI</h2>
          <p className="text-muted-foreground mb-8">
            Your intelligent assistant for Roblox Studio development. Ask me anything about Luau, 
            game design, or get help with your code.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => onStartChat(suggestion.prompt)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStartChat(suggestion.prompt);
                  }
                }}
                className="group p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left cursor-pointer"
              >
                <suggestion.icon className="w-6 h-6 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="font-medium text-sm">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {suggestion.prompt}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }
);
