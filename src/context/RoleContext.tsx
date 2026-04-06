// src/context/RoleContext.tsx
import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

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
  const { role: authRole } = useAuth();
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);

  const role: Role = simulatedRole ?? authRole;

  const cycleRole = () => {
    if (authRole !== 'admin') {
      return;
    }

    setSimulatedRole((prev) => {
      const current = prev ?? authRole;
      if (current === 'student') return 'teacher';
      if (current === 'teacher') return 'admin';
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