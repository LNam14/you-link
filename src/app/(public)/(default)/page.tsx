import Chat from "./components/chat"
import Contact from "./components/contact"
import HeroHome from "./components/hero-home"
import Product from "./components/product"
import dynamic from "next/dynamic"
import BauCua from "./components/bau-cua"

const SpinLucky = dynamic(() => import("./components/spin-lucky"), {
  ssr: false,
})

export default function Home() {
  return (
    <>
      <HeroHome />
      <div id="products">
        <Product title="Sản phẩm của You Link" />
      </div>
      <SpinLucky title="Vòng quay may mắn" />
      <BauCua title="Bầu Cua Tôm Cá" />
      <Chat title="Chat trực tuyến với mọi người" />
      <Contact title="Liên hệ với chúng tôi" />
    </>
  )
}
