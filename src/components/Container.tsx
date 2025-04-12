
// import { useMenu } from '@/app/context/MenuContext';
// import useResponsive from '@/hook/useResponsive';
import React from 'react';
type ContainerProps = {
    children: React.ReactNode;
};

const Container: React.FC<ContainerProps> = ({ children }) => {
    // const { buttonClicked } = useMenu();
    // const { isMobile } = useResponsive();
    return (
        <div className=" h-[calc(100vh-50px)] py-1.5" style={{
            // maxWidth: !isMobile ? (buttonClicked ? 'calc(100vw - 60px)' : 'calc(100vw - 18px)') : (buttonClicked ? 'calc(100vw - 30px)' : 'calc(100vw - 10px)'),
            transition: "max-width 0.3s ease-in-out",
            overflowY: 'auto', // Cuộn theo chiều dọc
            scrollbarWidth: 'none',
            overflowX: 'hidden', // Ẩn cuộn theo chiều ngang (nếu cần)
        }}>
            {children}
        </div>
    );
};

export default Container;
