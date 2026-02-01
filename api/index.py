"""
Vercel serverless function: Main entry point
Serves dashboard HTML and handles API routes
"""
import os
import json
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
try:
    from cf_api import CodeforcesAPI
except ImportError:
    # Fallback: try api directory
    sys.path.insert(0, os.path.dirname(__file__))
    from cf_api import CodeforcesAPI

api = CodeforcesAPI()


def get_dashboard_html():
    """Return the dashboard HTML with modern UI/UX"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codeforces Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .mono {
            font-family: 'JetBrains Mono', monospace;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideIn { animation: slideIn 0.5s ease-out; }
        .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .golden-ratio-w { width: 61.8%; }
        .golden-ratio-h { height: 61.8%; }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen text-white">
    <!-- Background Pattern -->
    <div class="fixed inset-0 opacity-10">
        <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <header class="mb-12 animate-fadeIn">
            <div class="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 class="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                        Codeforces Dashboard
                    </h1>
                    <p class="text-slate-400 text-lg">Track contests, compare progress, visualize growth</p>
                </div>
                <div class="flex items-center gap-3">
                    <svg class="w-8 h-8 text-purple-400 animate-pulse-slow" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                    </svg>
                    <button 
                        onclick="refreshAll()" 
                        class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/50 font-semibold"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Grid with Golden Ratio -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <!-- Left Column - Stats (Golden Ratio) -->
            <div class="lg:col-span-3 space-y-6">
                <!-- User Comparison Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn" style="animation-delay: 0.1s">
                    <!-- User 1 Card -->
                    <div id="user1Card" class="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-purple-300">rodriguescarson</h3>
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <div id="user1Stats" class="space-y-3">
                            <div class="flex items-center gap-3">
                                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span class="text-3xl font-bold mono">-</span>
                                <span class="text-slate-400">Rating</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="text-xl font-semibold mono">-</span>
                                <span class="text-slate-400">Solved</span>
                            </div>
                        </div>
                        <div id="user1Chart" class="mt-4 h-32">
                            <canvas></canvas>
                        </div>
                    </div>

                    <!-- User 2 Card -->
                    <div id="user2Card" class="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-blue-300">oysturnxvas</h3>
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <div id="user2Stats" class="space-y-3">
                            <div class="flex items-center gap-3">
                                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span class="text-3xl font-bold mono">-</span>
                                <span class="text-slate-400">Rating</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="text-xl font-semibold mono">-</span>
                                <span class="text-slate-400">Solved</span>
                            </div>
                        </div>
                        <div id="user2Chart" class="mt-4 h-32">
                            <canvas></canvas>
                        </div>
                    </div>
                </div>

                <!-- Combined Rating Comparison -->
                <div class="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-fadeIn" style="animation-delay: 0.2s">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
                        <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Rating Comparison
                    </h3>
                    <div id="comparisonChart" class="h-64">
                        <canvas></canvas>
                    </div>
                </div>
            </div>

            <!-- Right Column - Contests (Golden Ratio) -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Upcoming Contests -->
                <div class="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-slideIn">
                    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                        <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Upcoming Contests
                    </h2>
                    <div class="mb-4 flex gap-2 flex-wrap">
                        <input type="text" id="contestLinkInput" placeholder="Paste contest link (e.g. https://codeforces.com/contest/2188/problem/A)" class="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"/>
                        <button type="button" onclick="setupContestFromLink()" class="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all font-semibold text-sm whitespace-nowrap flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                            Setup contest
                        </button>
                    </div>
                    <p id="contestLinkMessage" class="text-sm text-slate-400 mb-4 hidden"></p>
                    <div id="contestsList" class="space-y-4 max-h-[600px] overflow-y-auto">
                        <div class="text-center py-8">
                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                            <p class="mt-4 text-slate-400">Loading contests...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contest Rules & Info -->
        <div class="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-fadeIn" style="animation-delay: 0.3s">
            <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Contest Rules & Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div class="font-semibold text-purple-300 mb-2">Duration</div>
                    <div class="text-slate-300">Contests typically last 2-3 hours with 5-8 problems</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div class="font-semibold text-blue-300 mb-2">Scoring</div>
                    <div class="text-slate-300">Points decrease over time. Faster solves = more points</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div class="font-semibold text-green-300 mb-2">Rating</div>
                    <div class="text-slate-300">Performance affects your rating. Better rank = rating increase</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        const USER1 = 'rodriguescarson';
        const USER2 = 'oysturnxvas';
        let user1Chart = null, user2Chart = null, comparisonChart = null;

        function formatTimeUntil(seconds) {
            const now = Math.floor(Date.now() / 1000);
            const diff = seconds - now;
            if (diff < 0) return 'Started';
            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        }

        function formatDateTime(timestamp) {
            return new Date(timestamp * 1000).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        function formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }

        function updateUserChart(canvasId, ratingHistory, color) {
            const ctx = document.getElementById(canvasId);
            if (!ctx || !ratingHistory || ratingHistory.length === 0) return;

            const chart = Chart.getChart(ctx);
            if (chart) chart.destroy();

            const labels = ratingHistory.map((_, i) => i + 1);
            const ratings = ratingHistory.map(e => e.newRating);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        data: ratings,
                        borderColor: color,
                        backgroundColor: color + '20',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false },
                        x: { display: false }
                    }
                }
            });
        }

        function updateComparisonChart(user1History, user2History) {
            const ctx = document.getElementById('comparisonChart');
            if (!ctx) return;

            if (comparisonChart) comparisonChart.destroy();

            const maxLen = Math.max(user1History?.length || 0, user2History?.length || 0);
            const labels = Array.from({length: maxLen}, (_, i) => i + 1);
            
            const user1Ratings = user1History?.map(e => e.newRating) || [];
            const user2Ratings = user2History?.map(e => e.newRating) || [];

            comparisonChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: USER1,
                            data: user1Ratings,
                            borderColor: 'rgb(196, 181, 253)',
                            backgroundColor: 'rgba(196, 181, 253, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: USER2,
                            data: user2Ratings,
                            borderColor: 'rgb(96, 165, 250)',
                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'white',
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'white' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'white' }
                        }
                    }
                }
            });
        }

        async function loadUserStats(handle, cardId, statsId, chartId, color) {
            try {
                const response = await fetch(`${API_BASE}/api/stats?handle=${encodeURIComponent(handle)}`);
                const data = await response.json();
                
                if (data.status === 'error') {
                    document.getElementById(statsId).innerHTML = `<p class="text-red-400">Error: ${data.message}</p>`;
                    return null;
                }

                const user = data.user;
                const stats = data.stats;
                
                document.getElementById(statsId).innerHTML = `
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 ${color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        <span class="text-3xl font-bold mono">${user.rating}</span>
                        <span class="text-slate-400">Rating</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 ${color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-xl font-semibold mono">${stats.solvedCount}</span>
                        <span class="text-slate-400">Solved</span>
                    </div>
                `;

                if (data.ratingHistory && data.ratingHistory.length > 0) {
                    const canvas = document.createElement('canvas');
                    document.getElementById(chartId).innerHTML = '';
                    document.getElementById(chartId).appendChild(canvas);
                    updateUserChart(canvas, data.ratingHistory, color.replace('text-', 'rgb(').replace('-400', '181, 253)'));
                }

                return data.ratingHistory || [];
            } catch (error) {
                console.error(`Error loading ${handle}:`, error);
                return null;
            }
        }

        function parseCodeforcesUrl(url) {
            if (!url || !url.includes('codeforces.com')) return null;
            const contestMatch = url.match(/contest\\/(\\d+)/);
            const problemMatch = url.match(/problem\\/([A-Za-z0-9]+)/);
            if (contestMatch && problemMatch) return { contestId: contestMatch[1], problemIndex: problemMatch[1] };
            if (contestMatch) return { contestId: contestMatch[1], problemIndex: null };
            const problemsetMatch = url.match(/problemset\\/problem\\/(\\d+)\\/([A-Za-z0-9]+)/);
            if (problemsetMatch) return { contestId: problemsetMatch[1], problemIndex: problemsetMatch[2] };
            return null;
        }

        async function setupContestFromLink() {
            const input = document.getElementById('contestLinkInput');
            const msgEl = document.getElementById('contestLinkMessage');
            const url = (input && input.value) ? input.value.trim() : '';
            msgEl.classList.add('hidden');
            if (!url) {
                msgEl.textContent = 'Please paste a Codeforces contest or problem link.';
                msgEl.classList.remove('hidden');
                msgEl.classList.add('text-amber-400');
                return;
            }
            const parsed = parseCodeforcesUrl(url);
            if (!parsed) {
                msgEl.textContent = 'Invalid link. Use a link like https://codeforces.com/contest/2188/problem/A';
                msgEl.classList.remove('hidden');
                msgEl.classList.add('text-amber-400');
                return;
            }
            try {
                await navigator.clipboard.writeText(url);
                msgEl.innerHTML = 'Link copied! In VS Code or Cursor: open Command Palette (Cmd+Shift+P / Ctrl+Shift+P), run <strong>cfx: Setup Contest from URL</strong>, then paste (Ctrl+V).';
                msgEl.classList.remove('hidden', 'text-amber-400');
                msgEl.classList.add('text-green-400');
            } catch (e) {
                msgEl.textContent = 'Open VS Code/Cursor, run "cfx: Setup Contest from URL", and paste: ' + url;
                msgEl.classList.remove('hidden');
                msgEl.classList.add('text-slate-300');
            }
        }

        async function loadContests() {
            const contestsList = document.getElementById('contestsList');
            try {
                const response = await fetch(`${API_BASE}/api/contests`);
                const data = await response.json();
                
                if (data.status === 'error') {
                    contestsList.innerHTML = `<p class="text-red-400 p-4">Error: ${data.message}</p>`;
                    return;
                }
                
                if (data.contests.length === 0) {
                    contestsList.innerHTML = '<p class="text-slate-400 text-center py-8">No upcoming contests found.</p>';
                    return;
                }
                
                contestsList.innerHTML = data.contests.slice(0, 5).map((contest, idx) => `
                    <div class="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-[1.02]" style="animation-delay: ${idx * 0.1}s">
                        <div class="flex items-start justify-between mb-3">
                            <h4 class="text-lg font-bold text-white">${contest.name}</h4>
                            <span class="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs font-semibold">${contest.type}</span>
                        </div>
                        <div class="space-y-2 text-sm text-slate-300 mb-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="font-semibold text-yellow-400">${formatTimeUntil(contest.startTimeSeconds)}</span>
                                <span class="text-slate-500">until start</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                <span>${formatDateTime(contest.startTimeSeconds)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Duration: ${formatDuration(contest.durationSeconds)}</span>
                            </div>
                        </div>
                        <a 
                            href="https://codeforces.com/contest/${contest.id}" 
                            target="_blank" 
                            class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-300 text-sm font-semibold"
                        >
                            View Contest
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                        </a>
                    </div>
                `).join('');
            } catch (error) {
                contestsList.innerHTML = `<p class="text-red-400 p-4">Error: ${error.message}</p>`;
            }
        }

        async function refreshAll() {
            const [user1History, user2History] = await Promise.all([
                loadUserStats(USER1, 'user1Card', 'user1Stats', 'user1Chart', 'text-purple-400'),
                loadUserStats(USER2, 'user2Card', 'user2Stats', 'user2Chart', 'text-blue-400')
            ]);
            
            if (user1History && user2History) {
                updateComparisonChart(user1History, user2History);
            }
            
            await loadContests();
        }

        // Auto-load on page load
        window.addEventListener('DOMContentLoaded', () => {
            refreshAll();
            setInterval(() => {
                loadContests();
            }, 300000);
        });
    </script>
</body>
</html>"""


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            
            # Serve dashboard HTML for root
            if path == '/' or path == '/index.html':
                html = get_dashboard_html()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(html.encode('utf-8'))
                return
            
            # Handle API routes
            if path.startswith('/api/contests'):
                self.handle_contests(parsed)
            elif path.startswith('/api/stats'):
                self.handle_stats(parsed)
            elif path.startswith('/api/user'):
                self.handle_user(parsed)
            else:
                self.send_error(404, "Not Found")
                
        except Exception as e:
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def handle_contests(self, parsed):
        """Handle /api/contests endpoint"""
        try:
            params = parse_qs(parsed.query)
            filter_str = params.get('filter', ['div2,div3'])[0]
            include_gym = params.get('include_gym', ['false'])[0].lower() == 'true'
            
            # Parse filters
            filters = set()
            if filter_str and filter_str.lower() != 'all':
                filters = {f.strip().lower() for f in filter_str.split(',')}
            
            # Get contests
            all_contests = api.get_contest_list(gym=include_gym)
            
            import time
            current_time = int(time.time())
            upcoming = []
            
            for contest in all_contests:
                start_time = contest.get('startTimeSeconds', 0)
                if start_time <= current_time:
                    continue
                
                phase = contest.get('phase', '').upper()
                if phase not in ['BEFORE', 'CODING']:
                    continue
                
                # Filter by division
                if filters:
                    contest_name = contest.get('name', '').lower()
                    matches = False
                    if 'div1' in filters and ('div. 1' in contest_name or 'div1' in contest_name):
                        matches = True
                    if 'div2' in filters and ('div. 2' in contest_name or 'div2' in contest_name):
                        matches = True
                    if 'div3' in filters and ('div. 3' in contest_name or 'div3' in contest_name):
                        matches = True
                    if 'div4' in filters and ('div. 4' in contest_name or 'div4' in contest_name):
                        matches = True
                    if not matches:
                        continue
                
                if contest.get('type') == 'GYM' and not include_gym:
                    continue
                
                upcoming.append({
                    'id': contest.get('id'),
                    'name': contest.get('name'),
                    'type': contest.get('type'),
                    'phase': contest.get('phase'),
                    'startTimeSeconds': contest.get('startTimeSeconds'),
                    'durationSeconds': contest.get('durationSeconds'),
                })
            
            upcoming.sort(key=lambda x: x.get('startTimeSeconds', 0))
            
            response = {
                'status': 'success',
                'contests': upcoming,
                'count': len(upcoming)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            error_response = {'status': 'error', 'message': str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def handle_stats(self, parsed):
        """Handle /api/stats endpoint"""
        try:
            params = parse_qs(parsed.query)
            handle = params.get('handle', [None])[0]
            
            if not handle:
                error_response = {'status': 'error', 'message': 'handle parameter required'}
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            # Get user info
            user_info = api.get_user_info([handle])
            if not user_info:
                error_response = {'status': 'error', 'message': 'User not found'}
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            user = user_info[0]
            submissions = api.get_user_status(handle, count=10)
            rating_history = api.get_user_rating(handle)
            
            # Calculate solved
            solved = set()
            for sub in submissions:
                if sub.get('verdict') == 'OK':
                    problem = sub.get('problem', {})
                    contest_id = problem.get('contestId')
                    index = problem.get('index')
                    if contest_id and index:
                        solved.add(f"{contest_id}{index}")
            
            response = {
                'status': 'success',
                'user': {
                    'handle': user.get('handle'),
                    'rating': user.get('rating', 0),
                    'maxRating': user.get('maxRating', 0),
                    'rank': user.get('rank', 'unrated'),
                    'maxRank': user.get('maxRank', 'unrated')
                },
                'stats': {
                    'solvedCount': len(solved),
                    'recentSubmissions': len(submissions),
                    'ratingChanges': len(rating_history)
                },
                'ratingHistory': rating_history if rating_history else []
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            error_response = {'status': 'error', 'message': str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def handle_user(self, parsed):
        """Handle /api/user endpoint"""
        try:
            params = parse_qs(parsed.query)
            handle = params.get('handle', [None])[0]
            
            if not handle:
                error_response = {'status': 'error', 'message': 'handle parameter required'}
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            user_info = api.get_user_info([handle])
            if not user_info:
                error_response = {'status': 'error', 'message': 'User not found'}
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            user = user_info[0]
            response = {
                'status': 'success',
                'user': {
                    'handle': user.get('handle'),
                    'rating': user.get('rating', 0),
                    'maxRating': user.get('maxRating', 0),
                    'rank': user.get('rank', 'unrated'),
                    'maxRank': user.get('maxRank', 'unrated')
                }
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            error_response = {'status': 'error', 'message': str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
