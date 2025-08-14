import { useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api'; // The URL of your new Python backend

const YoutubeDownloader = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideoData, setCurrentVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('mp4');
  const [message, setMessage] = useState('');

  // Custom SVG Icons
  const YoutubeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-red-600" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );

  const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  const AlertIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );

  const MessageModal = ({ text, onClose }) => {
    if (!text) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-gray-900 text-white p-6 rounded-lg shadow-2xl max-w-sm w-full relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close message"
          >
            <CloseIcon />
          </button>
          <p className="text-lg text-center">{text}</p>
        </div>
      </div>
    );
  };

  const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const fetchVideoInfo = async () => {
    const url = videoUrl.trim();
    if (!url) {
      setError('Please enter a YouTube video URL');
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentVideoData(null);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/fetch-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video information');
      }

      const videoData = await response.json();
      setCurrentVideoData(videoData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateDownload = (quality) => {
    if (!currentVideoData) return;
    const format = activeTab;
    const videoId = currentVideoData.id;

    // Trigger download by redirecting to the download endpoint
    window.location.href = `${API_BASE_URL}/download-video?id=${videoId}&format=${format}&quality=${quality}`;
    setMessage(`Your download for the ${quality} ${format} file should begin shortly.`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchVideoInfo();
    }
  };

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <MessageModal text={message} onClose={() => setMessage('')} />
        
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <YoutubeIcon />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent ml-3">
              YouTube Downloader
            </h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Download YouTube videos in high quality MP4 or extract MP3 audio. Fast, free and unlimited!
          </p>
        </header>

        {/* Main Content */}
        <main>
          {/* URL Input Section */}
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl p-6 shadow-lg mb-10">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Paste YouTube URL here..."
                className="flex-grow px-5 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-red-600 text-white transition-all"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={fetchVideoInfo}
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <SearchIcon /> Fetch Video
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
            </div>
          </div>

          {/* Results Section */}
          {currentVideoData && !loading && !error && (
            <div className="max-w-3xl mx-auto">
              {/* Video Info */}
              <div className="bg-gray-900 rounded-xl p-6 shadow-lg mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img 
                      src={currentVideoData.thumbnail} 
                      alt="Video thumbnail" 
                      className="w-full rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+VGh1bWJuYWlsIE5vdCBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  <div className="md:w-2/3">
                    <h2 className="text-xl font-bold mb-2">{currentVideoData.title}</h2>
                    <div className="flex items-center text-gray-400 mb-4">
                      <span className="mr-4">{currentVideoData.duration}</span>
                      <span>{currentVideoData.views}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{currentVideoData.description}</p>
                  </div>
                </div>
              </div>

              {/* Download Options */}
              <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DownloadIcon /> Download Options
                </h3>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 mb-6">
                  <button
                    onClick={() => setActiveTab('mp4')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'mp4' 
                        ? 'text-white border-b-2 border-red-600' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    MP4 Video
                  </button>
                  <button
                    onClick={() => setActiveTab('mp3')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'mp3' 
                        ? 'text-white border-b-2 border-red-600' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    MP3 Audio
                  </button>
                </div>

                {/* MP4 Options */}
                {activeTab === 'mp4' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">High Quality</h4>
                      <div className="flex flex-wrap gap-2">
                        {['1080', '720', '480'].map((quality) => (
                          <button
                            key={quality}
                            onClick={() => initiateDownload(quality)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                          >
                            {quality}p
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Standard Quality</h4>
                      <div className="flex flex-wrap gap-2">
                        {['360', '240', '144'].map((quality) => (
                          <button
                            key={quality}
                            onClick={() => initiateDownload(quality)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
                          >
                            {quality}p
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MP3 Options */}
                {activeTab === 'mp3' && (
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-3">Audio Quality</h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { quality: 'high', label: 'High Quality (320kbps)', color: 'bg-red-600 hover:bg-red-700' },
                        { quality: 'medium', label: 'Medium Quality (192kbps)', color: 'bg-gray-700 hover:bg-gray-600' },
                        { quality: 'low', label: 'Low Quality (128kbps)', color: 'bg-gray-700 hover:bg-gray-600' },
                      ].map(({ quality, label, color }) => (
                        <button
                          key={quality}
                          onClick={() => initiateDownload(quality)}
                          className={`px-4 py-2 ${color} rounded-md text-sm font-medium transition-colors`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-900 rounded-xl p-8 shadow-lg text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-lg">Fetching video information...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-900 rounded-xl p-8 shadow-lg text-center">
                <div className="text-red-500 text-4xl mb-4 flex justify-center">
                  <AlertIcon />
                </div>
                <p className="text-lg mb-4">{error}</p>
                <button
                  onClick={fetchVideoInfo}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Disclaimer: This tool is for educational purposes only. Download only videos you have permission to.</p>
          <p className="mt-2">© 2024 YouTube Downloader. Not affiliated with YouTube.</p>
        </footer>
      </div>
    </div>
  );
};

export default YoutubeDownloader;
