"use client"
import { useEffect, useRef, useState } from "react";
import { Modal } from "antd"; // Import Modal from antd
import Confetti from "react-confetti";

const Wheel = () => {
    const [currentRotation, setCurrentRotation] = useState(0);
    const [rotationNumber, setRotationNumber] = useState(0);
    const [prize, setPrize] = useState("");
    const [isSpinning, setIsSpinning] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [spinAudio, setSpinAudio] = useState<any | null>(null);
    const [clapAudio, setClapAudio] = useState<any | null>(null);
    const [windowWidth, setWindowWidth] = useState<number>(0);
    const [windowHeight, setWindowHeight] = useState<number>(0);
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const rotationCountRef = useRef<HTMLDivElement | null>(null);
    const prizeStatRef = useRef<HTMLDivElement | null>(null);

    const prizes = [
        "100.000 VND",
        "200.000 VND",
        "500.000 VND",
        "1.000.000 VND",
        "10 USDT",
        "20 USDT",
        "50 USDT",
        "100 USDT",
        "Chúc bạn may mắn lần sau",
        "1 tràng vỗ tay",
        "2 texlink của F88",
        "2 GP của F88",
    ];

    useEffect(() => {
        // Initialize Audio objects
        setSpinAudio(new Audio("/audio/spin.mp3"));
        setClapAudio(new Audio("/audio/votay.mp3"));

        // Set window dimensions
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);

        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const spinWheel = () => {
        if (isSpinning) return;

        spinAudio.play();
        setIsSpinning(true);
        setShowConfetti(false);

        const totalSectors = prizes.length;
        const selectedIndex = Math.floor(Math.random() * totalSectors);
        const rotation = (360 / totalSectors) * selectedIndex + 3 * 360;

        setCurrentRotation((prev) => prev + rotation);
        setRotationNumber((prev) => prev + 1);

        setTimeout(() => {
            const finalRotation = (currentRotation + rotation) % 360;
            const prizeIndex = Math.floor((finalRotation / 360) * totalSectors);
            const newPrize = prizes[(totalSectors - prizeIndex) % totalSectors];

            setPrize(newPrize);
            if (rotationCountRef.current) {
                rotationCountRef.current.innerHTML = String(rotationNumber + 1);
            }
            if (prizeStatRef.current) {
                prizeStatRef.current.innerHTML = newPrize;
            }

            setIsSpinning(false);
            setShowConfetti(true);

            spinAudio.pause();
            clapAudio.play();

            setTimeout(() => {
                setShowConfetti(false);
            }, 3000);

            // Show reward modal
            showModal(newPrize);
        }, 4800);
    };

    const showModal = (newPrize: string) => {
        Modal.info({
            title: 'Chúc mừng!',
            content: (
                <div>
                    <p>Bạn đã trúng: <strong>{newPrize}</strong></p>
                </div>
            ),
        });
    };

    useEffect(() => {
        if (wheelRef.current) {
            wheelRef.current.style.transform = `rotate(${currentRotation}deg)`;
        }
    }, [currentRotation]);

    const smallConfettiShape = (context: any) => {
        context.beginPath();
        context.rect(0, 0, 5, 10);
        context.fillStyle = context.fillStyle;
        context.fill();
        context.closePath();
    };
    return (
        <div>
            <Confetti
                numberOfPieces={1000}
                width={windowWidth}
                height={windowHeight}
                recycle={showConfetti}
                drawShape={smallConfettiShape}
            />
            <div id="wheel-container">
                <span className="arrow"></span>
                <a
                    id="spin"
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        spinWheel();
                    }}
                >
                    <span>
                        <i className="">Click to</i> Spin
                    </span>
                </a>
                <div id="wheel" ref={wheelRef}>
                    {prizes.map((prize, index) => (
                        <div className="sector" key={index} data-value={prize}>
                            <div className="content">
                                <div className="number">{prize}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Wheel;
