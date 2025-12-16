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
    CâuHỏi: "Content thường giá sao?",
    ĐápÁn: {
      A: "Hình như odr 1 và 7 là 60k thì phải",
      B: "Thường thì odr nào viết giá 50-60k là content viết tay, 25-30k là viết AI",
      C: "Hỏi ad cho nhanh"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Có bao nhiêu vị trí text?",
    ĐápÁn: {
      A: "Có 1 vị trí là footer",
      B: "Text Footer và home",
      C: "Text Footer, home và header"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Cty tên gì, slogan là gì?",
    ĐápÁn: {
      A: "Chang You - tự do, hòa bình, tình yêu, phẩm giá",
      B: "Panda - tự do, hoà bình, tình yêu, phẩm giá",
      C: "Mỗi team 1 tên slogan là tự do, hoà bình, tình yêu, phẩm giá"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Con mèo của cty tên gì?",
    ĐápÁn: {
      A: "Mi",
      B: "Si",
      C: "Di"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Hiện tại công việc của chúng ta làm gì?",
    ĐápÁn: {
      A: "Bán backlink",
      B: "Chúng ta kinh doanh, công việc là Kinh Doanh",
      C: "SEO mớ website để bán backlink"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Giờ nên làm gì?",
    ĐápÁn: {
      A: "Toả sáng và nổi bật",
      B: "Ngẫm về cuộc đời và tương lai",
      C: "Ngẫm về quá khứ và sai lầm"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Khách hỏi mình có phải chủ site không thì nói sao?",
    ĐápÁn: {
      A: "Em chủ site khoảng 50 site và giá tốt trên thị trường",
      B: "Bên em ctv thôi",
      C: "Em ctv cấp 1 giá tốt"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Có cần check lại content khi lên GP không?",
    ĐápÁn: {
      A: "Lên luôn khỏi check vì bên content đã làm rồi hoặc khách đã đưa",
      B: "Check qua xem anchor và link đã chèn đúng chưa hoặc chưa chèn",
      C: "Đủ số lượng là được"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Payment: KH đang check đi đơn mà site ngưng không có trong file báo giá thì xử lý sao?",
    ĐápÁn: {
      A: "Báo data fix lại",
      B: "Có thể tự fix trên youlink và cập nhật phần ghi chú là 'Ngưng GP' hoặc 'Ngưng Text'",
      C: "A, B hoặc báo AD xử lý cho nhanh"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Payment: site gia hạn bị gỡ text do NCC miss, payment phạt tiền, bán hàng nên làm gì?",
    ĐápÁn: {
      A: "Báo chủ site về vấn đề họ miss và đề nghị họ chịu 100% hoặc chia 50-50",
      B: "Báo chủ site huỷ text gia hạn để không bị phạt",
      C: "Báo khách về việc chủ site chịu bù ngày gia hạn, NCC và BH tự thương lượng"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Payment check nghiệm thu nhưng giá GP đã thay đổi, bán hàng nên làm gì?",
    ĐápÁn: {
      A: "Cân nhắc thay đổi giá linh hoạt cho khách",
      B: "Cứng nhắc không deal lại giá",
      C: "Linh hoạt theo giá khách và xin họ chụp lại báo giá thời điểm đó"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Chủ site báo cần thêm đuôi //3399,... thì bán hàng nên làm gì?",
    ĐápÁn: {
      A: "Lơ đi",
      B: "Check khách có lên bài không và báo khách",
      C: "Tag ad, data, Phương Tuấn vào nhận thông tin"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Một bài GP có bao nhiêu link Dofollow?",
    ĐápÁn: {
      A: "Nhiều link tùy NCC",
      B: "1–2 link Dofollow",
      C: "Không có link dofollow"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Link Nofollow trong bài GP có chấp nhận không?",
    ĐápÁn: {
      A: "Không, phải là link dofollow",
      B: "Có, đủ anchor url là được",
      C: "Cả 2"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Căn nguyên mọi vấn đề do đâu?",
    ĐápÁn: {
      A: "Do thị trường",
      B: "Do bản thân mình",
      C: "Do yếu tố xung quanh"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Đâu là mã ví thanh toán Tron (USDT)?",
    ĐápÁn: {
      A: "TRC20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd3qMV",
      B: "TRC20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd0sRX",
      C: "TRC20\n0x8ae92d5cd95c0bec95a352df16f40eacb83837b8"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Khi check site phát hiện giá sai trên hệ thống thì làm gì?",
    ĐápÁn: {
      A: "Báo lại data check giá và đợi phản hồi",
      B: "Chủ động check file NCC rồi báo data fix",
      C: "Thấy lời thì bán"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Tại sao BH spam mãi nhưng không có đơn?",
    ĐápÁn: {
      A: "Chưa có niềm tin và lý tưởng công việc",
      B: "Giao tiếp kém, sợ bị nói",
      C: "Lười online"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đâu là mã ví thanh toán BSC (USDT)?",
    ĐápÁn: {
      A: "Bep20\n0x8ae92d5cd95c0bec95a352df16f40eacb83837b8",
      B: "Bep20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd3qMV",
      C: "Bep20\n0x8ae92d5cd95c0bec95a352df16f40eacb8388b37"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Tỉ giá USD hiện nay là bao nhiêu VNĐ?",
    ĐápÁn: {
      A: "27.000 VNĐ",
      B: "27.500 VNĐ",
      C: "28.000 VNĐ"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khách muốn lọc site GP traffic >50k, DR >20, giá <2tr thì lọc cột nào?",
    ĐápÁn: {
      A: "DR, link out, giá GP",
      B: "DR, traffic, giá GP",
      C: "DR, traffic, giá text"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Khách đặt text 10 ngày rồi báo huỷ, xử lý sao?",
    ĐápÁn: {
      A: "Đồng ý huỷ và báo NCC gỡ text",
      B: "Xin huỷ NCC — NCC nào cho huỷ thì OK, NCC nào không thì tính tiền số ngày đã đặt",
      C: "Không cho huỷ vì đã 10 ngày"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "GP: sau bao lâu không index thì nên huỷ bài?",
    ĐápÁn: {
      A: "Khoảng 2 tuần",
      B: "Khoảng 10 ngày",
      C: "Khoảng 20 ngày"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Khách mua text bị âm 5u sau CK8% thì xử lý sao?",
    ĐápÁn: {
      A: "Báo data kê giá cao lên 1 chút",
      B: "Kệ, đi luôn",
      C: "Báo data kê giá để tránh âm, sau đó báo lại giá mới cho khách"
    },
    ĐápÁnĐúng: "C"
  }
];

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wrongAnswerIndices?: number[]) => void;
}

export default function QuizModal({ isOpen, onClose, onSuccess }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [wrongAnswerIndices, setWrongAnswerIndices] = useState<number[]>([]);

  // Chọn ngẫu nhiên 3 câu hỏi khi mở modal
  useEffect(() => {
    if (isOpen && quizQuestions.length > 0) {
      const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 3);
      setShuffledQuestions(shuffled);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCorrectCount(0);
      setWrongAnswerIndices([]);
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
          // Truyền danh sách các câu trả lời sai (đã là số thứ tự từ 1-3)
          const wrongAnswers = wrongAnswerIndices.length > 0 
            ? wrongAnswerIndices.sort((a, b) => a - b)
            : undefined;
          onSuccess(wrongAnswers);
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
      // Lưu số thứ tự câu hỏi sai (số thứ tự trong lần quiz hiện tại: 1, 2, hoặc 3)
      const questionNumber = currentQuestionIndex + 1;
      setWrongAnswerIndices((prev) => {
        // Chỉ thêm nếu chưa có trong danh sách (tránh trùng lặp)
        if (!prev.includes(questionNumber)) {
          return [...prev, questionNumber].sort((a, b) => a - b);
        }
        return prev;
      });
      
      // Nếu sai, reset về câu đầu và shuffle lại vì phải đúng liên tiếp 3 câu
      // Lưu ý: KHÔNG reset wrongAnswerIndices để giữ lại tất cả các câu đã sai
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
    setWrongAnswerIndices([]);
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

