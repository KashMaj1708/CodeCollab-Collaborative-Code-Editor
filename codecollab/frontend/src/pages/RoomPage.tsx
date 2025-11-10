import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditorTypes } from 'monaco-editor';
import apiClient from '../apiClient';
import { toast } from 'react-hot-toast';
import { Share2 } from 'lucide-react';

// --- (Phase 4) User Presence Code... ---
const USER_NAMES = [
  'Badger', 'Hippo', 'Lion', 'Tiger', 'Puma', 'Wolf', 'Rabbit', 'Bear', 'Koala', 'Ape'
];
const randomName = () => USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

// --- (Name Fix) Helper to get a unique name ---
const getAvailableName = (usedNames: Set<string>): string => {
  // 1. Try to find an unused name from the list
  const availableNames = USER_NAMES.filter(name => !usedNames.has(name));
  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  }
  
  // 2. If all names are used, append a number
  let i = 2;
  const baseName = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
  while (true) {
    const newName = `${baseName} ${i}`;
    if (!usedNames.has(newName)) {
      return newName;
    }
    i++;
  }
};
// --- (End Name Fix) ---


interface UserAwarenessState {
  user: {
    name: string;
    color: string;
  }
}

const ActiveUsers = ({ users }: { users: Map<number, UserAwarenessState> }) => {
  const userArray = Array.from(users.entries());
  return (
    <div className="flex -space-x-2 overflow-hidden pr-2" title="Active Users">
      {userArray.map(([clientId, state]) => {
        if (!state || !state.user) return null;
        return (
          <div 
            key={clientId} 
            className="ring-2 ring-gray-900"
            style={{ 
              backgroundColor: state.user.color,
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1',
              textAlign: 'center'
            }}
            title={state.user.name}
          >
            {state.user.name.substring(0, 1).toUpperCase()} 
          </div>
        );
      })}
    </div>
  );
};
// --- (End Phase 4) ---

// LanguageSelector component (no changes)
const LanguageSelector = ({ onSelect }: { onSelect: (lang: string) => void }) => {
  const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'go', 'html', 'css'];
  return (
    <select 
      onChange={(e) => onSelect(e.target.value)}
      defaultValue="javascript"
      className="bg-gray-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </select>
  );
};

// --- (Phase 5) Output Panel Component ---
interface ExecutionOutput {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}

const OutputPanel = ({ output, isLoading }: { output: ExecutionOutput | null, isLoading: boolean }) => {
  const getFormattedOutput = () => {
    if (isLoading) {
      return "Executing code...";
    }
    if (!output) {
      return "Click 'Run Code' to see the output here.";
    }
    const { stdout, stderr, compile_output, status } = output;
    if (status.id <= 2) {
      return "Processing...";
    }
    if (status.id === 3) {
      return stdout || "Execution successful, but no standard output.";
    }
    return `Error (${status.description}):\n${stderr || compile_output || 'Unknown error'}`;
  };
  
  const outputText = getFormattedOutput();
  const isError = !isLoading && output && output.status.id > 3;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold bg-gray-700 px-4 py-2 rounded-t-md">Output</h3>
      <textarea
        readOnly
        className={`w-full flex-grow bg-gray-900 rounded-b-md p-4 font-mono text-sm ${
          isError ? 'text-red-400' : 'text-gray-200'
        }`}
        value={outputText}
      />
    </div>
  );
};
// --- (End Phase 5) ---


