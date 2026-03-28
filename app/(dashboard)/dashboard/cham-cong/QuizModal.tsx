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
    CâuHỏi: "giổ tổ nghề backlink ngày bao nhiêu",
    ĐápÁn: {
      A: "ngày 20 âm lịch",
      B: "ngày 22 âm lịch",
      C: "chưa có ngày"
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
    CâuHỏi: "Phiên bản hiện tại là pb gì",
    ĐápÁn: {
      A: "PB5",
      B: "PB6",
      C: "PB4"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Kế Toán tên gì",
    ĐápÁn: {
      A: "Chân Thế Dân",
      B: "Xiao Min",
      C: "Chân Như Kim"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "HR tên gì",
    ĐápÁn: {
      A: "Uyên An",
      B: "Xiao Min",
      C: "Chân Như Kim"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Để đạt được mức lương 26,5 ngày công thì LN phải ở mức",
    ĐápÁn: {
      A: "< 18200u",
      B: "< 1920u",
      C: "< 2020u"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Mảng backlink của cty hiện tại có bao nhiêu team chính",
    ĐápÁn: {
      A: "2",
      B: "3",
      C: "4"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Trường hợp nào thì admin đòi nợ giúp bán hàng",
    ĐápÁn: {
      A: "Có nợ là admin chủ động đòi cho bán hàng.",
      B: "Khách nợ quá 2 tháng và bán hàng không đòi được.",
      C: "admin không có nhiệm vụ đòi nợ dùm."
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "GP đã index thanh toán tiền cho ncc rồi, nhưng khách chốt thanh toán thì lại không index nữa, thì bán hàng nên làm gì",
    ĐápÁn: {
      A: "Báo khách đợi thêm 1,2 ngày và nhắc ncc ép index lại nếu không index được thì đổi url cho index hoặc hoàn tiền cho mình. Báo khách chốt thanh toán.",
      B: "Báo ncc gỡ hoàn tiền",
      C: "Báo khách cứ tt GP chưa index sau đó cố ép index cho họ."
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đơn của khách là 500u nhưng khi lên payment ép giá xuống 450u thì nên làm gì",
    ĐápÁn: {
      A: "Báo hủy đơn",
      B: "Không đồng ý thỏa thuận deal này",
      C: "Check xem có lời không, nếu vẫn lời thì hỗ trợ khách giá payment đưa ra."
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Nếu KH vượt tín dụng thì phải làm sao?",
    ĐápÁn: {
      A: "Báo AD check và xin nâng tín dụng, một là nâng tín dụng lên hoặc dừng bán thu hồi nợ dưới mức tín dụng",
      B: "BH tự nâng tín dụng",
      C: "Vẫn đi đơn mặc kệ tín dụng bị vượt"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Đối với KH mới cần làm những gì?",
    ĐápÁn: {
      A: "Tạo mã KH và tạo group là xong",
      B: "Đi đơn luôn không cần làm gì",
      C: "BH lấy mã KH, tạo group add AD và KH, tạo file KH, xin AD cấp tín dụng để đi đơn"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "GP ở file ncc index (đã thanh toán), nhưng KH check không index đòi hủy không thanh toán thì xử lý như thế nào?",
    ĐápÁn: {
      A: "Xin gỡ là được, không cần làm gì thêm",
      B: "Xin gỡ và xin ncc hoàn tiền (nếu ncc đồng ý hoàn tiền). Còn NCC không đồng ý hoàn tiền thì báo ncc fix lại url, đổi content (content sạch dạng cầu thủ,...) và ép thêm. Nếu KH vẫn không đồng ý và đòi hủy thì BH sẽ phải chịu chi phí bài GP đó",
      C: "Đi hỏi AD"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Đơn đi được 1 tuần khi hủy note ở những file nào?",
    ĐápÁn: {
      A: "File NCC, file KT6 và file KH",
      B: "File NCC",
      C: "File NCC, file KT6"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Bên mình còn xài 2 ví này không: \nTrc20: TVFNucFznW6sDxU2uA2c2z9wmy2Xmd3qMV\nBep20: 0x8ae92d5cd95c0bec95a352df16f40eacb83837b8",
    ĐápÁn: {
      A: "Có",
      B: "Không",
      C: "Bỏ địa chỉ ví Trc20, vẫn dùng địa chỉ ví Bep20"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Cách note chi phí content đúng",
    ĐápÁn: {
      A: "A. Thích note sao thì note",
      B: "B. Chỉ note chi phí, không note gì thêm",
      C: "C. Note chuẩn như 1 NCC bình thường gồm chi phí + tên ncc + mã NCC + tên người đi đơn"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Cách gỡ/hủy các đơn GP/Text đúng",
    ĐápÁn: {
      A: "A. Không xin NCC, tự ý note hủy/gỡ",
      B: "B. Xin NCC, note hủy/gỡ trên file NCC và file KT6. Nếu đơn đã được thanh toán thì xin hoàn tiền và note trừ tiền để nhận lại tiền",
      C: "C. Xin NCC rồi nhưng chỉ note hủy/gỡ trên file kt6, không note hủy /gỡ trên file ncc"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Khi gia hạn text cho khách có cần check lại giá không?",
    ĐápÁn: {
      A: "A. Check lại giá mới nhất và báo khách giá mới, khách oke mới gia hạn",
      B: "B. Không, lấy giá cũ đi đơn cho khách luôn",
      C: "C. Gia hạn trước báo giá khách sau cũng được"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Nếu công việc stress quá thì nên làm gì",
    ĐápÁn: {
      A: "A. Đọc sách, xem phim, nghe nhạc, tán gẫu, du lịch...nói chung làm gì bạn thích",
      B: "B. Than vãn với người khác",
      C: "C. Mặc kệ vẫn làm tiếp"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Hiện đang dùng bao nhiêu ví để nhận tiền KH bank",
    ĐápÁn: {
      A: "A. Chỉ dùng  2 ví (Mexc 0x0c58df0579c6e5fb7801a1d40a27e2558d9ef932, Mexc TJj39JVR8EDs4hrJH5VN5MG9JFtXp5tHqw)",
      B: "B. Chỉ dùng 3 ví (Bina 0xc98d818f4303c9bcd9eec93bbff48680fb6172c9, Bina TEBGFEUTPEPuq4QAeeP9u6Rjagtb9ENZXS)",
      C: "C. 5 ví (Mexc 0x0c58df0579c6e5fb7801a1d40a27e2558d9ef932, Mexc TJj39JVR8EDs4hrJH5VN5MG9JFtXp5tHqw, Bina 0xc98d818f4303c9bcd9eec93bbff48680fb6172c9, Bina TEBGFEUTPEPuq4QAeeP9u6Rjagtb9ENZXS, Mexc 0xec4983ada0acb27d3bd1c90b21b6e922c391eed3)"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "NCC kêu tt tag ai",
    ĐápÁn: {
      A: "tag Chân Thế Dân",
      B: "tag Chân Như Kim",
      C: "tag ad của mình"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Slogan của F là gì",
    ĐápÁn: {
      A: "Quyền riêng tư - luôn là chính mình - tỏa sáng",
      B: "Tự Do - Hòa Bình - Tình Yêu - Phẩm Giá",
      C: "Phẩm Giá - Tỏa Sáng"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Khi note bill thanh toán, cần note những file nào?",
    ĐápÁn: {
      A: " File KT",
      B: " File KT và file KH",
      C: " File KT, file KH và file PB6"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khi đi đơn trên choseo, trường hợp gặp site khách chọn giá thấp hơn so với giá trong tool check nhiều thì nên xử lý như thế nào?",
    ĐápÁn: {
      A: " Báo khách site lệch giá và xóa site trong đơn",
      B: " Vẫn nhận đơn đi bình thường",
      C: " Báo khách site lệch giá và xóa site trong đơn, vào phần sản phẩm và cập nhật lại giá đúng"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Thời gian bảo hành đơn GP là bao lâu",
    ĐápÁn: {
      A: "3 tháng",
      B: "4 tháng",
      C: "6 tháng"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Khách đi đơn GP, bài đã lên được hơn 1 tuần nhưng chưa index (hoặc đã index) mà khách muốn đổi site khác thì có hỗ trợ cho khách đổi site không?",
    ĐápÁn: {
      A: "Có",
      B: "Không ",
      C: "cần suy nghĩ t hêm"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "KH muốn tăng CK lên 10% vì đi đơn nhiều và đã mua lâu bên mình thì có đồng ý tăng không?",
    ĐápÁn: {
      A: "Có",
      B: "Không ",
      C: "Hỏi ad hoặc sếp"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Ncc yêu cầu đổi content sang bài có hợp quy theo yêu cầu của họ ",
    ĐápÁn: {
      A: "ODR lại bài mới",
      B: "Tự ngồi sửa",
      C: "Nhờ bên viết bài fix lại giúp"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khách nói \" giá bán bên em cao hơn vài bên anh biết\"",
    ĐápÁn: {
      A: "Bên em giá thấp k cao đâu ạ",
      B: "80% bên em mua trực tiếp từ CS, luôn đảm bảo mức giá ổn định và cạnh tranh nhất thị trường",
      C: "Để em hỏi sếp ạ"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "KH: Site bên em nhiều site cũ, traffic k cao ",
    ĐápÁn: {
      A: "Bên em có nhiều site mới anh xem lại nha",
      B: "Để em tìm thêm site",
      C: "Bên em có cập nhật site mới hàng ngày ạ, anh cần tìm site theo yêu cầu gì cần em hỗ trợ không ạ và gởi KH 1 list các site có tỷ lệ index cao, traffic ổn định nhất hiện tại"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Lợi nhuận của bạn có dấu hiệu giảm trong vài tuần liên tiếp, bạn cần làm gì",
    ĐápÁn: {
      A: "Kết nối lại kh cũ lâu không lên đơn, tương tác thêm với kh hiện tại nhờ họ giới thiệu thêm kh, minigame khuyến khích kh lên đơn",
      B: "Xin admin cho khách",
      C: "Đợi thêm khi nào kh cần sẽ tăng thêm đơn"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "Ncc báo site tăng giá khi lên đơn",
    ĐápÁn: {
      A: "Ok với ncc báo họ lên bài",
      B: "Yêu cầu lên bài với giá cũ sẽ fix từ những bài sau",
      C: "Báo kh mức giá mới, khách ok rồi thì báo data fix giá ( hoặc tự fix nếu biết thao tác) rồi báo ncc lên bài"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "Khái niệm BH của F là như nào",
    ĐápÁn: {
      A: "1 ng bán hàng tốt, bán hàng rất tốt",
      B: "1 ng mkt, bán hàng, thu nợ, xử lý tình huống, có nhiều ý tưởng hay",
      C: "1 ng kiếm dc khách, bán dc hàng"
    },
    ĐápÁnĐúng: "B"
  },
  {
    CâuHỏi: "Khái niệm Kế Toán của F như nào",
    ĐápÁn: {
      A: "1 ng note dc thu chi, và thanh toán ncc",
      B: "kiểm soát dc tài chính, tối ưu thu vô, và hạn chế chi ra",
      C: "1 ng có khả năng kiểm soát đầu vô, thanh toán dc cho nhân sự"
    },
    ĐápÁnĐúng: "C"
  },
  {
    CâuHỏi: "khái niệm AD của F như nào",
    ĐápÁn: {
      A: "bán dc hàng, tổ chức dc team, quan tâm dc team mình và có ý tưởng hay, độc lập, tự chủ",
      B: "bán hàng giỏi nhất trong team",
      C: "Ng nhiều ý tưởng nhất trong team, bán dc hàng giỏi nhất"
    },
    ĐápÁnĐúng: "A"
  },
  {
    CâuHỏi: "F là gì",
    ĐápÁn: {
      A: "F chưa phân loại vô dc cái gì",
      B: "F là cty",
      C: "F là môn phái"
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

