import React, { createContext, useState } from "react";

export const WorkoutContext = createContext();

export const WorkoutProvider = ({ children }) => {
  const [counts, setCounts] = useState({
    handLifts: 0,
    eyeBlinks: 0,
    pushUps: 0,
    highJumps: 0,
    squats: 0,
    jumpingJacks: 0,
    lunges: 0,
  });

  const updateCount = (key, value) => {
    setCounts((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <WorkoutContext.Provider value={{ counts, updateCount }}>
      {children}
    </WorkoutContext.Provider>
  );
};