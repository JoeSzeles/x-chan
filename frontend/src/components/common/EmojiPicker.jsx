import { useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EmojiPicker = ({ onSelect }) => {
    const [showPicker, setShowPicker] = useState(true);

    const handleEmojiSelect = (emoji) => {
        onSelect(emoji.native);
        setShowPicker(false);
    };

    return (
        <div className="relative">
            {showPicker && (
                <div className="absolute bottom-0 left-0 z-50">
                    <Picker
                        data={data}
                        onEmojiSelect={handleEmojiSelect}
                        theme="dark"
                        set="twitter"
                        previewPosition="none"
                        skinTonePosition="none"
                    />
                </div>
            )}
        </div>
    );
};

export default EmojiPicker; 