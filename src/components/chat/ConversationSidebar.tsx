import { useState } from 'react';
import { IconPlus, IconSearch, IconMessage, IconTrash, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
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
  onClose
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {/* Backdrop (always mounted). Only affects opacity + pointer-events. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ease-out md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar (always mounted). Animate ONLY with transform. */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-72 bg-sidebar border-r border-sidebar-border",
          "transform-gpu transition-transform duration-300 ease-out will-change-transform",
          "flex flex-col",
          "md:relative md:translate-x-0",
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-semibold text-sidebar-foreground">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewConversation}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
              aria-label="New conversation"
            >
              <IconPlus className="w-5 h-5 text-sidebar-foreground" />
            </button>
            <button
              type="button"
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
                'w-full pl-9 pr-3 py-2 rounded-lg',
                'bg-sidebar-accent border border-transparent',
                'text-sm text-sidebar-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:border-sidebar-ring focus:ring-1 focus:ring-sidebar-ring'
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
              {conversations.map((conversation) => {
                const isActive = currentConversation?.id === conversation.id;
                const isHovered = hoveredId === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    onMouseEnter={() => setHoveredId(conversation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectConversation(conversation)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectConversation(conversation);
                      }
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left cursor-pointer',
                      'hover:bg-sidebar-accent',
                      isActive && 'bg-sidebar-accent'
                    )}
                  >
                    <IconMessage className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-sidebar-foreground truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(conversation.updated_at), {
                          addSuffix: true
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className={cn(
                        'p-1 rounded transition-all duration-200',
                        'hover:bg-destructive/20 text-muted-foreground hover:text-destructive',
                        isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      )}
                      aria-label="Delete conversation"
                      tabIndex={isHovered ? 0 : -1}
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
