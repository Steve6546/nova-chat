import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconPlus, 
  IconSearch, 
  IconMessage, 
  IconTrash, 
  IconChevronLeft,
  IconDots
} from '@tabler/icons-react';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversation,
  isOpen,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed left-0 top-0 bottom-0 z-50 w-72",
              "bg-sidebar border-r border-sidebar-border",
              "flex flex-col",
              "md:relative md:z-0"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <h2 className="font-semibold text-sidebar-foreground">Chats</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={onNewConversation}
                  className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                  aria-label="New conversation"
                >
                  <IconPlus className="w-5 h-5 text-sidebar-foreground" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors md:hidden"
                  aria-label="Close sidebar"
                >
                  <IconChevronLeft className="w-5 h-5 text-sidebar-foreground" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search conversations..."
                  className={cn(
                    "w-full pl-9 pr-3 py-2 rounded-lg",
                    "bg-sidebar-accent border border-transparent",
                    "text-sm text-sidebar-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:border-sidebar-ring focus:ring-1 focus:ring-sidebar-ring"
                  )}
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      layout
                      onMouseEnter={() => setHoveredId(conversation.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <button
                        onClick={() => onSelectConversation(conversation)}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                          "hover:bg-sidebar-accent",
                          currentConversation?.id === conversation.id && "bg-sidebar-accent"
                        )}
                      >
                        <IconMessage className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-sidebar-foreground truncate">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <AnimatePresence>
                          {hoveredId === conversation.id && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConversation(conversation.id);
                              }}
                              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Delete conversation"
                            >
                              <IconTrash className="w-4 h-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
