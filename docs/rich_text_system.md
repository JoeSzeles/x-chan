# Rich Text System Documentation

## Overview
The rich text system provides advanced text formatting capabilities for posts, comments, and replies. It consists of two main components:
- `RichTextEditor`: For creating and editing formatted content
- `RichTextContent`: For rendering formatted content

## Features

### Text Formatting
- **Bold**: Wrap text with `**` (e.g., `**bold text**`)
- **Italic**: Wrap text with `*` (e.g., `*italic text*`)
- **Underline**: Wrap text with `__` (e.g., `__underlined text__`)
- **Strikethrough**: Wrap text with `~~` (e.g., `~~strikethrough text~~`)
- **Inline Code**: Wrap text with backticks (e.g., `` `code` ``)
- **Greentext**: Start a line with `>` (e.g., `>be me`)

### Code Blocks
- Use triple backticks with optional language specification:
```
```javascript
const hello = "world";
console.log(hello);
```
```

### Smart Features
1. **Mentions**
   - Type `@` followed by username
   - Auto-complete dropdown appears
   - Click to select user
   - Renders as clickable link to user profile

2. **Hashtags**
   - Type `#` followed by text
   - Automatically detected and rendered as clickable links
   - Links to hashtag search page

3. **Links**
   - URLs automatically detected and converted to clickable links
   - Opens in new tab with security attributes

4. **Greentext**
   - Start a line with `>` to create greentext
   - Text appears in green color
   - Commonly used for storytelling or quoting
   - Each line must start with `>` to be considered greentext

## Components

### RichTextEditor
Located at: `frontend/src/components/common/RichTextEditor.jsx`

#### Props
- `value`: Current content value
- `onChange`: Callback when content changes
- `placeholder`: Placeholder text
- `className`: Additional CSS classes

#### Usage
```jsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyComponent() {
    const [content, setContent] = useState('');

    return (
        <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="What's happening?"
        />
    );
}
```

### RichTextContent
Located at: `frontend/src/components/common/RichTextContent.jsx`

#### Props
- `content`: The formatted content to render
- `className`: Additional CSS classes

#### Usage
```jsx
import RichTextContent from '../components/common/RichTextContent';

function MyComponent() {
    const content = "Hello **world**! Check out @username and #hashtag\n>be me";

    return <RichTextContent content={content} />;
}
```

## Implementation Details

### Content Processing
1. **Text Segmentation**
   - Content is split into segments (text, mentions, hashtags, links, greentext)
   - Each segment is processed independently
   - Maintains proper order and spacing

2. **Formatting Processing**
   - Text segments are processed for formatting markers
   - Formatting is applied using HTML tags
   - Security measures prevent XSS attacks

3. **Code Block Processing**
   - Code blocks are identified using regex
   - Language is detected from the opening marker
   - Syntax highlighting is applied using Prism.js

4. **Greentext Processing**
   - Lines starting with `>` are identified using regex
   - Each greentext line is processed as a separate segment
   - Rendered with green color styling

### State Management
- Editor maintains cursor position during formatting
- Preserves selection when applying formatting
- Handles keyboard shortcuts for formatting

### Security
- HTML sanitization for formatted text
- Safe link handling with `rel="noopener noreferrer"`
- XSS prevention in content rendering

## Best Practices

### Content Creation
1. Use formatting sparingly for better readability
2. Keep code blocks concise and well-formatted
3. Use mentions and hashtags appropriately
4. Preview content before posting
5. Use greentext for storytelling or quoting

### Performance
1. Debounce content processing for large texts
2. Lazy load syntax highlighting
3. Cache processed content when possible
4. Use memoization for expensive operations

### Accessibility
1. Maintain proper heading hierarchy
2. Ensure sufficient color contrast
3. Provide alt text for images
4. Support keyboard navigation

## Future Enhancements
1. Image upload and embedding
2. Table support
3. Custom emoji picker
4. Rich text import/export
5. Collaborative editing
6. Version history

## Dependencies
- `react-syntax-highlighter`: For code block syntax highlighting
- `react-router-dom`: For navigation in mentions and hashtags
- Tailwind CSS: For styling

## Error Handling
1. Invalid formatting is gracefully handled
2. Failed user mentions show as plain text
3. Invalid code blocks are rendered as plain text
4. Network errors during user search are handled

## Testing
1. Unit tests for content processing
2. Integration tests for editor functionality
3. E2E tests for user interactions
4. Performance testing for large content 