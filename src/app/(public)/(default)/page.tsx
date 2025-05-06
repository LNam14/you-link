import Chat from "./components/chat";
import Contact from "./components/contact";
import HeroHome from "./components/hero-home";
import Product from "./components/product";
import dynamic from 'next/dynamic';

const SpinLucky = dynamic(() => import("./components/spin-lucky"), {
  ssr: false
});

export default function Home() {

  return (
    <>
      <HeroHome />
      <Product title="Sản phẩm của You Link" />
      <SpinLucky title="Vòng quay may mắn" />
      <Chat title="Chat trực tuyến với mọi người" />
      <Contact title="Liên hệ với chúng tôi" />
    </>
  );
}
