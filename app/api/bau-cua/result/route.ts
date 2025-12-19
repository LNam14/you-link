import { NextRequest } from "next/server";
import { BauCuaRepository, AnimalType } from "@/lib/repositories/bau-cua.repository";
import { TelegramService } from "@/lib/services/telegram.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { getVietnamTime, getVietnamDate, formatVietnamTime } from "@/lib/utils/date";

const bauCuaRepository = new BauCuaRepository();
const telegramService = new TelegramService();

const ANIMAL_NAMES: { [key in AnimalType]: string } = {
  bau: "Bầu",
  ca: "Cá",
  cua: "Cua",
  ga: "Gà",
  huou: "Hươu",
  tom: "Tôm",
};

/**
 * GET /api/bau-cua/result?date=YYYY-MM-DD
 * Lấy kết quả bầu cua của một ngày (con vật có ít người chọn nhất)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // Nếu không có date, dùng ngày hôm nay - sử dụng múi giờ Việt Nam
    let date: string;
    if (dateParam) {
      date = dateParam;
    } else {
      date = getVietnamDate();
    }

    // Lấy thống kê
    const stats = await bauCuaRepository.getStatisticsByDate(date);

    // Tìm con vật có ít người chọn nhất
    let minCount = Infinity;
    let winningAnimals: AnimalType[] = [];
    
    Object.entries(stats).forEach(([animal, data]) => {
      if (data.count < minCount) {
        minCount = data.count;
        winningAnimals = [animal as AnimalType];
      } else if (data.count === minCount) {
        winningAnimals.push(animal as AnimalType);
      }
    });

    // Format ngày để hiển thị (DD/MM/YYYY)
    const [year, month, day] = date.split("-");
    const displayDate = `${day}/${month}/${year}`;

    // Tạo message kết quả - sử dụng múi giờ Việt Nam
    const timeStr = formatVietnamTime();

    let resultMessage = `🎉 KẾT QUẢ BẦU CUA HÔM NAY 🎉\n\n`;

    if (minCount === 0) {
      // Không ai thắng (có con vật không ai chọn)
      resultMessage += `😔 Không ai thắng!\n`;
    } else {
      // Có người thắng
      const winnerNames = winningAnimals.map(animal => ANIMAL_NAMES[animal]).join(", ");
      resultMessage += `🏆 Con vật thắng: ${winnerNames}\n`;
      resultMessage += `👥 Số người thắng: ${minCount} người\n\n`;
      
      // Liệt kê người thắng
      winningAnimals.forEach(animal => {
        const users = stats[animal].users;
        if (users.length > 0) {
          const userNames = users.map(u => u.fullname).join(", ");
          resultMessage += `• ${ANIMAL_NAMES[animal]}: ${userNames}\n`;
        }
      });
      resultMessage += `\n`;
    }

    resultMessage += `📅 Ngày: ${displayDate}\n`;
    resultMessage += `⏰ Thời gian công bố: ${timeStr}\n\n`;

    if (minCount === 0) {
      resultMessage += `💰 Phần thưởng: Không có (có con vật không ai chọn)\n\n`;
    } else {
      resultMessage += `💰 Phần thưởng: Có (con vật có ít người chọn nhất)\n\n`;
    }

    resultMessage += `📊 Thống kê tất cả con vật:\n`;
    Object.entries(stats).forEach(([animal, data]) => {
      const animalName = ANIMAL_NAMES[animal as AnimalType];
      if (data.count === 0) {
        resultMessage += `• ${animalName}: 0 người chọn (không ai chọn)\n`;
      } else {
        const userNames = data.users.map(u => u.fullname).join(", ");
        resultMessage += `• ${animalName}: ${data.count} người chọn (${userNames})\n`;
      }
    });

    resultMessage += `\nHẹn gặp lại ngày mai! 🎊`;

    // Tự động gửi tin nhắn Telegram khi API được gọi
    try {
      await telegramService.sendMessage({
        chatId: "-1003124919874_7",
        message: resultMessage,
      });
    } catch (telegramError) {
      console.error("Error sending Telegram message:", telegramError);
      // Không fail request nếu Telegram lỗi, chỉ log
    }

    return successResponse({
      date,
      displayDate,
      winningAnimals,
      minCount,
      statistics: stats,
      message: resultMessage,
    });
  } catch (error) {
    console.error("Error getting bau cua result:", error);
    return errorResponse(error as Error);
  }
}

