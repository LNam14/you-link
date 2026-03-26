"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";

export interface QuizQuestion {
  CâuHỏi: string;
  ĐápÁn: {
    A: string;
    B: string;
    C: string;
  };
  ĐápÁnĐúng: "A" | "B" | "C";
}

export const quizQuestions: QuizQuestion[] = [
  {
    CâuHỏi: "Giỗ tổ nghề backlink ngày bao nhiêu?",
    ĐápÁn: {
      A: "Ngày 20 âm lịch",
      B: "Ngày 22 âm lịch",
      C: "Chưa có ngày"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Backlink thường sống ở đâu?",
    ĐápÁn: {
      A: "Trên website khác",
      B: "Trong thùng rác",
      C: "Trong lòng người làm SEO"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Check bill khách hàng TT cho mình check ở đâu?",
    ĐápÁn: {
      A: "PB5",
      B: "PB4",
      C: "PB6"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Phiên bản hiện tại là PB gì?",
    ĐápÁn: {
      A: "PB5",
      B: "PB6",
      C: "PB4"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Kế toán tên gì?",
    ĐápÁn: {
      A: "Chân Thế Dân",
      B: "Xiao Min",
      C: "Chân Như Kim"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "HR tên gì?",
    ĐápÁn: {
      A: "Uyên An",
      B: "Xiao Min",
      C: "Chân Như Kim"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Để đạt mức lương 26.5 ngày công thì LN phải ở mức?",
    ĐápÁn: {
      A: "< 18200u",
      B: "< 1920u",
      C: "< 2020u"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Mảng backlink của công ty có bao nhiêu team chính?",
    ĐápÁn: {
      A: "2",
      B: "3",
      C: "4"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khi nào admin đòi nợ giúp bán hàng?",
    ĐápÁn: {
      A: "Có nợ là admin tự đòi",
      B: "Khách nợ quá 2 tháng và BH không đòi được",
      C: "Admin không đòi nợ"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "GP đã thanh toán nhưng mất index, xử lý sao?",
    ĐápÁn: {
      A: "Báo khách đợi + ép index/đổi URL/hoàn tiền",
      B: "Báo NCC gỡ hoàn tiền",
      C: "Báo khách cứ thanh toán"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đơn 500u bị ép còn 450u thì làm gì?",
    ĐápÁn: {
      A: "Hủy đơn",
      B: "Không đồng ý",
      C: "Check còn lời thì nhận"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Nếu KH vượt tín dụng thì làm gì?",
    ĐápÁn: {
      A: "Báo AD nâng hoặc thu hồi nợ",
      B: "Tự nâng",
      C: "Vẫn đi đơn"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đối với khách hàng mới cần làm gì?",
    ĐápÁn: {
      A: "Tạo mã là xong",
      B: "Đi đơn luôn",
      C: "Tạo mã + group + file + xin tín dụng"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "GP đã thanh toán nhưng KH đòi hủy vì không index?",
    ĐápÁn: {
      A: "Gỡ là xong",
      B: "Gỡ + xin hoàn tiền hoặc fix bài",
      C: "Hỏi AD"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Đơn hủy sau 1 tuần cần note file nào?",
    ĐápÁn: {
      A: "File NCC, KT6, KH",
      B: "File NCC",
      C: "File NCC, KT6"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Còn dùng 2 ví TRC20 và BEP20 không?",
    ĐápÁn: {
      A: "Có",
      B: "Không",
      C: "Bỏ TRC20"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Cách note chi phí content đúng?",
    ĐápÁn: {
      A: "Thích note sao cũng được",
      B: "Chỉ ghi chi phí",
      C: "Note đủ: chi phí + NCC + mã + người đi"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Cách hủy GP/Text đúng?",
    ĐápÁn: {
      A: "Tự hủy",
      B: "Xin NCC + note đầy đủ + hoàn tiền nếu có",
      C: "Chỉ note KT6"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Gia hạn text có cần check giá?",
    ĐápÁn: {
      A: "Có, báo giá mới",
      B: "Không cần",
      C: "Gia hạn trước"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Stress công việc nên làm gì?",
    ĐápÁn: {
      A: "Giải trí, nghỉ ngơi",
      B: "Than vãn",
      C: "Kệ vẫn làm"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đang dùng bao nhiêu ví nhận tiền?",
    ĐápÁn: {
      A: "2 ví",
      B: "3 ví",
      C: "5 ví"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "NCC yêu cầu thanh toán thì tag ai?",
    ĐápÁn: {
      A: "Chân Thế Dân",
      B: "Chân Như Kim",
      C: "Ad của mình"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Slogan của F là gì?",
    ĐápÁn: {
      A: "Quyền riêng tư...",
      B: "Tự Do - Hòa Bình - Tình Yêu - Phẩm Giá",
      C: "Phẩm Giá - Tỏa Sáng"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Note bill cần note file nào?",
    ĐápÁn: {
      A: "File KT",
      B: "KT + KH",
      C: "KT + KH + PB6"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Site lệch giá trên choseo xử lý sao?",
    ĐápÁn: {
      A: "Xóa site",
      B: "Vẫn đi",
      C: "Báo KH + xóa + cập nhật giá"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Thời gian bảo hành GP?",
    ĐápÁn: {
      A: "3 tháng",
      B: "4 tháng",
      C: "6 tháng"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "GP chưa index >1 tuần KH muốn đổi site?",
    ĐápÁn: {
      A: "Có",
      B: "Không",
      C: "Xem xét"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "KH muốn tăng CK 10%?",
    ĐápÁn: {
      A: "Có",
      B: "Không",
      C: "Hỏi sếp"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "NCC yêu cầu đổi content?",
    ĐápÁn: {
      A: "Order lại",
      B: "Tự sửa",
      C: "Nhờ team content fix"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "KH nói giá cao hơn bên khác?",
    ĐápÁn: {
      A: "Phủ nhận",
      B: "Giải thích nguồn giá ổn định",
      C: "Hỏi sếp"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "KH chê site cũ, traffic thấp?",
    ĐápÁn: {
      A: "Có site mới",
      B: "Tìm thêm",
      C: "Gửi list site tốt"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "LN giảm nhiều tuần, làm gì?",
    ĐápÁn: {
      A: "Chăm KH + tìm KH mới",
      B: "Xin KH",
      C: "Chờ"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "NCC báo tăng giá khi lên đơn?",
    ĐápÁn: {
      A: "Chấp nhận",
      B: "Giữ giá cũ",
      C: "Báo KH + update giá"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khái niệm BH của F?",
    ĐápÁn: {
      A: "Bán giỏi",
      B: "Làm marketing + bán + xử lý",
      C: "Bán hàng"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Khái niệm kế toán của F?",
    ĐápÁn: {
      A: "Note thu chi",
      B: "Tối ưu tài chính",
      C: "Kiểm soát đầu vào + thanh toán"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khái niệm AD của F?",
    ĐápÁn: {
      A: "Quản lý + bán + tư duy",
      B: "Bán giỏi nhất",
      C: "Ý tưởng nhiều"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "F là gì?",
    ĐápÁn: {
      A: "Chưa phân loại",
      B: "Công ty",
      C: "Môn phái"
    },
    ĐápÁnĐúng: "A"
  }
];


export interface WrongAnswerInfo {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wrongAnswers?: WrongAnswerInfo[]) => void;
}

export default function QuizModal({ isOpen, onClose, onSuccess }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerInfo[]>([]);

  // Chọn ngẫu nhiên 3 câu hỏi khi mở modal
  useEffect(() => {
    if (isOpen && quizQuestions.length > 0) {
      const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 3);
      setShuffledQuestions(shuffled);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCorrectCount(0);
      setWrongAnswers([]);
    }
  }, [isOpen]);

  const handleSelectAnswer = (answer: "A" | "B" | "C") => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const correct = selectedAnswer === currentQuestion.ĐápÁnĐúng;
    
    setIsAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);

      // Nếu đã trả lời đúng 3 câu liên tiếp
      if (newCorrectCount === 3) {
        setTimeout(() => {
          // Truyền danh sách các câu trả lời sai với đầy đủ thông tin
          const wrongAnswersToSend = wrongAnswers.length > 0 
            ? wrongAnswers
            : undefined;
          onSuccess(wrongAnswersToSend);
          handleClose();
        }, 1000);
      } else {
        // Chuyển sang câu hỏi tiếp theo sau 1.5 giây
        setTimeout(() => {
          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedAnswer(null);
          setIsAnswered(false);
        }, 1500);
      }
    } else {
      // Lưu thông tin đầy đủ về câu hỏi sai
      const wrongAnswerInfo: WrongAnswerInfo = {
        question: currentQuestion.CâuHỏi,
        selectedAnswer: currentQuestion.ĐápÁn[selectedAnswer],
        correctAnswer: currentQuestion.ĐápÁn[currentQuestion.ĐápÁnĐúng],
      };
      
      setWrongAnswers((prev) => {
        // Kiểm tra xem câu hỏi này đã có trong danh sách chưa (tránh trùng lặp)
        const isDuplicate = prev.some(
          (item) => item.question === wrongAnswerInfo.question
        );
        if (!isDuplicate) {
          return [...prev, wrongAnswerInfo];
        }
        return prev;
      });
      
      // Nếu sai, reset về câu đầu và shuffle lại vì phải đúng liên tiếp 3 câu
      // Lưu ý: KHÔNG reset wrongAnswers để giữ lại tất cả các câu đã sai
      setTimeout(() => {
        setSelectedAnswer(null);
        setIsAnswered(false);
        setCorrectCount(0); // Reset về 0 vì phải đúng liên tiếp
        setCurrentQuestionIndex(0); // Reset về câu đầu
        // Shuffle lại câu hỏi
        const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 3);
        setShuffledQuestions(shuffled);
      }, 2000);
    }
  };

  const handleClose = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setWrongAnswers([]);
    onClose();
  };

  if (!isOpen) return null;

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Kiểm tra kiến thức</h2>
              <p className="text-sm text-gray-600">
                Trả lời đúng liên tiếp {3 - correctCount} câu để chấm công
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(correctCount / 3) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {correctCount}/3
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Question Text */}
            <div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                Câu hỏi {currentQuestionIndex + 1}/3:
              </p>
              <p className="text-xl font-bold text-gray-900">
                {currentQuestion.CâuHỏi}
              </p>
            </div>

            {/* Answers */}
            <div className="space-y-3">
              {(["A", "B", "C"] as const).map((key) => {
                const answerText = currentQuestion.ĐápÁn[key];
                const isSelected = selectedAnswer === key;
                const isCorrectAnswer = currentQuestion.ĐápÁnĐúng === key;
                const showResult = isAnswered;

                let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ";
                
                if (showResult) {
                  if (isCorrectAnswer) {
                    buttonClass += "border-green-500 bg-green-50 text-green-900";
                  } else if (isSelected && !isCorrectAnswer) {
                    buttonClass += "border-red-500 bg-red-50 text-red-900";
                  } else {
                    buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                  }
                } else {
                  if (isSelected) {
                    buttonClass += "border-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100";
                  } else {
                    buttonClass += "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";
                  }
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold
                          ${
                            showResult
                              ? isCorrectAnswer
                                ? "bg-green-500 text-white"
                                : isSelected
                                ? "bg-red-500 text-white"
                                : "bg-gray-300 text-gray-600"
                              : isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }
                        `}
                      >
                        {key}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium whitespace-pre-line">{answerText}</p>
                        {showResult && isCorrectAnswer && (
                          <div className="mt-2 flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-semibold">Đáp án đúng</span>
                          </div>
                        )}
                        {showResult && isSelected && !isCorrectAnswer && (
                          <div className="mt-2 flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-semibold">Sai rồi!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {!isAnswered ? (
            <Button
              variant="primary"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="w-full"
            >
              Xác nhận
            </Button>
          ) : isCorrect ? (
            <div className="text-center">
              <p className="text-green-600 font-semibold mb-2">
                {correctCount === 3 ? "Hoàn thành! Đang chấm công..." : "Đúng rồi! Chuyển câu tiếp theo..."}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-2">
                Sai rồi! Bắt đầu lại từ đầu...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

