export const useScrollSceneManager = (scrollYProgress) => {
  // scrollYProgress is a Framer Motion motion value (0 to 1)
  // We map it to an overall factor where:
  // 0.0 -> Gun
  // 1.0 -> Trophy
  // 2.0 -> Robot
  
  const getFactor = () => {
    const p = scrollYProgress.get();
    
    // Smooth transitions
    // Section 1 (Gun): 0.0 -> 0.10
    // Transition 1: 0.10 -> 0.45
    // Section 2 (Trophy): 0.45 -> 0.55
    // Transition 2: 0.55 -> 0.90
    // Section 3 (Robot): 0.90 -> 1.0

    if (p < 0.10) {
      return 0;
    } else if (p < 0.45) {
      return (p - 0.10) / 0.35; // 0 to 1
    } else if (p < 0.55) {
      return 1;
    } else if (p < 0.90) {
      return 1 + (p - 0.55) / 0.35; // 1 to 2
    } else {
      return 2;
    }
  };

  return { getFactor };
};
