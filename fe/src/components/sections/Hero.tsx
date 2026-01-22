import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
const images = ["/hero1.jpg", "/hero2.png", "/hero3.png", "/hero4.jpg"];

const Hero = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center items-center px-4 pb-6 bg-[#e7e7e3]">
      <div className="max-w-[1440px] w-full grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
        {/* Layout 1 */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="text-center">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-8xl font-extrabold text-gray-900 leading-tight">
              DO IT <span className="text-[#4a69e2]">RIGHT</span>
            </h1>
          </div>
          <div className="relative w-full">
            <img
              src="/slide.png"
              alt="ecommerce-banner"
              width={700}
              height={700}
              className="w-full h-[420px] sm:h-[500px] md:h-[680px] object-cover rounded-2xl shadow-xl"
            />

            <div className="absolute inset-0 bg-black/30 rounded-2xl"></div>

            <div className="absolute inset-0 flex flex-col items-start justify-center text-white px-4 text-start">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold drop-shadow-xl tracking-wide">
                TECH E-COMMERCE
              </h2>
              <p className="text-sm sm:text-lg md:text-xl mt-3 opacity-90">
                We always prioritize product <br /> quality over quantity.
              </p>
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col gap-4">
              <img
                src="/thumb2.jpg"
                alt="thumb1"
                className="w-20 sm:w-24 md:w-28 h-20 sm:h-24 md:h-28 rounded-xl border-4 border-white object-cover shadow-xl"
              />
              <img
                src="/thumb1.jpg"
                alt="thumb2"
                className="w-20 sm:w-24 md:w-28 h-20 sm:h-24 md:h-28 rounded-xl border-4 border-white object-cover shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Layout 2 */}
        <div className="relative w-full h-[680px] hidden xl:flex items-center justify-center ">
          <div className="absolute inset-0 z-0">
            <img
              src="/slide2.png"
              alt="slide 2"
              width={700}
              height={700}
              className="w-full h-[700px] object-cover rounded-2xl shadow-lg blur-lg"
            />
          </div>

          <div className="relative w-[380px] h-[380px] overflow-hidden rounded-full shadow-lg z-10">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeIndex}
                src={images[activeIndex]}
                alt="Main shoe"
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute w-full h-full object-cover rounded-full"
              />
            </AnimatePresence>
          </div>

          {images.map((img, index) => {
            const angle = 90 + (index / (images.length - 1)) * 160;
            const radius = 240;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`absolute w-20 h-20 rounded-full border-2 bg-white shadow-md transition cursor-pointer ${
                  activeIndex === index
                    ? "border-blue-400 scale-110"
                    : "border-gray-300"
                }`}
                style={{
                  left: `calc(50% + ${x}px - 40px)`,
                  top: `calc(50% + ${y}px - 40px)`,
                }}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-full"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Hero;
