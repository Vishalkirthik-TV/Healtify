import React from 'react';

const SmartReplyPanel = ({ replies, onReplyClick, isLoading }) => {
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '8px',
                alignItems: 'center'
            }}>
                <span style={{ color: '#888', fontSize: '12px' }}>Generating suggestions...</span>
            </div>
        );
    }

    if (!replies || replies.length === 0) {
        return null;
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            maxWidth: '100%'
        }}>
            <div style={{
                fontSize: '11px',
                color: '#aaa',
                fontWeight: '500',
                marginBottom: '4px'
            }}>
                💡 Smart Replies
            </div>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                {replies.map((reply, index) => (
                    <button
                        key={index}
                        onClick={() => onReplyClick(reply)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#684CFE',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#533bdb';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#684CFE';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                        }}
                    >
                        {reply}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SmartReplyPanel;
