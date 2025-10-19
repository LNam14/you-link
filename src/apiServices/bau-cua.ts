function getBaseUrl(): string {
    // For server-side rendering
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }
    // For client-side
    return process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
}

const BASE_URL = getBaseUrl();

export interface BauCuaChoice {
    id: string;
    username: string;
    name: string;
    animal: string;
    timestamp: number;
    date: string;
}

export interface WheelReward {
    username: string;
    reward: string;
}

export interface ProcessResultResponse {
    success: boolean;
    result: {
        winningAnimals?: string[];
        winningAnimal?: string | null;
        winnerCount: number;
        prizePerPerson: number;
        totalPrize: number;
        winners: Array<{
            username: string;
            name: string;
            animal?: string;
        }>;
        wheelRewards: WheelReward[];
        allStats: Array<{
            animal: string;
            count: number;
            choices: BauCuaChoice[];
        }>;
    };
}

export interface TelegramMessage {
    username?: string;
    name?: string;
    animal?: string;
    date?: string;
    message?: string;
}

export interface WheelCreateResponse {
    id: number;
    username: string;
    reward: string;
    date: string;
}

class BauCuaApiService {
    // Process bau cua result
    async processResult(): Promise<ProcessResultResponse> {
        const response = await fetch(`${BASE_URL}/api/bau-cua/process-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = 'Failed to process result';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Send Telegram message
    async sendTelegramMessage(data: TelegramMessage): Promise<void> {
        const response = await fetch(`${BASE_URL}/api/telegram/bau-cua`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to send Telegram message';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
    }

    // Create wheel reward
    async createWheelReward(username: string, reward: string): Promise<WheelCreateResponse> {
        const response = await fetch(`${BASE_URL}/api/wheel/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                reward,
            }),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create wheel reward';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Create multiple wheel rewards
    async createWheelRewards(wheelRewards: WheelReward[]): Promise<{
        total: number;
        successful: number;
        failed: number;
        details: Array<{
            success: boolean;
            username: string;
            reward?: string;
            error?: any;
        }>;
    }> {
        const wheelPromises = wheelRewards.map(async (reward) => {
            try {
                const result = await this.createWheelReward(reward.username, reward.reward);
                return { success: true, username: reward.username, reward: reward.reward };
            } catch (error) {
                return { success: false, username: reward.username, error };
            }
        });

        const results = await Promise.all(wheelPromises);
        const successful = results.filter(result => result.success);
        const failed = results.filter(result => !result.success);

        return {
            total: wheelRewards.length,
            successful: successful.length,
            failed: failed.length,
            details: results,
        };
    }

    // Run cron job manually
    async runCronJob(): Promise<{
        success: boolean;
        message: string;
        timestamp: string;
        result: any;
    }> {
        const response = await fetch(`${BASE_URL}/api/cron/bau-cua-daily`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ manual: true }),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to run cron job';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Create test data
    async createTestData(): Promise<{
        success: boolean;
        message: string;
        data: any;
    }> {
        const response = await fetch(`${BASE_URL}/api/bau-cua/test-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create test data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Create empty test data
    async createEmptyTestData(): Promise<{
        success: boolean;
        message: string;
        data: any;
    }> {
        const response = await fetch(`${BASE_URL}/api/bau-cua/test-empty`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create empty test data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Create all chosen test data
    async createAllChosenTestData(): Promise<{
        success: boolean;
        message: string;
        data: any;
    }> {
        const response = await fetch(`${BASE_URL}/api/bau-cua/test-all-chosen`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create all chosen test data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Create multiple winners test data
    async createMultipleWinnersTestData(): Promise<{
        success: boolean;
        message: string;
        data: any;
    }> {
        const response = await fetch(`${BASE_URL}/api/bau-cua/test-multiple-winners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create multiple winners test data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }
}

export const bauCuaApiService = new BauCuaApiService();
