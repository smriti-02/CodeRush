export const useScrollSceneManager = (scrollYProgress) => {
  // scrollYProgress is a Framer Motion motion value (0 to 1)
  // We map it to an overall factor where:
  // 0.0 -> Gun
  // 1.0 -> Trophy
  // 2.0 -> Robot
  
  const getFactor = () => {
    const p = scrollYProgress.get();
    
    // Smooth transitions
    // Section 1 (Gun): 0.0 -> 0.15
    // Transition 1: 0.15 -> 0.35
    // Section 2 (Trophy): 0.35 -> 0.65
    // Transition 2: 0.65 -> 0.85
    // Section 3 (Robot): 0.85 -> 1.0

    if (p < 0.15) {
      return 0;
    } else if (p < 0.35) {
      return (p - 0.15) / 0.20; // 0 to 1
    } else if (p < 0.65) {
      return 1;
    } else if (p < 0.85) {
      return 1 + (p - 0.65) / 0.20; // 1 to 2
    } else {
      return 2;
    }
  };

  return { getFactor };
};
