import React, { useState, useEffect } from 'react';

const DashboardCarousel = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const slides = [
        {
            title: "Get a link you can share",
            description: "Click New meeting to get a link you can send to people you want to meet with",
            illustration: (
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="150" r="140" fill="#E8F0FE" />
                    {/* Central Link Icon Bubble */}
                    <circle cx="200" cy="80" r="30" fill="#1A73E8" />
                    <path d="M190 80h20m-5-5l5 5-5 5m-10-5l-5 5-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
                    <path d="M192 80c0-4.4 3.6-8 8-8h5c4.4 0 8 3.6 8 8v0c0 4.4-3.6 8-8 8h-5c-4.4 0-8-3.6-8-8v0z" stroke="white" strokeWidth="4" />
                    <path d="M187 80c0-4.4 3.6-8 8-8h5c4.4 0 8 3.6 8 8v0c0 4.4-3.6 8-8 8h-5c-4.4 0-8-3.6-8-8v0z" stroke="white" strokeWidth="4" transform="translate(16, 0)" />

                    {/* Link Icon */}
                    <path d="M194 80h12M190 80a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v0zM200 80a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v0z" stroke="white" strokeWidth="3" strokeLinecap="round" />

                    {/* Left Person */}
                    <g transform="translate(100, 120)">
                        <path d="M40 80v60H10v-60c0-10 10-20 20-20h0c10 0 10 10 10 20z" fill="#4285F4" opacity="0.2" /> {/* Chair/Legs */}
                        <path d="M30 0c8 0 14 6 14 14v10H16V14c0-8 6-14 14-14z" fill="#FFD54F" /> {/* Shirt */}
                        <circle cx="30" cy="-15" r="10" fill="#FFA726" /> {/* Head */}
                        <path d="M44 24l26 26" stroke="#FFD54F" strokeWidth="8" strokeLinecap="round" /> {/* Arm */}
                        <rect x="50" y="50" width="40" height="30" rx="2" fill="#E0E0E0" transform="skewX(-10)" /> {/* Laptop Base */}
                        <path d="M50 50l-5-25h40l5 25z" fill="#90CAF9" opacity="0.5" /> {/* Laptop Screen */}
                    </g>

                    {/* Right Person */}
                    <g transform="translate(260, 120) scale(-1, 1)">
                        <path d="M40 80v60H10v-60c0-10 10-20 20-20h0c10 0 10 10 10 20z" fill="#34A853" opacity="0.2" />
                        <path d="M30 0c8 0 14 6 14 14v10H16V14c0-8 6-14 14-14z" fill="#34A853" />
                        <circle cx="30" cy="-15" r="10" fill="#5D4037" />
                        <path d="M44 24l26 26" stroke="#34A853" strokeWidth="8" strokeLinecap="round" />
                        <rect x="50" y="50" width="40" height="30" rx="2" fill="#E0E0E0" transform="skewX(-10)" />
                        <path d="M50 50l-5-25h40l5 25z" fill="#90CAF9" opacity="0.5" />
                    </g>

                    {/* Table */}
                    <path d="M120 180h160M140 180l10 80M260 180l-10 80M180 180l-5 80M220 180l5 80" stroke="#E0E0E0" strokeWidth="4" strokeLinecap="round" />
                </svg>
            )
        },
        {
            title: "Plan ahead",
            description: "Click New meeting to schedule meetings in Google Calendar and send invites to participants",
            illustration: (
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="150" r="140" fill="#E8F0FE" />
                    {/* Calendar Icon */}
                    <rect x="130" y="80" width="140" height="140" rx="12" fill="#4285F4" />
                    <rect x="130" y="110" width="140" height="110" rx="12" fill="white" />
                    {/* Calendar Header Line */}
                    <path d="M130 110h140" stroke="#E0E0E0" strokeWidth="1" />

                    {/* Grid */}
                    <path d="M130 145h140M130 180h140M165 110v110M200 110v110M235 110v110" stroke="#E8F0FE" strokeWidth="2" />

                    {/* Check Item */}
                    <circle cx="148" cy="128" r="4" fill="#34A853" />
                    <rect x="158" y="125" width="30" height="6" rx="3" fill="#E0E0E0" />

                    {/* Event Block */}
                    <rect x="202" y="147" width="31" height="31" rx="4" fill="#4285F4" opacity="0.2" />
                    <rect x="202" y="147" width="4" height="31" rx="2" fill="#4285F4" />

                    <circle cx="148" cy="163" r="4" fill="#FBBC04" />
                    <rect x="158" y="160" width="30" height="6" rx="3" fill="#E0E0E0" />

                    {/* Notification */}
                    <g transform="translate(250, 130)">
                        <rect x="0" y="0" width="60" height="80" rx="6" fill="white" stroke="#E0E0E0" strokeWidth="2" transform="rotate(10)" />
                        <rect x="10" y="15" width="40" height="4" rx="2" fill="#4285F4" transform="rotate(10)" />
                        <rect x="10" y="25" width="30" height="4" rx="2" fill="#E0E0E0" transform="rotate(10)" />
                    </g>
                </svg>
            )
        },
        {
            title: "Your meeting is safe",
            description: "No change to join unless invited. Meetings are secured with encryption to keep data safe",
            illustration: (
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="150" r="140" fill="#E8F0FE" />
                    {/* Shield */}
                    <path d="M200 60 C 240 70, 280 90, 280 140 C 280 200, 200 240, 200 240 C 200 240, 120 200, 120 140 C 120 90, 160 70, 200 60 Z" fill="white" stroke="#4285F4" strokeWidth="2" />
                    <path d="M200 70 C 230 80, 260 95, 260 140 C 260 190, 200 220, 200 220" fill="#E8F0FE" />

                    {/* Lock Icon */}
                    <rect x="175" y="130" width="50" height="40" rx="4" fill="#34A853" />
                    <path d="M185 130v-10a15 15 0 0 1 30 0v10" stroke="#34A853" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="200" cy="150" r="4" fill="white" />

                    {/* Decorative Elements */}
                    <circle cx="150" cy="100" r="6" fill="#FBBC04" opacity="0.6" />
                    <circle cx="250" cy="200" r="8" fill="#EA4335" opacity="0.6" />
                </svg>
            )
        }
    ];

    const nextSlide = () => {
        setActiveIndex((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
            <div className="w-64 h-64 sm:w-80 sm:h-80 mb-8 relative">
                <div className="absolute inset-0 transition-opacity duration-500 ease-in-out">
                    {slides[activeIndex].illustration}
                </div>
            </div>

            <div className="space-y-3 min-h-[120px]">
                <h3 className="text-2xl font-normal text-gray-900">{slides[activeIndex].title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-[280px] mx-auto">
                    {slides[activeIndex].description}
                </p>
            </div>

            <div className="flex items-center gap-4 mt-8">
                <button
                    onClick={prevSlide}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label="Previous slide"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex gap-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? 'bg-blue-600 w-2.5 h-2.5' : 'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextSlide}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label="Next slide"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default DashboardCarousel;
