export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'customer_service' | 'marketing';
  name: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}