import { IconMenu2, IconLogout, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { ModelSelector } from './ModelSelector';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function ChatHeader({ 
  selectedModel, 
  onSelectModel, 
  onToggleSidebar,
  sidebarOpen 
}: ChatHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={cn(
            "p-2 rounded-lg transition-colors",
            "hover:bg-muted"
          )}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <IconLayoutSidebarLeftCollapse className="w-5 h-5" />
          ) : (
            <IconLayoutSidebarLeftExpand className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold gradient-text">Roblox AI</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Studio Assistant</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ModelSelector 
          selectedModel={selectedModel} 
          onSelectModel={onSelectModel} 
        />
        
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <IconLogout className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
