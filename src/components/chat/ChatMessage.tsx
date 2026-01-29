import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { IconUser, IconRobot } from '@tabler/icons-react';
import { Message } from '@/types/chat';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        "flex gap-4 px-4 py-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <IconRobot className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] px-4 py-3",
          isUser ? "chat-message-user" : "chat-message-assistant"
        )}
      >
        {message.content_type === 'image' ? (
          <img 
            src={message.content} 
            alt="Generated image" 
            className="rounded-lg max-w-full"
          />
        ) : (
          <div className={cn(
            "prose prose-invert prose-sm max-w-none",
            isUser && "text-right",
            !isUser && "font-medium"
          )}>
            <ReactMarkdown
              components={{
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  
                  if (isInline) {
                    return (
                      <code 
                        className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <CodeBlock
                      code={String(children).replace(/\n$/, '')}
                      language={match?.[1] || 'text'}
                    />
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse-subtle" />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <IconUser className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 px-4 py-6"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
        <IconRobot className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="chat-message-assistant px-4 py-3">
        <div className="typing-indicator">
          <span />
          <span />
          <span />
        </div>
      </div>
    </motion.div>
  );
}
