
import React from 'react';
import YouTubeEmbed from '../components/common/YouTubeEmbed';

const YouTubeTestPage = () => {
  const testUrl = "https://www.youtube.com/watch?v=LToUMdd_xEQ&t=213s";
  
  console.log('[YouTubeTestPage] Rendering with URL:', testUrl);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">YouTube Embed Test Page</h1>
      <div className="max-w-3xl mx-auto">
        <YouTubeEmbed url={testUrl} />
      </div>
    </div>
  );
};

export default YouTubeTestPage;
