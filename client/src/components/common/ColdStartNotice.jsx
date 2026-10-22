import React, { useState, useEffect } from 'react';
import { Wifi, Sparkles, RefreshCw, X, AlertCircle } from 'lucide-react';
import { subscribeColdStart } from '../../services/apiClient';
import { useHealth } from '../../hooks/useHealth';

export const ColdStartNotice = () => {
  const [isSlowRequest, setIsSlowRequest] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isConnected, isHealthLoading, healthError, refetchHealth } = useHealth();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to in-flight API requests taking longer than 2.5s
    const unsubscribe = subscribeColdStart((slow) => {
      setIsSlowRequest(slow);
      if (!slow) {
        setIsDismissed(false); // Reset dismissal when server connection resolves
      }
    });
    return unsubscribe;
  }, []);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      await refetchHealth();
    } finally {
      setIsRetrying(false);
    }
  };

  // Determine if we should display the cold-start notice
  const showNotice =
    !isDismissed &&
    (isSlowRequest || (isHealthLoading && !isConnected) || (healthError && !isConnected));

  if (!showNotice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gradient-to-r from-teal-600 to-indigo-600 text-white px-4 py-2.5 shadow-md relative z-40 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <p className="font-medium tracking-wide">
            {healthError && !isSlowRequest ? (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 inline-block text-amber-300 flex-shrink-0" />
                Backend instance is starting up. The initial connection may take up to 45 seconds on Render Free.
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 inline-block animate-pulse text-teal-200 flex-shrink-0" />
                Connecting to EnhanceUs… The server is waking up from sleep mode (~30–45s on first request).
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {(healthError || isSlowRequest) && (
            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isRetrying}
              aria-label="Retry server connection"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Checking...' : 'Check Status'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss cold start notice"
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColdStartNotice;
