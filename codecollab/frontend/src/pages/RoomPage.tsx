import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditorTypes } from 'monaco-editor';
import apiClient from '../apiClient';

// --- (Phase 6) Imports ---
import { toast } from 'react-hot-toast';
import { Share2 } from 'lucide-react'; // Icon library
// --- (End Phase 6) ---

// --- (Phase 4) User Presence Code... ---
const USER_NAMES = [
  'Badger', 'Hippo', 'Lion', 'Tiger', 'Puma', 'Wolf', 'Rabbit', 'Bear', 'Koala', 'Ape'
];
const randomName = () => USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

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
  
  // --- (Phase 6) Loading state for editor binding ---
  const [isBinding, setIsBinding] = useState(true);

  const bindingRef = useRef<MonacoBinding | null>(null);

  // --- HOOK 1 (Yjs Setup) ---
  useEffect(() => {
    if (!roomId) return;
    setIsBinding(true); // Start loading
    
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
        // --- (Phase 6) Turn off loading state once connected ---
        // We add a small delay to allow the Yjs doc to sync
        setTimeout(() => {
          setIsBinding(false);
        }, 500);
      } else if (event.status === 'disconnected') {
        setIsBinding(true); // Show loading if disconnected
      }
    });

    // ... (rest of awareness setup is the same) ...
    const localUser = {
      name: randomName(),
      color: randomColor()
    };
    wsProvider.awareness.setLocalStateField('user', localUser);
    const awarenessChangeHandler = () => {
      const states = wsProvider.awareness.getStates() as Map<number, UserAwarenessState>;
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

  return (
    <div className="bg-gray-800 text-white h-screen p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-mono">Room: {roomId}</h1>
        <div className="flex items-center space-x-4">
          <ActiveUsers users={activeUsers} />
          <LanguageSelector onSelect={setLanguage} />
          
          {/* --- (Phase 6) Connection Status --- */}
          <span className={`text-sm font-semibold ${provider?.wsconnected ? 'text-green-400' : 'text-red-400'}`}>
            {provider?.wsconnected ? '● CONNECTED' : (isBinding ? '● CONNECTING...' : '● DISCONNECTED')}
          </span>

          {/* --- (Phase 6) Share Button --- */}
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
      
      {/* Editor */}
      <div 
        className="rounded-md overflow-hidden flex-1 min-h-0 my-4 relative"
      >
        {/* --- (Phase 6) Loading Overlay --- */}
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
            readOnly: isBinding // (Phase 6) Make editor read-only while connecting
          }}
        />
      </div>
      
      {/* Output Panel --- (Layout Fix) --- */}
      <div 
        className="flex-shrink-0"
        style={{ height: '250px' }} // Absolute pixel height
      >
        <OutputPanel output={execOutput} isLoading={isLoadingCode} />
      </div>
    </div>
  );
}