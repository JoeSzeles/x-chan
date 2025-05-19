import React from 'react';
import PostNumberLink from './PostNumberLink';

const QuoteText = ({ text, onQuoteClick }) => {
  if (!text) return null;

  const renderText = (text) => {
    const postNumberPattern = />>(\d{10})/g;
    const greenTextPattern = /^>((?!>).+)$/gm;
    const parts = [];
    let lastIndex = 0;

    // Handle post number quotes
    text.replace(postNumberPattern, (match, postNumber, index) => {
      // Add text before the match
      if (index > lastIndex) {
        const textBefore = text.slice(lastIndex, index);
        parts.push(renderGreenText(textBefore));
      }

      // Add the post number link component
      parts.push(
        <PostNumberLink
          key={`post-${index}`}
          postNumber={postNumber}
          onClick={() => onQuoteClick(postNumber)}
        />
      );

      lastIndex = index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(renderGreenText(remainingText));
    }

    return parts.length > 0 ? parts : renderGreenText(text);
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