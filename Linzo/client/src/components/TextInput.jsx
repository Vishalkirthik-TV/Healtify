import React, { useState } from 'react';

const TextInput = ({ onTextChange, placeholder = "Type text to translate to sign language..." }) => {
  const [text, setText] = useState('');

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    if (onTextChange) {
      onTextChange(newText);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && onTextChange) {
      onTextChange(text.trim());
    }
  };

  const clearText = () => {
    setText('');
    if (onTextChange) {
      onTextChange('');
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <h4 className="text-lg font-semibold text-gray-700 mb-4">
        Text Input
      </h4>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Text:
            </label>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder={placeholder}
              className="w-full min-h-24 p-3 border border-gray-300 rounded-md text-sm font-sans resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={clearText}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
            >
              Clear
            </button>
            
            <button
              type="submit"
              disabled={!text.trim()}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                !text.trim() 
                  ? 'bg-gray-500 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Translate
            </button>
          </div>
        </div>
      </form>
      
      {text.trim() && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-sm">
          <span className="font-semibold">Current text:</span> {text}
        </div>
      )}
    </div>
  );
};

export default TextInput;
