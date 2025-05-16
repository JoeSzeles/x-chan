import { useState } from 'react';
import RichTextEditor from './RichTextEditor';
import RichTextContent from './RichTextContent';

const RichTextDemo = () => {
    const [content, setContent] = useState('');

    const exampleContent = `# Rich Text Demo

This is a **bold** text example.
This is an *italic* text example.
This is an __underlined__ text example.
This is a ~~strikethrough~~ text example.
This is an inline \`code\` example.

Here's a code block:
\`\`\`javascript
function hello() {
    console.log("Hello, world!");
}
\`\`\`

Mention example: @username
Hashtag example: #coding
Link example: https://example.com

Greentext examples:
>be me
>wake up
>check twitter
>see this post
>mfw

Try it yourself below!`;

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Rich Text Editor</h2>
                <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Start typing... Use **bold**, *italic*, __underline__, ~~strikethrough~~, \`code\`, @mentions, #hashtags, >greentext, and links!"
                />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Preview</h2>
                <RichTextContent content={content} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Example</h2>
                <RichTextContent content={exampleContent} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Formatting Guide</h2>
                <div className="space-y-2">
                    <p><code>**text**</code> - Bold text</p>
                    <p><code>*text*</code> - Italic text</p>
                    <p><code>__text__</code> - Underlined text</p>
                    <p><code>~~text~~</code> - Strikethrough text</p>
                    <p><code>`text`</code> - Inline code</p>
                    <p><code>```language\ncode\n```</code> - Code block</p>
                    <p><code>@username</code> - Mention a user</p>
                    <p><code>#hashtag</code> - Create a hashtag</p>
                    <p><code>&gt;text</code> - Greentext (start line with &gt;)</p>
                    <p>URLs are automatically converted to links</p>
                </div>
            </div>
        </div>
    );
};

export default RichTextDemo; 