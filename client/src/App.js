import React, { useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [mode, setMode] = useState('transcript'); // 'url' or 'transcript'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showAnswers, setShowAnswers] = useState({});

  // Handle URL form submission
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setShowAnswers({});

    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/videos/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process video');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle transcript form submission
  const handleTranscriptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setShowAnswers({});

    if (!transcript.trim() || transcript.trim().length < 50) {
      setError('Please enter a transcript with at least 50 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/videos/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title: title || 'My Video' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process transcript');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (index) => {
    setShowAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 YouTube Learning Assistant</h1>
        <p>Transform videos into structured learning content using AI</p>
      </header>

      <main className="main">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'transcript' ? 'active' : ''}`}
            onClick={() => setMode('transcript')}
          >
            📝 Paste Transcript
          </button>
          <button 
            className={`mode-btn ${mode === 'url' ? 'active' : ''}`}
            onClick={() => setMode('url')}
          >
            🔗 YouTube URL
          </button>
        </div>

        {/* Transcript Mode */}
        {mode === 'transcript' && (
          <form onSubmit={handleTranscriptSubmit} className="input-form">
            <input
              type="text"
              placeholder="Video title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="url-input"
              disabled={loading}
            />
            <textarea
              placeholder="Paste your video transcript here... (minimum 50 characters)"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="transcript-input"
              disabled={loading}
              rows={8}
            />
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '⏳ Processing...' : '🚀 Generate Learning Content'}
            </button>
          </form>
        )}

        {/* URL Mode */}
        {mode === 'url' && (
          <form onSubmit={handleUrlSubmit} className="input-form">
            <input
              type="text"
              placeholder="Paste YouTube video URL here..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="url-input"
              disabled={loading}
            />
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '⏳ Processing...' : '🚀 Generate Learning Content'}
            </button>
            <p className="hint">⚠️ Note: YouTube URL mode may not work for all videos due to caption restrictions</p>
          </form>
        )}

        {/* Error */}
        {error && <div className="error-message">❌ {error}</div>}

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Generating content with AI...</p>
            <p className="loading-note">This may take 15-30 seconds</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="results">
            {result.title && (
              <section className="result-section">
                <h2>📹 {result.title}</h2>
              </section>
            )}

            <section className="result-section">
              <h2>📝 Summary</h2>
              <div className="content-box">
                <p>{result.summary}</p>
              </div>
            </section>

            <section className="result-section">
              <h2>🎯 Key Learning Points</h2>
              <div className="content-box">
                <ul className="key-points">
                  {result.keyPoints && result.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="result-section">
              <h2>❓ Quiz Questions ({result.quizQuestions?.length || 0})</h2>
              <div className="quiz-container">
                {result.quizQuestions && result.quizQuestions.map((q, index) => (
                  <div key={index} className="quiz-question">
                    <h3>Question {index + 1}</h3>
                    <p className="question-text">{q.question}</p>
                    <ul className="options">
                      {q.options && q.options.map((option, optIndex) => (
                        <li 
                          key={optIndex}
                          className={showAnswers[index] && option === q.correctAnswer ? 'correct' : ''}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                    <button className="show-answer-btn" onClick={() => toggleAnswer(index)}>
                      {showAnswers[index] ? '🙈 Hide Answer' : '👁 Show Answer'}
                    </button>
                    {showAnswers[index] && (
                      <p className="answer">✅ Correct Answer: {q.correctAnswer}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Built with MERN Stack + Groq AI</p>
      </footer>
    </div>
  );
}

export default App;
