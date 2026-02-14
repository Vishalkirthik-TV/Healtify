import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function CallHistory() {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    useEffect(() => {
        api.get('/meetings/history')
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) {
                    setMeetings(data);
                } else {
                    console.error('Expected array of meetings, got:', data);
                    setMeetings([]);
                }
                setLoading(false);
            })
            .catch(err => {
                if (err.response && err.response.status === 401) {
                    setUnauthorized(true);
                } else {
                    console.error('Failed to fetch history:', err);
                }
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 p-4 sm:p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Call History</h1>
                        <p className="text-gray-500 text-sm mt-1">View summaries and transcripts of your past meetings</p>
                    </div>
                    <Link
                        to="/summary-call"
                        className="text-gray-500 hover:text-[#684CFE] font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Link>
                </div>

                {unauthorized ? (
                    <div className="text-center bg-white rounded-2xl p-12 ring-1 ring-gray-200 shadow-sm">
                        <div className="w-16 h-16 bg-[#684CFE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#684CFE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Log in to view history</h3>
                        <p className="text-gray-500 mb-6">You need to be signed in to see your past meeting records.</p>
                        <div className="flex justify-center gap-4">
                            <Link to="/login" className="bg-[#684CFE] hover:bg-[#533bdb] text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-[#684CFE]/30">
                                Log In
                            </Link>
                            <Link to="/signup" className="bg-white hover:bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#684CFE] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading history...</p>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="text-center bg-white rounded-2xl p-12 ring-1 ring-gray-200 shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No past calls found</h3>
                        <p className="text-gray-500 mb-6">Start a new meeting to see it appear here.</p>
                        <Link to="/summary-call" className="inline-block bg-[#684CFE] hover:bg-[#533bdb] text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-[#684CFE]/30">
                            Start a New Call
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {meetings.map(meeting => (
                            <Link
                                key={meeting.roomId}
                                to={`/summary-call/${meeting.roomId}/details`}
                                className="block bg-white hover:bg-gray-50 ring-1 ring-gray-200 rounded-xl p-6 transition-all hover:ring-[#684CFE]/50 hover:shadow-md group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#684CFE] transition-colors mb-1">
                                            Meeting {meeting.roomId.slice(0, 8)}...
                                        </h3>
                                        <p className="text-gray-500 text-sm flex items-center gap-2">
                                            <span>{new Date(meeting.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span>{new Date(meeting.startTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}</span>
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${meeting.status === 'ended'
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                        }`}>
                                        {meeting.status === 'ended' ? 'Completed' : 'In Progress'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-gray-500 mt-4 border-t border-gray-100 pt-4">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        {meeting.participants?.length || 0} Participants
                                    </div>
                                    {meeting.summary && (
                                        <div className="flex items-center gap-2 text-[#684CFE] font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Summary Available
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
