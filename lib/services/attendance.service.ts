import { AttendanceRepository, AttendanceData } from "../repositories/attendance.repository";

export class AttendanceService {
  private attendanceRepository: AttendanceRepository;

  constructor() {
    this.attendanceRepository = new AttendanceRepository();
  }

  // Lấy tất cả dữ liệu chấm công
  async getAllAttendance(): Promise<AttendanceData> {
    return await this.attendanceRepository.getAllAttendance();
  }

  // Lấy dữ liệu chấm công của một user
  async getAttendanceByUsername(username: string): Promise<{ [date: string]: "checked" }> {
    return await this.attendanceRepository.getAttendanceByUsername(username);
  }

  // Chấm công cho một ngày
  async checkIn(username: string, date: string): Promise<void> {
    // Format date: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    await this.attendanceRepository.saveAttendance(username, date);
  }

  // Lấy dữ liệu chấm công theo tháng cho một user
  async getAttendanceByMonth(username: string, year: number, month: number): Promise<{ [date: string]: "checked" }> {
    const userAttendance = await this.getAttendanceByUsername(username);
    
    // Lọc theo tháng
    const monthAttendance: { [date: string]: "checked" } = {};
    const monthStr = String(month).padStart(2, "0");
    
    Object.keys(userAttendance).forEach((date) => {
      if (date.startsWith(`${year}-${monthStr}-`)) {
        monthAttendance[date] = "checked";
      }
    });

    return monthAttendance;
  }
}

