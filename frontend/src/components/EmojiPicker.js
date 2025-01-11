import React from 'react';
import EmojiPicker from 'emoji-picker-react';

const EmojiPickerComponent = ({ onEmojiClick, pickerVisible, setPickerVisible }) => {
  return (
    <div className="emoji-picker-container">
      <EmojiPicker
        onEmojiClick={(emojiData) => {
          onEmojiClick(emojiData);
          if (setPickerVisible) {
            setPickerVisible(false);
          }
        }}
        autoFocusSearch={false}
      />
    </div>
  );
};

export default EmojiPickerComponent; 