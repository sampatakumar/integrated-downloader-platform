import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import DownloadQueue from './components/DownloadQueue/DownloadQueue';
import Home from './pages/Home/Home';
import History from './pages/History/History';
import Supported from './pages/Supported/Supported';
import Settings from './pages/Settings/Settings';
import { createDownloadJob, cancelDownloadJob, retryDownloadJob } from './services/api';
import { subscribeToProgress } from './services/downloadService';
import './App.css';

export default function App() {
  const [activeJobs, setActiveJobs] = useState([]);
  
  // Track open SSE connection cleanup functions: jobId -> unsubscribeCallback
  const [subscriptions] = useState(() => new Map());

  // Clean up all subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [subscriptions]);

  const handleQueueJob = async ({ url, format, quality, title }) => {
    try {
      // Determine title to display in queue immediately
      const jobTitle = title || 'Processing Media...';
      
      // Request backend to queue download
      const response = await createDownloadJob(url, format, quality, jobTitle);
      const { jobId } = response;

      // Add to frontend state
      const newJob = {
        id: jobId,
        url,
        format,
        quality,
        title: jobTitle,
        status: 'queued',
        percent: 0,
        speed: 'Waiting...',
        eta: '--:--',
        error: null
      };

      setActiveJobs(prev => [newJob, ...prev]);

      // Subscribe to real-time progress updates via SSE
      setupJobSubscription(jobId, url);

    } catch (err) {
      console.error('[App] Failed to queue job:', err);
      // Generate client-side failed card to inform user
      const failedJob = {
        id: Math.random().toString(), // temp ID
        url,
        format,
        quality,
        title: title || 'Queued Job',
        status: 'failed',
        percent: 0,
        speed: 'Failed to start',
        eta: '--:--',
        error: err.message || 'Server connection failed'
      };
      setActiveJobs(prev => [failedJob, ...prev]);
    }
  };

  const setupJobSubscription = (jobId, originalUrl) => {
    // Unsubscribe from existing if any
    if (subscriptions.has(jobId)) {
      subscriptions.get(jobId)();
    }

    const isHistoryLoggingEnabled = localStorage.getItem('mf_history_enabled') !== 'false';

    const unsubscribe = subscribeToProgress(
      jobId,
      originalUrl,
      // On Progress Update
      (updatedData) => {
        setActiveJobs(prev =>
          prev.map(job => (job.id === jobId ? { ...job, ...updatedData } : job))
        );
      },
      // On Error
      (err) => {
        console.error(`[SSE Error] Job ${jobId}:`, err);
        setActiveJobs(prev =>
          prev.map(job =>
            job.id === jobId
              ? { ...job, status: 'failed', error: 'Progress connection lost' }
              : job
          )
        );
      }
    );

    // Save unsubscribe handler
    subscriptions.set(jobId, unsubscribe);
  };

  const handleCancel = async (jobId) => {
    try {
      await cancelDownloadJob(jobId);
      // Close SSE connection
      if (subscriptions.has(jobId)) {
        subscriptions.get(jobId)();
        subscriptions.delete(jobId);
      }
      setActiveJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? { ...job, status: 'cancelled', speed: 'Cancelled', percent: 0 }
            : job
        )
      );
    } catch (err) {
      console.error('[App] Cancel request failed:', err);
    }
  };

  const handleRetry = async (jobId) => {
    const job = activeJobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      await retryDownloadJob(jobId);
      
      // Update local state to queued
      setActiveJobs(prev =>
        prev.map(j =>
          j.id === jobId
            ? { ...j, status: 'queued', percent: 0, speed: 'Waiting...', error: null }
            : j
        )
      );

      // Re-setup event listener
      setupJobSubscription(jobId, job.url);
    } catch (err) {
      console.error('[App] Retry request failed:', err);
    }
  };

  const handleRemove = (jobId) => {
    // Clean up connections if active
    if (subscriptions.has(jobId)) {
      subscriptions.get(jobId)();
      subscriptions.delete(jobId);
    }
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  };

  return (
    <Router>
      <div className="app-container">
        <Header />
        <div className="main-layout">
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Home onQueueJob={handleQueueJob} />} />
              <Route path="/history" element={<History />} />
              <Route path="/supported" element={<Supported />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          
          <DownloadQueue
            jobs={activeJobs}
            onCancel={handleCancel}
            onRetry={handleRetry}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </Router>
  );
}
