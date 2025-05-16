import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaCode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const RichTextEditor = ({ 
    initialValue = '', 
    onChange, 
    placeholder = 'What\'s happening?',
    maxLength = 1000,
    className = ''
}) => {
    const [content, setContent] = useState(initialValue);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [isMentionOpen, setIsMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const editorRef = useRef(null);
    const mentionListRef = useRef(null);

    // Fetch users for mentions
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users', mentionQuery],
        queryFn: async () => {
            if (!mentionQuery) return [];
            const res = await fetch(`/api/users/search?q=${mentionQuery}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        enabled: mentionQuery.length > 0
    });

    // Handle text changes
    const handleChange = (e) => {
        const newContent = e.target.value;
        if (newContent.length <= maxLength) {
            setContent(newContent);
            onChange?.(newContent);
            processContent(newContent);
        }
    };

    // Process content for mentions, hashtags, and links
    const processContent = (text) => {
        // Process mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = [...text.matchAll(mentionRegex)].map(match => ({
            username: match[1],
            position: { start: match.index, end: match.index + match[0].length }
        }));

        // Process hashtags
        const hashtagRegex = /#(\w+)/g;
        const hashtags = [...text.matchAll(hashtagRegex)].map(match => ({
            tag: match[1],
            position: { start: match.index, end: match.index + match[0].length }
        }));

        // Process links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = [...text.matchAll(urlRegex)].map(match => ({
            url: match[0],
            position: { start: match.index, end: match.index + match[0].length }
        }));

        return { mentions, hashtags, links };
    };

    // Handle formatting
    const applyFormatting = (format) => {
        const textarea = editorRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        let newText = content;

        switch (format) {
            case 'bold':
                newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
                break;
            case 'italic':
                newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
                break;
            case 'underline':
                newText = content.substring(0, start) + `__${selectedText}__` + content.substring(end);
                break;
            case 'strikethrough':
                newText = content.substring(0, start) + `~~${selectedText}~~` + content.substring(end);
                break;
            case 'code':
                newText = content.substring(0, start) + `\`${selectedText}\`` + content.substring(end);
                break;
            default:
                break;
        }

        setContent(newText);
        onChange?.(newText);
    };

    // Handle mention selection
    const handleMentionSelect = (user) => {
        const textarea = editorRef.current;
        const start = textarea.selectionStart - mentionQuery.length - 1;
        const end = textarea.selectionStart;
        const newContent = content.substring(0, start) + `@${user.username} ` + content.substring(end);
        
        setContent(newContent);
        onChange?.(newContent);
        setIsMentionOpen(false);
        setMentionQuery('');
    };

    // Handle key events
    const handleKeyDown = (e) => {
        if (e.key === '@') {
            const textarea = editorRef.current;
            const rect = textarea.getBoundingClientRect();
            const position = {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            };
            setMentionPosition(position);
            setIsMentionOpen(true);
        }
    };

    // Handle selection changes
    const handleSelect = () => {
        const textarea = editorRef.current;
        setSelection({
            start: textarea.selectionStart,
            end: textarea.selectionEnd
        });
    };

    return (
        <div className={`relative ${className}`}>
            {/* Formatting Toolbar */}
            <div className="flex gap-2 p-2 bg-[#272525] rounded-t-lg border-b border-gray-700">
                <button
                    onClick={() => applyFormatting('bold')}
                    className="p-2 hover:bg-gray-700 rounded"
                    title="Bold"
                >
                    <FaBold className="w-4 h-4" />
                </button>
                <button
                    onClick={() => applyFormatting('italic')}
                    className="p-2 hover:bg-gray-700 rounded"
                    title="Italic"
                >
                    <FaItalic className="w-4 h-4" />
                </button>
                <button
                    onClick={() => applyFormatting('underline')}
                    className="p-2 hover:bg-gray-700 rounded"
                    title="Underline"
                >
                    <FaUnderline className="w-4 h-4" />
                </button>
                <button
                    onClick={() => applyFormatting('strikethrough')}
                    className="p-2 hover:bg-gray-700 rounded"
                    title="Strikethrough"
                >
                    <FaStrikethrough className="w-4 h-4" />
                </button>
                <button
                    onClick={() => applyFormatting('code')}
                    className="p-2 hover:bg-gray-700 rounded"
                    title="Code"
                >
                    <FaCode className="w-4 h-4" />
                </button>
            </div>

            {/* Editor */}
            <textarea
                ref={editorRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                placeholder={placeholder}
                className="w-full p-4 bg-[#1e1e1e] rounded-b-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-none min-h-[100px]"
            />

            {/* Character Count */}
            <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                {content.length}/{maxLength}
            </div>

            {/* Mentions Dropdown */}
            {isMentionOpen && (
                <div
                    ref={mentionListRef}
                    className="absolute z-50 bg-[#272525] border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    style={{
                        top: mentionPosition.top + 30,
                        left: mentionPosition.left
                    }}
                >
                    {isLoadingUsers ? (
                        <div className="p-2">
                            <LoadingSpinner size="sm" />
                        </div>
                    ) : users?.length > 0 ? (
                        users.map(user => (
                            <button
                                key={user._id}
                                onClick={() => handleMentionSelect(user)}
                                className="w-full p-2 hover:bg-gray-700 text-left flex items-center gap-2"
                            >
                                <img
                                    src={user.profileImg || "/avatar-placeholder.png"}
                                    alt={user.username}
                                    className="w-6 h-6 rounded-full"
                                />
                                <div>
                                    <div className="font-medium">{user.fullName}</div>
                                    <div className="text-sm text-gray-500">@{user.username}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-2 text-gray-500">No users found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RichTextEditor; 