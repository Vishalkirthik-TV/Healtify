import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

const HighlightText = ({ text }) => {
    if (!text) return null;

    // Regex for dates (e.g., 10th of December, Dec 10, 10/12)
    const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi;
    // Regex for numbers (simple digits, or range 5-6)
    const numberRegex = /\b(\d+(?:\s*to\s*\d+)?)\b/g;

    const parts = text.split(/(\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\b\d+(?:\s*to\s*\d+)?\b)/gi);

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (dateRegex.test(part)) {
                    // Create new regex instance to avoid stateful issues
                    return <mark key={i} className="bg-yellow-100 text-yellow-800 px-1 rounded font-medium border border-yellow-200">{part}</mark>;
                } else if (numberRegex.test(part)) {
                    return <mark key={i} className="bg-blue-100 text-blue-800 px-1 rounded font-medium border border-blue-200">{part}</mark>;
                }
                return part;
            })}
        </span>
    );
};

export default function CallDetails() {
    const { roomId } = useParams();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/meetings/${roomId}`)
            .then(res => {
                setMeeting(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch meeting details:', err);
                // If 401, it means the route is protected and user isn't logged in.
                // Since we made the route public, this shouldn't happen often,
                // but if it does, we can handle it.
                if (err.response && err.response.status === 401) {
                    // specific handling if needed, or just let it show "Meeting not found"
                }
                setLoading(false);
            });
    }, [roomId]);

    const handleExport = async (platform) => {
        if (platform === 'Notion') {
            try {
                alert('Exporting to Notion... This may take a few seconds.');
                const res = await api.post(`/meetings/${roomId}/export/notion`);
                if (res.data.success) {
                    alert('Successfully exported to Notion!');
                    window.open(res.data.url, '_blank');
                }
            } catch (err) {
                console.error('Notion export failed:', err);
                alert('Failed to export to Notion: ' + (err.response?.data?.message || err.message));
            }
            return;
        }

        // Mock integration logic for others
        alert(`Exporting summary to ${platform}... (Integration Placeholder)`);
        console.log(`[Integration] Exporting to ${platform}`, meeting?.summary);
    };

    const generateCalendarLink = () => {
        if (!meeting) return '#';
        try {
            // Use proposed date from AI if available, otherwise fallback to meeting start time
            const targetDateStr = meeting.proposedDate || meeting.startTime;
            const startDate = new Date(targetDateStr);
            if (isNaN(startDate.getTime())) return '#';

            const title = encodeURIComponent(`Meeting Summary: ${startDate.toLocaleDateString()}`);
            const details = encodeURIComponent(meeting.summary || 'No summary available.');
            // Default to 1 hour duration for the event
            const start = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
            const end = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');

            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;
        } catch (e) {
            console.error('Error generating calendar link:', e);
            return '#';
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[#684CFE] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading details...</p>
            </div>
        </div>
    );

    if (!meeting) return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Not Found</h2>
                <Link to="/summary-call" className="text-[#684CFE] hover:text-[#533bdb] font-medium">
                    Return to Lobby
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 p-4 sm:p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <Link to="/summary-call/history" className="text-gray-500 hover:text-[#684CFE] mb-6 inline-flex items-center gap-2 font-medium transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to History
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Details</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200">ID: {meeting.roomId}</span>
                            <span>•</span>
                            <span>{new Date(meeting.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <a
                            href={generateCalendarLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 md:flex-initial justify-center bg-white hover:bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                        >
                            📅 Google Calendar
                        </a>
                        <button
                            onClick={() => handleExport('Notion')}
                            className="flex-1 md:flex-initial justify-center bg-white hover:bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                        >
                            📝 Notion
                        </button>
                        <button
                            onClick={() => handleExport('Slack')}
                            className="flex-1 md:flex-initial justify-center bg-white hover:bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                        >
                            💬 Slack
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-8 ring-1 ring-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#684CFE]/20 flex items-center justify-center text-[#684CFE]">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                AI Summary
                            </h2>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                    <HighlightText text={meeting.summary || "No summary generated yet. This might be because the meeting was too short or no speech was detected."} />
                                </p>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Participants</h2>
                            <div className="flex flex-wrap gap-2">
                                {meeting.participants && meeting.participants.map((p, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transcript Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm h-[600px] flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Full Transcript
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/30">
                                {meeting.transcript && meeting.transcript.length > 0 ? (
                                    meeting.transcript.map((t, i) => (
                                        <div key={i} className="bg-white p-3 rounded-xl ring-1 ring-gray-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[#684CFE] text-xs font-bold uppercase tracking-wide">{t.speaker}</span>
                                                <span className="text-gray-400 text-[10px]">
                                                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed">{t.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p className="text-sm font-medium">No transcript available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
