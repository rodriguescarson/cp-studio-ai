import * as vscode from 'vscode';

interface StreakData {
    count: number;
    lastDate: string; // YYYY-MM-DD
    longestStreak: number;
    totalDays: number;
    freezeAvailable: boolean;
    history: string[]; // Last 365 dates with activity
}

export class StreakTracker {
    private context: vscode.ExtensionContext;
    private streakData: StreakData;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.streakData = context.globalState.get<StreakData>('cfStudio.streakData', {
            count: 0,
            lastDate: '',
            longestStreak: 0,
            totalDays: 0,
            freezeAvailable: true,
            history: []
        });
    }

    /**
     * Record that the user solved a problem today.
     * Returns celebration info if a milestone is reached.
     */
    async recordSolve(): Promise<{ milestone?: number; message?: string } | null> {
        const today = this.getTodayString();
        
        if (this.streakData.lastDate === today) {
            // Already recorded today
            return null;
        }

        const yesterday = this.getDateString(-1);
        let milestone: number | undefined;

        if (this.streakData.lastDate === yesterday) {
            // Consecutive day - increment streak
            this.streakData.count += 1;
        } else if (this.streakData.lastDate && this.streakData.lastDate !== today) {
            // Streak broken (unless freeze)
            const daysBetween = this.daysBetween(this.streakData.lastDate, today);
            if (daysBetween === 2 && this.streakData.freezeAvailable) {
                // Use streak freeze
                this.streakData.freezeAvailable = false;
                this.streakData.count += 1;
            } else {
                // Reset streak
                this.streakData.count = 1;
                this.streakData.freezeAvailable = true;
            }
        } else {
            // First ever solve
            this.streakData.count = 1;
        }

        this.streakData.lastDate = today;
        this.streakData.totalDays += 1;

        // Update longest streak
        if (this.streakData.count > this.streakData.longestStreak) {
            this.streakData.longestStreak = this.streakData.count;
        }

        // Add to history (keep last 365 entries)
        if (!this.streakData.history.includes(today)) {
            this.streakData.history.push(today);
            if (this.streakData.history.length > 365) {
                this.streakData.history = this.streakData.history.slice(-365);
            }
        }

        // Check milestones
        const milestones = [7, 14, 30, 50, 100, 200, 365];
        if (milestones.includes(this.streakData.count)) {
            milestone = this.streakData.count;
        }

        await this.save();

        // Also save simplified version for status bar
        await this.context.globalState.update('cfStudio.streak', {
            count: this.streakData.count,
            lastDate: this.streakData.lastDate
        });

        if (milestone) {
            return {
                milestone,
                message: this.getMilestoneMessage(milestone)
            };
        }

        return null;
    }

    getStreakData(): StreakData {
        return { ...this.streakData };
    }

    getCount(): number {
        // Check if streak is still active
        const today = this.getTodayString();
        const yesterday = this.getDateString(-1);
        
        if (this.streakData.lastDate === today || this.streakData.lastDate === yesterday) {
            return this.streakData.count;
        }
        return 0;
    }

    /**
     * Get activity data for heat map (last N days).
     * Returns array of { date: string, count: number } for each day.
     */
    getActivityHeatMap(days: number = 365): Array<{ date: string; active: boolean }> {
        const result: Array<{ date: string; active: boolean }> = [];
        const historySet = new Set(this.streakData.history);
        
        for (let i = days - 1; i >= 0; i--) {
            const date = this.getDateString(-i);
            result.push({
                date,
                active: historySet.has(date)
            });
        }
        
        return result;
    }

    private getMilestoneMessage(days: number): string {
        const messages: Record<number, string> = {
            7: 'One week streak! You are building great habits!',
            14: 'Two weeks strong! Consistency is key!',
            30: 'A whole month! You are unstoppable!',
            50: '50 days! Half-century of dedication!',
            100: '100 days! Triple-digit warrior!',
            200: '200 days! Legendary commitment!',
            365: 'A FULL YEAR! You are a competitive programming legend!'
        };
        return messages[days] || `${days}-day streak! Keep going!`;
    }

    private getTodayString(): string {
        return new Date().toISOString().split('T')[0];
    }

    private getDateString(offsetDays: number): string {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    }

    private daysBetween(date1: string, date2: string): number {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    }

    private async save(): Promise<void> {
        await this.context.globalState.update('cfStudio.streakData', this.streakData);
    }
}