export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [language, setLanguage] = useState('javascript');
  
  const [editor, setEditor] = useState<MonacoEditorTypes.IStandaloneCodeEditor | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [activeUsers, setActiveUsers] = useState<Map<number, UserAwarenessState>>(new Map());

  const [execOutput, setExecOutput] = useState<ExecutionOutput | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isBinding, setIsBinding] = useState(true);

  const bindingRef = useRef<MonacoBinding | null>(null);
  
  // --- (Name Fix) Ref to store local user name to prevent re-renders
  const localUserNameRef = useRef(randomName());

  // --- HOOK 1 (Yjs Setup) ---
  useEffect(() => {
    if (!roomId) return;
    setIsBinding(true); 
    const ydoc = new Y.Doc();
    const yTextInstance = ydoc.getText('monaco');
    setYText(yTextInstance);
    const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
                    .replace(/^http/, 'ws');
    const wsProvider = new WebsocketProvider(
      wsUrl + '/yjs-ws',
      roomId,
      ydoc
    );
    setProvider(wsProvider);
    wsProvider.on('status', (event: { status: string }) => {
      console.log(`[Yjs] ${event.status}`);
      if (event.status === 'connected') {
        setTimeout(() => {
          setIsBinding(false);
        }, 500);
      } else if (event.status === 'disconnected') {
        setIsBinding(true);
      }
    });

    // --- (Name Fix) Use the ref for the initial name
    const localUser = {
      name: localUserNameRef.current,
      color: randomColor()
    };
    wsProvider.awareness.setLocalStateField('user', localUser);

    const awarenessChangeHandler = () => {
      const states = wsProvider.awareness.getStates() as Map<number, UserAwarenessState>;
      const localClientId = wsProvider.awareness.clientID;
      const localState = states.get(localClientId);

      if (!localState || !localState.user) return; // Not ready yet

      const usedNames = new Set<string>();
      let collision = false;

      // --- (Name Fix) Check for name collisions ---
      states.forEach((state, clientId) => {
        if (clientId === localClientId || !state.user) {
          return; // Skip self or empty states
        }
        
        usedNames.add(state.user.name); // Add to list of names used by *others*

        // If another user has my name, AND their ID is smaller (they were "first")
        if (state.user.name === localState.user.name && clientId < localClientId) {
          collision = true;
        }
      });

      // If collision detected, pick a new name
      if (collision) {
        const newName = getAvailableName(usedNames);
        localUserNameRef.current = newName; // Update our ref
        const newLocalUser = { ...localState.user, name: newName };
        wsProvider.awareness.setLocalStateField('user', newLocalUser);
        console.warn(`[Awareness] Name collision detected. Renaming to ${newName}`);
        // Handler will run again after state update, so we can exit
        return;
      }
      // --- (End Name Fix) ---

      // No collision, proceed with UI updates
      setActiveUsers(new Map(states));
      
      states.forEach((state, clientId) => {
        if (state.user && state.user.color) {
          const styleId = `yjs-client-${clientId}`;
          let styleElement = document.getElementById(styleId) as HTMLStyleElement;
          if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
          }
          styleElement.textContent = `
            .yRemoteSelection-${clientId} { background-color: ${state.user.color}; opacity: 0.3; }
            .yRemoteSelectionHead-${clientId} { position: absolute; border-left: 2px solid ${state.user.color}; border-top: 2px solid ${state.user.color}; border-top-left-radius: 4px; height: 1.2em; box-sizing: border-box; }
            .yRemoteSelectionHead-${clientId}::after { content: '${state.user.name}'; position: absolute; top: -1.4em; left: -1px; background-color: ${state.user.color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; line-height: 1.2; font-weight: 600; white-space: nowrap; pointer-events: none; user-select: none; }
          `;
        }
      });
    };
    wsProvider.awareness.on('change', awarenessChangeHandler);
    awarenessChangeHandler();

    return () => {
      wsProvider.awareness.off('change', awarenessChangeHandler);
      const styleElements = document.querySelectorAll('[id^="yjs-client-"]');
      styleElements.forEach(el => el.remove());
      wsProvider.disconnect();
      ydoc.destroy();
    };
  }, [roomId]);

  // --- HOOK 2 (Binding Setup) ---
  useEffect(() => {
    if (editor && yText && provider) {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      const binding = new MonacoBinding(
        yText,
        editor.getModel()!,
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;
      console.log('[Binding] Yjs + Monaco binding created.');
      return () => {
        binding.destroy();
        bindingRef.current = null;
      };
    }
  }, [editor, yText, provider]);

  // --- Editor Mount Handler ---
  const handleEditorDidMount = (
    editor: MonacoEditorTypes.IStandaloneCodeEditor,
  ) => {
    setEditor(editor);
  };

  // --- (Phase 5) Run Code Handler ---
  const handleRunCode = async () => {
    if (!editor) return;
    const code = editor.getValue();
    setIsLoadingCode(true);
    setExecOutput(null);
    try {
      const response = await apiClient.post<ExecutionOutput>('/api/execute', {
        language: language,
        code: code,
      });
      setExecOutput(response.data);
    } catch (error: any) {
      console.error('Error running code:', error);
      setExecOutput({
        stdout: null,
        stderr: error.response?.data?.error || "Error connecting to execution server.",
        compile_output: null,
        message: null,
        status: { id: -1, description: "Client Error" }
      });
    } finally {
      setIsLoadingCode(false);
    }
  };

  // --- (Phase 6) Share/Copy Handler ---
  const handleShare = () => {
    if (!roomId) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success('Room URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy URL.');
      });
  };
  
  // --- LAYOUT FIX CONSTANTS ---
  const HEADER_HEIGHT_PX = 80;
  const OUTPUT_HEIGHT_PX = 250;
  const PAGE_PADDING_PX = 16; // p-4 (1rem)

  return (
    <div 
      className="bg-gray-800 text-white p-4"
      style={{ 
        height: '100vh', 
        boxSizing: 'border-box'
      }}
    >
      {/* Header (Fixed Height) */}
      <div 
        className="flex flex-wrap justify-between items-center flex-shrink-0 gap-2"
        style={{ 
          minHeight: `${HEADER_HEIGHT_PX}px`
        }}
      >
        <h1 className="text-2xl font-mono">Room: {roomId}</h1>
        <div className="flex items-center space-x-4">
          <ActiveUsers users={activeUsers} />
          <LanguageSelector onSelect={setLanguage} />
          
          <span className={`text-sm font-semibold ${provider?.wsconnected ? 'text-green-400' : 'text-red-400'}`}>
            {provider?.wsconnected ? '● CONNECTED' : (isBinding ? '● CONNECTING...' : '● DISCONNECTED')}
          </span>

          <button
            onClick={handleShare}
            className="flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors"
            title="Share Room"
          >
            <Share2 size={16} className="mr-2" />
            Share
          </button>
          
          <button
            onClick={handleRunCode}
            disabled={isLoadingCode}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoadingCode ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>
      
      {/* Editor (Calculated Height) */}
      <div 
        className="rounded-md overflow-hidden relative my-4"
        style={{ 
          height: `calc(100vh - ${HEADER_HEIGHT_PX}px - ${OUTPUT_HEIGHT_PX}px - ${PAGE_PADDING_PX * 2}px - 32px)` 
        }}
      >
        {isBinding && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
            <span className="text-lg font-semibold animate-pulse">
              Connecting to room...
            </span>
          </div>
        )}
        <Editor
          height="100%"
          width="100%"
          theme="vs-dark"
          language={language}
          defaultValue="// Start coding..."
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            glyphMargin: true,
            "semanticHighlighting.enabled": true,
            readOnly: isBinding
          }}
        />
      </div>
      
      {/* Output Panel (Fixed Height) */}
      <div 
        className="flex-shrink-0"
        style={{ height: `${OUTPUT_HEIGHT_PX}px` }}
      >
        <OutputPanel output={execOutput} isLoading={isLoadingCode} />
      </div>
    </div>
  );
}