import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';

interface ViewportManagerProps {
  screens: { id: string; name: string; component: React.ReactNode }[];
}

export const ViewportManager: React.FC<ViewportManagerProps> = ({ screens }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = (newDirection: number) => {
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = screens.length - 1;
    if (nextIndex >= screens.length) nextIndex = 0;
    
    setDirection(newDirection);
    setCurrentIndex(nextIndex);
  };

    const variants = {
      enter: (dir: number) => ({
        x: dir > 0 ? '100%' : '-100%',
        zIndex: 1
      }),
      center: {
        x: 0,
        zIndex: 1
      },
      exit: (dir: number) => ({
        x: dir < 0 ? '50%' : '-50%',
        zIndex: 0,
        opacity: 0.5
      })
    };

  const swipeConfidenceThreshold = 5000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    // Снижены пороги для более отзывчивого свайпа
    if (swipe < -swipeConfidenceThreshold || offset.x < -50) {
      slide(1);
    } else if (swipe > swipeConfidenceThreshold || offset.x > 50) {
      slide(-1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#050505] text-slate-100 font-sans relative pb-[env(safe-area-inset-bottom,0px)]">
      
      {/* Main Workspace */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 w-full h-full p-1 flex flex-col"
          >
            {screens[currentIndex].component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* OS Global Dock (Lower Container) */}
      <div className="h-8 border-t border-slate-800 bg-black/80 backdrop-blur-md flex items-center justify-center px-2 z-10 shrink-0">
        {/* Dynamic Screen Indicators */}
        <div className="flex gap-2">
          {screens.map((screen, idx) => (
             <button 
               key={screen.id} 
               onClick={() => {
                 setDirection(idx > currentIndex ? 1 : -1);
                 setCurrentIndex(idx);
               }}
               className={`h-1.5 transition-all rounded-full ${idx === currentIndex ? 'w-8 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'w-2.5 bg-slate-700 hover:bg-slate-500'}`}
               title={screen.name}
             />
          ))}
        </div>
      </div>
      
    </div>
  );
};
