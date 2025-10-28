import { writable, type Writable } from 'svelte/store';
import type { User } from '$lib/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    login: async (username: string, password: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      // Simulasi login - dalam implementasi nyata, ini akan memanggil API
      try {
        // Validasi sederhana
        if (username === 'admin' && password === 'password') {
          const user: User = {
            id: '1',
            username: 'admin',
            email: 'admin@tepatlaser.id',
            role: 'admin',
            name: 'Administrator'
          };
          
          update(state => ({
            ...state,
            user,
            isAuthenticated: true,
            loading: false,
            error: null
          }));
          
          // Simpan informasi pengguna ke localStorage
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('isAuthenticated', 'true');
          
          return { success: true };
        } else {
          // Cek akun customer service
          if (username === 'cs' && password === 'cs123') {
            const user: User = {
              id: '2',
              username: 'cs',
              email: 'cs@tepatlaser.id',
              role: 'customer_service',
              name: 'Customer Service Agent'
            };
            
            update(state => ({
              ...state,
              user,
              isAuthenticated: true,
              loading: false,
              error: null
            }));
            
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
            
            return { success: true };
          } 
          // Cek akun marketing
          else if (username === 'marketing' && password === 'marketing123') {
            const user: User = {
              id: '3',
              username: 'marketing',
              email: 'marketing@tepatlaser.id',
              role: 'marketing',
              name: 'Marketing Agent'
            };
            
            update(state => ({
              ...state,
              user,
              isAuthenticated: true,
              loading: false,
              error: null
            }));
            
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
            
            return { success: true };
          } else {
            update(state => ({
              ...state,
              loading: false,
              error: 'Username atau password salah'
            }));
            
            return { success: false, error: 'Username atau password salah' };
          }
        }
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: 'Terjadi kesalahan saat login'
        }));
        
        return { success: false, error: 'Terjadi kesalahan saat login' };
      }
    },
    logout: () => {
      update(state => ({
        ...state,
        user: null,
        isAuthenticated: false
      }));
      
      // Hapus data dari localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
    },
    checkAuth: () => {
      // Cek apakah pengguna sudah login dari localStorage
      const storedUser = localStorage.getItem('user');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      if (storedUser && isAuthenticated) {
        try {
          const user: User = JSON.parse(storedUser);
          update(state => ({
            ...state,
            user,
            isAuthenticated: true
          }));
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
        }
      }
    },
    clearError: () => {
      update(state => ({
        ...state,
        error: null
      }));
    }
  };
}

export const authStore = createAuthStore();