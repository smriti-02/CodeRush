import React, { useState, useEffect } from 'react';

const AnimatedNumber = ({ from, to, duration = 1000, className }) => {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // Easing function (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setCurrent(Math.floor(from + (to - from) * easeProgress));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(to);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [from, to, duration]);

  return <span className={className}>{current}</span>;
};

export default AnimatedNumber;
