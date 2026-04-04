// src/context/RoleContext.tsx
import React, { createContext, useState, useContext } from 'react';

type Role = 'student' | 'teacher' | 'admin';

type RoleContextType = {
  role: Role;
  cycleRole: () => void;
};

// Create the context with default values
const RoleContext = createContext<RoleContextType>({
  role: 'student',
  cycleRole: () => {},
});

// Create the Provider component that will wrap our app
export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role>('student');

  const cycleRole = () => {
    setRole((prev) => {
      if (prev === 'student') return 'teacher';
      if (prev === 'teacher') return 'admin';
      return 'student';
    });
  };

  return (
    <RoleContext.Provider value={{ role, cycleRole }}>
      {children}
    </RoleContext.Provider>
  );
};

// A custom hook to easily access the role anywhere
export const useRole = () => useContext(RoleContext);