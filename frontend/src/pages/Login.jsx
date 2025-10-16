import { useForm } from 'react-hook-form';
import { LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const LoginPage = () => {
  const { register, handleSubmit, formState } = useForm();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    await login(data.email, data.password);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 text-white">
          <div className="rounded-2xl bg-primary-600/20 p-3 text-primary-300">
            <LogIn size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Masuk ke CRM Terpadu</h1>
            <p className="text-xs text-slate-400">Kelola percakapan, kampanye, dan prospek dalam satu tempat.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Email</label>
            <input
              type="email"
              placeholder="nama@perusahaan.com"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Kata Sandi</label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
              {...register('password', { required: true })}
            />
          </div>
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formState.isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
