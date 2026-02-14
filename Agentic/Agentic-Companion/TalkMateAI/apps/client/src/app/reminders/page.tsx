'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Bell, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Reminder {
    id: string;
    type: 'sms' | 'call';
    message: string;
    remind_time: string;
    status: 'pending' | 'sent' | 'failed' | 'failed_no_phone';
    created_at: string;
}

export default function RemindersPage() {
    const { user, token } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;

        const fetchReminders = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                console.log('Fetching reminders from:', `${apiUrl}/reminders`);

                const response = await fetch(`${apiUrl}/reminders`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch reminders');
                }

                const data = await response.json();
                setReminders(data.reminders || []);
            } catch (err) {
                setError('Could not load reminders associated with your account.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReminders();
    }, [token]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'sent':
                return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'failed':
            case 'failed_no_phone':
                return 'text-red-400 bg-red-400/10 border-red-400/20';
            default:
                return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'sent':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'failed':
            case 'failed_no_phone':
                return <XCircle className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });
        } catch (e) {
            return dateString;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <p>Please login to view your reminders.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30">
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Reminders
                        </h1>
                        <p className="mt-2 text-zinc-400">
                            Manage your scheduled calls and messages.
                        </p>
                    </div>
                    <div className="rounded-full bg-zinc-900 p-3 ring-1 ring-white/10">
                        <Bell className="h-6 w-6 text-indigo-400" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
                        {error}
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
                        <div className="rounded-full bg-zinc-800/50 p-4 ring-1 ring-white/5 mb-4">
                            <Bell className="h-8 w-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No reminders yet</h3>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">
                            Ask Saathi AI to set a reminder for you, and it will appear here.
                            <br />
                            <span className="italic mt-2 block text-zinc-500">
                                "Remind me to call Mom at 5 PM"
                            </span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reminders.map((reminder) => (
                            <div
                                key={reminder.id}
                                className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-all hover:bg-zinc-900/60 hover:border-white/10 hover:shadow-lg hover:shadow-black/20"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    {/* Left content */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-opacity-10 ${reminder.type === 'call' ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                                            }`}>
                                            {reminder.type === 'call' ? (
                                                <span className="text-lg">📞</span>
                                            ) : (
                                                <span className="text-lg">💬</span>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-lg font-medium leading-tight text-zinc-200">
                                                {reminder.message}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 text-zinc-600" />
                                                    {formatDate(reminder.remind_time)}
                                                </div>
                                                <div className="flex items-center gap-1.5 capitalize">
                                                    Type: {reminder.type}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Status */}
                                    <div className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${getStatusColor(reminder.status)}`}>
                                        {getStatusIcon(reminder.status)}
                                        {reminder.status.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
