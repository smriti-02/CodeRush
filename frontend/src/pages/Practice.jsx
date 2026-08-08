import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { Panel, Group, Separator } from "react-resizable-panels";
import { GripVertical, GripHorizontal, ArrowLeft } from "lucide-react";

const ALLOWED_LANGUAGES = {
    'javascript': { id: 93, label: 'JavaScript' },
    'python': { id: 71, label: 'Python' },
    'python3': { id: 71, label: 'Python' }, 
    'java': { id: 62, label: 'Java' },
    'cpp': { id: 54, label: 'C++' },
};

export default function Practice() {
  const { gameId } = useParams();
  
  const [questionData, setQuestionData] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [execResult, setExecResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestionData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/games/arena/${gameId}`, {
            withCredentials: true
        });
        const gameData = response.data.data;
        const question = gameData.question;

        if (!question) {
            console.error("No question found in this game record:", gameData);
            alert("Match data is corrupted (no question attached).");
            return;
        }
        
        setQuestionData(question);
        
        const defaultSnippet = question.codeSnippets.find(s => ALLOWED_LANGUAGES[s.langSlug]) || question.codeSnippets[0];
        if (defaultSnippet) {
          setCode(defaultSnippet.code);
          setLanguage(defaultSnippet.langSlug);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load question data:", error);
        alert("Error loading question data. Check console.");
      }
    };
    
    fetchQuestionData();
  }, [gameId]);

  const handleRunCode = async () => {
    setIsExecuting(true);
    const currentLangId = ALLOWED_LANGUAGES[language]?.id || 62;

    try {
        const response = await axios.post('http://localhost:8000/api/v1/judge/run', {
          questionId: questionData._id,
          sourceCode: code,
          langSlug: language,
          languageId: currentLangId,
          testCases: questionData.sampleTestCase,
          sessionId: gameId
        }, { withCredentials: true });

        const result = response.data?.data;
        setExecResult(result || null);
    } catch (error) {
        console.error("Execution crashed:", error);
        setExecResult({ status: 'Error', stdout: '', stderr: error.response?.data?.message || error.message || 'Error executing code' });
    } finally {
        setIsExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsExecuting(true);
    const currentLangId = ALLOWED_LANGUAGES[language]?.id || 62;

    try {
        const response = await axios.post('http://localhost:8000/api/v1/judge/submit', {
          questionId: questionData._id,
          sourceCode: code,
          langSlug: language,
          languageId: currentLangId,
          sessionId: gameId,
          wrongSubmissions: 0,
          userComplexity: 'O(n)' 
        }, { withCredentials: true });

        const data = response.data?.data;
        const result = data?.result;
        setExecResult(result || null);
    } catch (error) {
        console.error("Submission crashed:", error);
        setExecResult({ status: 'Error', stdout: '', stderr: error.response?.data?.message || error.message || 'Error executing code' });
    } finally {
        setIsExecuting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center font-mono">Loading Practice IDE...</div>;

  const availableLanguages = questionData.codeSnippets?.filter(s => ALLOWED_LANGUAGES[s.langSlug]) || [];

  return (
    <div className="h-screen w-screen bg-[#020503] text-gray-300 overflow-hidden font-sans flex flex-col">
      <div className="flex-none h-14 bg-[#111111] border-b border-neutral-800 flex justify-between items-center px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-[#39d353] font-display tracking-wide uppercase">Practice IDE</h2>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <Group orientation="horizontal" className="h-full rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a]">
          
          <Panel id="problem-panel" order={1} defaultSize={45} minSize={30}>
            <div className="h-full overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
              <div className="prose prose-invert prose-pre:bg-[#111111] prose-pre:border prose-pre:border-neutral-800 max-w-none flex-grow">
                <h1 className="text-3xl font-display font-bold text-white mb-4 leading-tight">{questionData.title}</h1>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase font-mono ${
                      questionData.difficulty === 'Easy' ? 'bg-[#39d353]/10 border-[#39d353]/30 text-[#39d353]' : 
                      questionData.difficulty === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                      'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                    {questionData.difficulty}
                  </span>
                  {questionData.topicTags?.map(tag => (
                      <span key={tag.slug} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-[11px] font-bold font-mono uppercase">
                          {tag.name}
                      </span>
                  ))}
                </div>
                
                <div className="text-gray-300 leading-relaxed font-body" dangerouslySetInnerHTML={{ __html: questionData.content }} />
              </div>
            </div>
          </Panel>

          <Separator className="w-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-col-resize z-10 group border-l border-r border-neutral-800">
             <div className="absolute inset-y-0 -left-2 -right-2" />
             <GripVertical size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
          </Separator>

          <Panel id="editor-panel" order={2} defaultSize={55} minSize={30}>
            <Group orientation="vertical">
              
              <Panel id="editor" order={1} defaultSize={65} minSize={20}>
                <div className="h-full flex flex-col bg-[#0a0a0a]">
                  
                  <div className="h-12 px-4 bg-[#111111] border-b border-neutral-800 flex justify-between items-center rounded-tr-xl">
                    <select 
                      value={language}
                      onChange={(e) => {
                          const newLang = e.target.value;
                          setLanguage(newLang);
                          const snippet = questionData.codeSnippets.find(s => s.langSlug === newLang);
                          if (snippet) setCode(snippet.code);
                      }}
                      className="bg-[#0a0a0a] border border-neutral-800 text-gray-300 text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#39d353] transition-colors cursor-pointer outline-none"
                    >
                      {availableLanguages.map(s => (
                          <option key={s.langSlug} value={s.langSlug}>{ALLOWED_LANGUAGES[s.langSlug].label}</option>
                      ))}
                    </select>
                    
                    <div className="flex items-center gap-3">
                      <button 
                          onClick={handleRunCode} 
                          disabled={isExecuting}
                          className="bg-[#1a1a1a] border border-neutral-700 text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold font-mono hover:bg-[#222] hover:text-white hover:border-neutral-500 transition-all disabled:opacity-50"
                      >
                          {isExecuting ? 'Running...' : 'Run'}
                      </button>
                      <button 
                          onClick={handleSubmitCode} 
                          disabled={isExecuting}
                          className="bg-[#39d353] text-black px-4 py-1.5 rounded-lg text-xs font-bold font-mono hover:bg-white hover:scale-105 transition-all shadow-[0_0_15px_rgba(57,211,83,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isExecuting ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-transparent">
                    <Editor
                      height="100%"
                      language={language === 'python3' ? 'python' : language}
                      theme="vs-dark"
                      value={code}
                      onChange={(val) => setCode(val)}
                      options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 14, 
                        fontFamily: "JetBrains Mono, monospace",
                        wordWrap: "on", 
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        renderLineHighlight: "all",
                        cursorBlinking: "smooth"
                      }}
                    />
                  </div>
                </div>
              </Panel>

              <Separator className="h-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-row-resize z-10 group border-t border-b border-neutral-800">
                <div className="absolute inset-x-0 -top-2 -bottom-2" />
                <GripHorizontal size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
              </Separator>

              <Panel id="console" order={2} defaultSize={35} minSize={20}>
                <div className="h-full p-6 bg-[#111111] overflow-auto rounded-br-xl custom-scrollbar">
                  <h3 className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-4">Execution Result</h3>
                  {isExecuting ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-4 text-gray-400">
                      <div className="w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-mono text-sm animate-pulse">Executing code in secure sandbox...</p>
                      <p className="font-mono text-xs text-gray-500">ETA: ~5s depending on server load</p>
                    </div>
                  ) : !execResult ? (
                    <p className="text-sm font-mono text-neutral-600 italic">No execution yet. Run your code to see outputs.</p>
                  ) : (
                    <div className="text-sm font-mono text-gray-300">
                      <div className="mb-4">
                        <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Status</strong> 
                        <span className={`px-2 py-1 rounded bg-black/50 border font-bold ${execResult.status === 'Accepted' ? 'border-[#39d353]/30 text-[#39d353]' : 'border-red-500/30 text-red-500'}`}>
                          {execResult.status}
                        </span>
                      </div>
                      
                      {execResult.stdout && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Stdout</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-neutral-800 p-3 rounded-lg text-gray-300">{execResult.stdout}</pre>
                        </div>
                      )}
                      
                      {execResult.stderr && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Stderr</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-red-900/30 p-3 rounded-lg text-red-400">{execResult.stderr}</pre>
                        </div>
                      )}
                      
                      {execResult.expected_output && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Expected</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-neutral-800 p-3 rounded-lg text-green-400">{execResult.expected_output}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>

            </Group>
          </Panel>

        </Group>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
