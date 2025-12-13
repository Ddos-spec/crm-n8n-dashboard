import { createContext, useContext, useState } from 'react';

type CustomerContextType = {
  focusName: string | null;
  setFocusName: (name: string | null) => void;
};

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerContextProvider({ children }: { children: React.ReactNode }) {
  const [focusName, setFocusName] = useState<string | null>(null);

  return <CustomerContext.Provider value={{ focusName, setFocusName }}>{children}</CustomerContext.Provider>;
}

export function useCustomerContext() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomerContext must be used within CustomerContextProvider');
  return ctx;
}
