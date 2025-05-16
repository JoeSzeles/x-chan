import { Link } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const RichTextContent = ({ content, className = '' }) => {
    // Process the content and split it into segments
    const processContent = (text) => {
        const segments = [];
        let lastIndex = 0;

        // Process greentext
        const greentextRegex = /^>.*$/gm;
        let greentextMatch;
        while ((greentextMatch = greentextRegex.exec(text)) !== null) {
            // Add text before greentext
            if (greentextMatch.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.substring(lastIndex, greentextMatch.index)
                });
            }
            // Add greentext
            segments.push({
                type: 'greentext',
                content: greentextMatch[0].substring(1) // Remove the > symbol
            });
            lastIndex = greentextMatch.index + greentextMatch[0].length;
        }

        // Process mentions
        const mentionRegex = /@(\w+)/g;
        let mentionMatch;
        while ((mentionMatch = mentionRegex.exec(text)) !== null) {
            // Add text before mention
            if (mentionMatch.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.substring(lastIndex, mentionMatch.index)
                });
            }
            // Add mention
            segments.push({
                type: 'mention',
                content: mentionMatch[1]
            });
            lastIndex = mentionMatch.index + mentionMatch[0].length;
        }

        // Process hashtags
        const hashtagRegex = /#(\w+)/g;
        let hashtagMatch;
        while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
            // Add text before hashtag
            if (hashtagMatch.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.substring(lastIndex, hashtagMatch.index)
                });
            }
            // Add hashtag
            segments.push({
                type: 'hashtag',
                content: hashtagMatch[1]
            });
            lastIndex = hashtagMatch.index + hashtagMatch[0].length;
        }

        // Process links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let urlMatch;
        while ((urlMatch = urlRegex.exec(text)) !== null) {
            // Add text before URL
            if (urlMatch.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.substring(lastIndex, urlMatch.index)
                });
            }
            // Add URL
            segments.push({
                type: 'link',
                content: urlMatch[0]
            });
            lastIndex = urlMatch.index + urlMatch[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            segments.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }

        return segments;
    };

    // Process formatting
    const processFormatting = (text) => {
        // Process bold
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Process italic
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Process underline
        text = text.replace(/__(.*?)__/g, '<u>$1</u>');
        // Process strikethrough
        text = text.replace(/~~(.*?)~~/g, '<s>$1</s>');
        // Process code
        text = text.replace(/`(.*?)`/g, '<code>$1</code>');
        return text;
    };

    // Render segments
    const renderSegments = (segments) => {
        return segments.map((segment, index) => {
            switch (segment.type) {
                case 'greentext':
                    return (
                        <div key={index} className="text-green-500">
                            &gt;{segment.content}
                        </div>
                    );
                case 'mention':
                    return (
                        <Link
                            key={index}
                            to={`/profile/${segment.content}`}
                            className="text-blue-400 hover:underline"
                        >
                            @{segment.content}
                        </Link>
                    );
                case 'hashtag':
                    return (
                        <Link
                            key={index}
                            to={`/hashtag/${segment.content}`}
                            className="text-blue-400 hover:underline"
                        >
                            #{segment.content}
                        </Link>
                    );
                case 'link':
                    return (
                        <a
                            key={index}
                            href={segment.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            {segment.content}
                        </a>
                    );
                case 'text':
                    return (
                        <span
                            key={index}
                            dangerouslySetInnerHTML={{
                                __html: processFormatting(segment.content)
                            }}
                        />
                    );
                default:
                    return null;
            }
        });
    };

    // Process code blocks
    const processCodeBlocks = (text) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                const beforeText = text.substring(lastIndex, match.index);
                parts.push({
                    type: 'text',
                    content: beforeText
                });
            }

            // Add code block
            parts.push({
                type: 'code',
                language: match[1] || 'javascript',
                content: match[2].trim()
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }

        return parts;
    };

    // Render content
    const renderContent = () => {
        const parts = processCodeBlocks(content);
        return parts.map((part, index) => {
            if (part.type === 'code') {
                return (
                    <div key={index} className="my-2">
                        <SyntaxHighlighter
                            language={part.language}
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                borderRadius: '0.5rem',
                                backgroundColor: '#1e1e1e'
                            }}
                        >
                            {part.content}
                        </SyntaxHighlighter>
                    </div>
                );
            }
            return (
                <div key={index} className="whitespace-pre-wrap">
                    {renderSegments(processContent(part.content))}
                </div>
            );
        });
    };

    return (
        <div className={`rich-text-content ${className}`}>
            {renderContent()}
        </div>
    );
};

export default RichTextContent; 