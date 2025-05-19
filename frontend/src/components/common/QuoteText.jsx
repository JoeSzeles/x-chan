import React from 'react';
import PostNumberLink from './PostNumberLink';

const QuoteText = ({ text, onQuoteClick }) => {
  if (!text) return null;

  const renderText = (text) => {
    // Split the text into parts by newlines
    const parts = text.split('\n');
    return parts.map((part, index) => {
      // Check if the part is a quote (starts with >)
      if (part.startsWith('>')) {
        return <div key={index} className="text-green-500">{part}</div>;
      }
      // Check if the part is a post number reference
      else if (part.startsWith('>>')) {
        const postNumber = part.slice(2);
        return (
          <div key={index}>
            <PostNumberLink postNumber={postNumber} />
          </div>
        );
      }
      // Regular text
      return <div key={index}>{part}</div>;
    });
  };

  const renderGreenText = (text) => {
    const greenTextPattern = /^>((?!>).+)$/gm;
    const parts = text.split('\n').map((line, index) => {
      const match = line.match(greenTextPattern);
      if (match) {
        return (
          <div key={index} className="text-green-500">
            {line}
          </div>
        );
      }
      return <div key={index}>{line}</div>;
    });

    return <>{parts}</>;
  };

  return <div className="whitespace-pre-wrap">{renderText(text)}</div>;
};

export default QuoteText;