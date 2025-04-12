"use client"
import { useMediaQuery } from '@react-hook/media-query';
import { useEffect, useState } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  vw: number;
  vh: number;
  scrollY: number;
  scrollX: number;
}

const useResponsive = (): ResponsiveState => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [viewport, setViewport] = useState({
    vh: 0,
    vw: 0,
    scrollY: 0,
    scrollX: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport((prev) => ({
        ...prev,
        vh: window.innerHeight,
        vw: window.innerWidth,
      }));
    };

    const handleScroll = () => {
      setViewport((prev) => ({
        ...prev,
        scrollY: window.scrollY,
        scrollX: window.scrollX,
      }));
    };

    // Initialize values
    handleResize();
    handleScroll();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return {
    isMobile, isTablet, isDesktop,
    vw: viewport.vw,
    vh: viewport.vh,
    scrollY: viewport.scrollY,
    scrollX: viewport.scrollX,
  };
};

export default useResponsive;
