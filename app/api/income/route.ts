import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { AttendanceService } from "@/lib/services/attendance.service";
import { PenaltyRepository } from "@/lib/repositories/penalty.repository";
import { RewardRepository } from "@/lib/repositories/reward.repository";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const userService = new UserService();
const attendanceService = new AttendanceService();
const penaltyRepository = new PenaltyRepository();
const rewardRepository = new RewardRepository();

export interface IncomeData {
  username: string;
  fullname: string;
  attendanceDays: number;
  attendanceIncome: number;
  beHuIncome: number;
  rewardIncome: number; // Phần thưởng cập nhật site
  totalIncome: number;
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    // Lấy query params
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return errorResponse(new Error("Year and month are required"), 400);
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Lấy tất cả users (chỉ lấy nhân viên)
    const allUsers = await userService.getAllUsers();
    const employees = allUsers.filter((user) => user.role === "Nhân viên" && user.active);

    // Lấy dữ liệu chấm công và tính thu nhập
    const incomeData: IncomeData[] = [];

    for (const user of employees) {
      // Lấy số ngày chấm công trong tháng
      const attendance = await attendanceService.getAttendanceByMonth(
        user.username,
        yearNum,
        monthNum
      );
      const attendanceDays = Object.keys(attendance).length;
      
      // Tính thu nhập chấm công (tối đa 26.5 ngày)
      const maxDays = 26.5;
      const actualDays = Math.min(attendanceDays, maxDays);
      const attendanceIncome = actualDays * 301.886792453;
      
      // Bé hư - lấy từ phạt
      const beHuIncome = await penaltyRepository.getTotalPenaltyByUserAndMonth(
        user.username,
        yearNum,
        monthNum
      );
      
      // Phần thưởng - lấy từ rewards
      const rewardIncome = await rewardRepository.getTotalRewardByUserAndMonth(
        user.username,
        yearNum,
        monthNum
      );
      
      // Tổng tiền
      const totalIncome = attendanceIncome + beHuIncome + rewardIncome;

      incomeData.push({
        username: user.username,
        fullname: user.fullname,
        attendanceDays: actualDays,
        attendanceIncome: Math.round(attendanceIncome * 100) / 100, // Làm tròn 2 chữ số
        beHuIncome,
        rewardIncome,
        totalIncome: Math.round(totalIncome * 100) / 100,
      });
    }

    // Sắp xếp theo username
    incomeData.sort((a, b) => a.username.localeCompare(b.username));

    return successResponse(incomeData);
  } catch (error) {
    console.error("Error fetching income data:", error);
    return errorResponse(error as Error);
  }
}

