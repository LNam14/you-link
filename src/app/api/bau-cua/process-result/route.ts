import { NextRequest, NextResponse } from 'next/server';
import { database, ref } from '@/lib/firebase';
import { get } from 'firebase/database';
import { bauCuaApiService } from '@/apiServices/bau-cua';

interface BauCuaChoice {
    id: string
    username: string
    name: string
    animal: string
    timestamp: number
    date: string
}

export async function POST(request: NextRequest) {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Get all choices from Firebase
        const choicesRef = ref(database, 'bau-cua-choices');
        const snapshot = await get(choicesRef);
        
        const allChoices = snapshot.exists() ? Object.values(snapshot.val()) as BauCuaChoice[] : [];
        
        // Filter choices for today
        const todayChoices = allChoices.filter(choice => choice.date === todayFormatted);

        // Calculate animal statistics
        const animalStats = {
            'huou': { name: 'Hươu', count: 0, choices: [] as BauCuaChoice[] },
            'bau': { name: 'Bầu', count: 0, choices: [] as BauCuaChoice[] },
            'ga': { name: 'Gà', count: 0, choices: [] as BauCuaChoice[] },
            'ca': { name: 'Cá', count: 0, choices: [] as BauCuaChoice[] },
            'cua': { name: 'Cua', count: 0, choices: [] as BauCuaChoice[] },
            'tom': { name: 'Tôm', count: 0, choices: [] as BauCuaChoice[] }
        };

        // Count choices for each animal
        todayChoices.forEach(choice => {
            if (animalStats[choice.animal as keyof typeof animalStats]) {
                animalStats[choice.animal as keyof typeof animalStats].count++;
                animalStats[choice.animal as keyof typeof animalStats].choices.push(choice);
            }
        });

        // Get animal entries for processing
        const animalEntries = Object.entries(animalStats);
        
        // Check if no one chose any animal or if any animal has 0 choices
        const hasZeroChoices = todayChoices.length === 0 || animalEntries.some(([_, stats]) => stats.count === 0);
        
        if (hasZeroChoices) {
            // If any animal has 0 choices, no one wins
            const message = `🎉 <b>KẾT QUẢ BẦU CUA HÔM NAY</b> 🎉

😔 <b>Không ai thắng!</b>
📅 <b>Ngày:</b> ${new Date().toLocaleDateString('vi-VN')}
⏰ <b>Thời gian công bố:</b> ${new Date().toLocaleTimeString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit'
            })}

💰 <b>Phần thưởng:</b> Không có ${todayChoices.length === 0 ? '(không ai chọn con vật nào)' : '(có con vật không ai chọn)'}

📊 <b>Thống kê tất cả con vật:</b>
${animalEntries.map(([key, stats]) => {
    const choiceList = stats.choices.length > 0 
        ? ` (${stats.choices.map(c => c.name).join(', ')})`
        : ' (không ai chọn)';
    return `• ${stats.name}: ${stats.count} người chọn${choiceList}`;
}).join('\n')}

Hẹn gặp lại ngày mai! 🎊`;

            try {
                await bauCuaApiService.sendTelegramMessage({ message });
            } catch (telegramError) {
                console.error('Error sending result to Telegram:', telegramError);
            }

            return NextResponse.json({
                success: true,
                result: {
                    winningAnimal: null,
                    winnerCount: 0,
                    prizePerPerson: 0,
                    totalPrize: 0,
                    winners: [],
                    wheelRewards: [],
                    allStats: animalEntries.map(([key, stats]) => ({
                        animal: stats.name,
                        count: stats.count,
                        choices: stats.choices
                    }))
                }
            });
        }

        // Find animal with least choices (all animals have at least 1 choice)
        const minCount = Math.min(...animalEntries.map(([_, stats]) => stats.count));
        const winningAnimals = animalEntries.filter(([_, stats]) => stats.count === minCount);
        
        // Calculate total winners from all winning animals
        const totalWinningChoicesCount = winningAnimals.reduce((total, [_, stats]) => total + stats.count, 0);
        
        // Calculate prize per person
        const totalPrize = 1000000; // 1,000,000 VND
        const prizePerPerson = Math.floor(totalPrize / totalWinningChoicesCount);

        // Prepare wheel reward data for all winners from all winning animals
        const wheelRewards = winningAnimals.flatMap(([_, stats]) => 
            stats.choices.map(choice => ({
                username: choice.username,
                reward: `${prizePerPerson.toLocaleString('vi-VN')} VND`
            }))
        );

        // Create wheel rewards automatically
        try {
            const wheelResults = await bauCuaApiService.createWheelRewards(wheelRewards);
            console.log(`Wheel rewards created: ${wheelResults.successful} successful, ${wheelResults.failed} failed`);
        } catch (wheelError) {
            console.error('Error creating wheel rewards:', wheelError);
        }

        // Get all winners from all winning animals
        const allWinners = winningAnimals.flatMap(([_, stats]) => stats.choices);
        const winningAnimalsList = winningAnimals.map(([_, stats]) => stats.name).join(', ');

        // Send result to Telegram
        try {
            const currentTime = new Date().toLocaleTimeString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit'
            });

            const message = `🎉 <b>KẾT QUẢ BẦU CUA HÔM NAY</b> 🎉

🎯 <b>Con vật thắng:</b> ${winningAnimalsList}
👥 <b>Tổng số người thắng:</b> ${totalWinningChoicesCount} người
💰 <b>Phần thưởng mỗi người:</b> ${prizePerPerson.toLocaleString('vi-VN')} VND
📅 <b>Ngày:</b> ${new Date().toLocaleDateString('vi-VN')}
⏰ <b>Thời gian công bố:</b> ${currentTime}

🏆 <b>Danh sách người thắng:</b>
${allWinners.map(choice => `• ${choice.name} (@${choice.username}) - ${animalStats[choice.animal as keyof typeof animalStats].name}`).join('\n')}

📊 <b>Thống kê tất cả con vật:</b>
${animalEntries.map(([key, stats]) => {
    const choiceList = stats.choices.length > 0 
        ? ` (${stats.choices.map(c => c.name).join(', ')})`
        : ' (không ai chọn)';
    return `• ${stats.name}: ${stats.count} người chọn${choiceList}`;
}).join('\n')}

Chúc mừng các bạn! 🎊`;

            await bauCuaApiService.sendTelegramMessage({ message });
        } catch (telegramError) {
            console.error('Error sending result to Telegram:', telegramError);
        }

        return NextResponse.json({
            success: true,
            result: {
                winningAnimals: winningAnimals.map(([_, stats]) => stats.name),
                winnerCount: totalWinningChoicesCount,
                prizePerPerson,
                totalPrize,
                winners: allWinners.map((choice: BauCuaChoice) => ({
                    username: choice.username,
                    name: choice.name,
                    animal: animalStats[choice.animal as keyof typeof animalStats].name
                })),
                wheelRewards: wheelRewards,
                allStats: animalEntries.map(([key, stats]) => ({
                    animal: stats.name,
                    count: stats.count,
                    choices: stats.choices
                }))
            }
        });

    } catch (error: any) {
        console.error('Error processing bau cua result:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
