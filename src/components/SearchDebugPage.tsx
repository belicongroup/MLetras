import { useEffect, useState, useCallback } from "react";
import SearchPage from "@/components/SearchPage";

const MAX_LOG_ENTRIES = 200;

const SearchDebugPage = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [focusCount, setFocusCount] = useState(0);
  const [blurCount, setBlurCount] = useState(0);

  const appendLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    const formatted = `${timestamp} ${message}`;
    setLogs((prev) =>
      [...prev, formatted].slice(-MAX_LOG_ENTRIES),
    );
    // eslint-disable-next-line no-console
    console.debug(formatted);
  }, []);

  useEffect(() => {
    const handleLogEvent = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const message = customEvent.detail ?? "";
      appendLog(message);
      if (message.includes("input focus")) {
        setFocusCount((count) => count + 1);
      }
      if (message.includes("input blur")) {
        setBlurCount((count) => count + 1);
      }
    };

    window.addEventListener("search-debug-log", handleLogEvent as EventListener);

    return () => {
      window.removeEventListener(
        "search-debug-log",
        handleLogEvent as EventListener,
      );
    };
  }, [appendLog]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="safe-area bg-muted/40 border-b border-border px-6 py-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Search Debugger</h1>
            <p className="text-sm text-muted-foreground">
              This view renders the real search screen so we can capture keyboard focus/blur behaviour without modifying production UI.
            </p>
          </div>
          <div className="shrink-0 text-sm text-muted-foreground leading-tight">
            <p>Focus events: <span className="font-semibold text-primary">{focusCount}</span></p>
            <p>Blur events: <span className="font-semibold text-primary">{blurCount}</span></p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>Tip: keep this console pinned while testing. Logs reset on reload.</p>
        </div>
      </header>

      <main className="safe-area grid lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="border-r border-border/60 bg-background">
          <SearchPage />
        </section>
        <aside className="bg-muted/30 border-l border-border/60 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-2rem)]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Focus & Blur Log
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet. Focus the search input on the left to start logging. Each log also appears in the Safari console.
            </p>
          ) : (
            <div className="space-y-1 text-xs font-mono leading-relaxed">
              {logs.slice().reverse().map((entry, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {entry}
                </p>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

export default SearchDebugPage;

