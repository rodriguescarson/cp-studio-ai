import * as vscode from 'vscode';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: string;
    unlockedAt?: number; // timestamp
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
    {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Solve your first problem',
        icon: '🗡️',
        condition: 'solved >= 1'
    },
    {
        id: 'getting_started',
        name: 'Getting Started',
        description: 'Solve 10 problems',
        icon: '🌱',
        condition: 'solved >= 10'
    },
    {
        id: 'half_century',
        name: 'Half Century',
        description: 'Solve 50 problems',
        icon: '⭐',
        condition: 'solved >= 50'
    },
    {
        id: 'century',
        name: 'Century',
        description: 'Solve 100 problems',
        icon: '💯',
        condition: 'solved >= 100'
    },
    {
        id: 'problem_crusher',
        name: 'Problem Crusher',
        description: 'Solve 500 problems',
        icon: '💎',
        condition: 'solved >= 500'
    },
    {
        id: 'streak_week',
        name: 'Consistent',
        description: 'Maintain a 7-day solving streak',
        icon: '🔥',
        condition: 'streak >= 7'
    },
    {
        id: 'streak_month',
        name: 'Dedicated',
        description: 'Maintain a 30-day solving streak',
        icon: '🏆',
        condition: 'streak >= 30'
    },
    {
        id: 'streak_100',
        name: 'Unstoppable',
        description: 'Maintain a 100-day solving streak',
        icon: '👑',
        condition: 'streak >= 100'
    },
    {
        id: 'specialist',
        name: 'Rising Star',
        description: 'Reach Specialist rating (1400+)',
        icon: '🌟',
        condition: 'rating >= 1400'
    },
    {
        id: 'expert',
        name: 'Expert Coder',
        description: 'Reach Expert rating (1600+)',
        icon: '🧠',
        condition: 'rating >= 1600'
    },
    {
        id: 'candidate_master',
        name: 'Master in Training',
        description: 'Reach Candidate Master rating (1900+)',
        icon: '🎓',
        condition: 'rating >= 1900'
    },
    {
        id: 'multi_platform',
        name: 'Platform Explorer',
        description: 'Solve problems on 2+ platforms',
        icon: '🌍',
        condition: 'platforms >= 2'
    },
    {
        id: 'ai_user',
        name: 'AI Partner',
        description: 'Use AI analysis 10 times',
        icon: '🤖',
        condition: 'aiUses >= 10'
    },
    {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Pass all tests within 5 minutes of setup',
        icon: '⚡',
        condition: 'speedSolve'
    }
];

export class AchievementManager {
    private context: vscode.ExtensionContext;
    private unlockedAchievements: Map<string, Achievement>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        const saved = context.globalState.get<Record<string, Achievement>>('cfStudio.achievements', {});
        this.unlockedAchievements = new Map(Object.entries(saved));
    }

    /**
     * Check and unlock achievements based on current stats.
     * Returns newly unlocked achievements.
     */
    async checkAchievements(stats: {
        solved?: number;
        streak?: number;
        rating?: number;
        platforms?: number;
        aiUses?: number;
        speedSolve?: boolean;
    }): Promise<Achievement[]> {
        const newlyUnlocked: Achievement[] = [];

        for (const def of ACHIEVEMENT_DEFINITIONS) {
            if (this.unlockedAchievements.has(def.id)) {
                continue; // Already unlocked
            }

            let unlocked = false;

            // Parse and evaluate condition
            if (def.condition.startsWith('solved >= ')) {
                const target = parseInt(def.condition.split('>= ')[1]);
                unlocked = (stats.solved || 0) >= target;
            } else if (def.condition.startsWith('streak >= ')) {
                const target = parseInt(def.condition.split('>= ')[1]);
                unlocked = (stats.streak || 0) >= target;
            } else if (def.condition.startsWith('rating >= ')) {
                const target = parseInt(def.condition.split('>= ')[1]);
                unlocked = (stats.rating || 0) >= target;
            } else if (def.condition.startsWith('platforms >= ')) {
                const target = parseInt(def.condition.split('>= ')[1]);
                unlocked = (stats.platforms || 0) >= target;
            } else if (def.condition.startsWith('aiUses >= ')) {
                const target = parseInt(def.condition.split('>= ')[1]);
                unlocked = (stats.aiUses || 0) >= target;
            } else if (def.condition === 'speedSolve') {
                unlocked = stats.speedSolve === true;
            }

            if (unlocked) {
                const achievement: Achievement = {
                    ...def,
                    unlockedAt: Date.now()
                };
                this.unlockedAchievements.set(def.id, achievement);
                newlyUnlocked.push(achievement);
            }
        }

        if (newlyUnlocked.length > 0) {
            await this.save();

            // Show notification for each new achievement
            for (const a of newlyUnlocked) {
                vscode.window.showInformationMessage(
                    `${a.icon} Achievement Unlocked: ${a.name} - ${a.description}`,
                    'View Achievements'
                ).then(selection => {
                    if (selection === 'View Achievements') {
                        vscode.commands.executeCommand('cfStudioProfileView.focus');
                    }
                });
            }
        }

        return newlyUnlocked;
    }

    /** Increment AI usage counter and check for achievement */
    async recordAiUse(): Promise<void> {
        const count = this.context.globalState.get<number>('cfStudio.aiUseCount', 0) + 1;
        await this.context.globalState.update('cfStudio.aiUseCount', count);
        await this.checkAchievements({ aiUses: count });
    }

    getAllAchievements(): Array<Achievement & { locked: boolean }> {
        return ACHIEVEMENT_DEFINITIONS.map(def => {
            const unlocked = this.unlockedAchievements.get(def.id);
            return {
                ...def,
                unlockedAt: unlocked?.unlockedAt,
                locked: !unlocked
            };
        });
    }

    getUnlockedCount(): number {
        return this.unlockedAchievements.size;
    }

    getTotalCount(): number {
        return ACHIEVEMENT_DEFINITIONS.length;
    }

    private async save(): Promise<void> {
        const obj: Record<string, Achievement> = {};
        this.unlockedAchievements.forEach((v, k) => { obj[k] = v; });
        await this.context.globalState.update('cfStudio.achievements', obj);
    }
}
