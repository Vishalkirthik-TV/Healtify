import React from 'react';

const Loader = ({ size = "medium", color = "#684CFE" }) => {
    const sizeClasses = {
        small: "w-5 h-5",
        medium: "w-8 h-8",
        large: "w-12 h-12"
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div
                className={`${sizeClasses[size]} border-4 border-solid rounded-full animate-spin`}
                style={{
                    borderColor: `${color}20`, // transparent version of color
                    borderTopColor: color
                }}
                role="status"
            >
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    );
};

export default Loader;
