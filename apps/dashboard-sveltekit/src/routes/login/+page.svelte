<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$stores/auth/authStore';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let username = '';
  let password = '';
  let loading = false;
  let error = '';
  let showPassword = false;

  onMount(() => {
    // Cek apakah pengguna sudah otentikasi
    authStore.checkAuth();
    
    // Jika sudah otentikasi, arahkan ke dashboard
    const unsubscribe = authStore.subscribe(state => {
      if (state.isAuthenticated && browser) {
        goto('/');
      }
    });
    
    return unsubscribe;
  });

  async function handleLogin(event: Event) {
    event.preventDefault();
    loading = true;
    error = '';
    
    const result = await authStore.login(username, password);
    
    if (result.success) {
      // Arahkan ke dashboard setelah login berhasil
      if (browser) {
        goto('/');
      }
    } else {
      error = result.error || 'Terjadi kesalahan saat login';
    }
    
    loading = false;
  }

  // Fungsi untuk login cepat sebagai contoh
  async function quickLogin(role: 'admin' | 'cs' | 'marketing') {
    loading = true;
    error = '';
    
    let result;
    if (role === 'admin') {
      result = await authStore.login('admin', 'password');
    } else if (role === 'cs') {
      result = await authStore.login('cs', 'cs123');
    } else {
      result = await authStore.login('marketing', 'marketing123');
    }
    
    if (result.success) {
      if (browser) {
        goto('/');
      }
    } else {
      error = result.error || 'Terjadi kesalahan saat login';
    }
    
    loading = false;
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
  <div class="w-full max-w-md space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-slate-900">CRM Dashboard</h2>
      <p class="mt-2 text-center text-sm text-slate-600">Masuk ke akun Anda untuk melanjutkan</p>
    </div>
    
    <div class="rounded-xl bg-white p-8 shadow sm:px-10">
      {#if error}
        <div class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p>{error}</p>
        </div>
      {/if}
      
      <form class="space-y-6" method="post" on:submit={handleLogin}>
        <div>
          <label for="username" class="block text-sm font-medium text-slate-700">Username</label>
          <div class="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              class="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              bind:value={username}
            />
          </div>
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
          <div class="mt-1 relative">
            {#if showPassword}
              <input
                id="password"
                name="password"
                type="text"
                autocomplete="current-password"
                required
                class="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                bind:value={password}
              />
            {:else}
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                class="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                bind:value={password}
              />
            {/if}
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="show-password"
              name="show-password"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              on:change={() => showPassword = !showPassword}
            />
            <label for="show-password" class="ml-2 block text-sm text-slate-900">Tampilkan password</label>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </div>
      </form>
      
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-slate-500">Atau coba akun demo</span>
          </div>
        </div>
        
        <div class="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            on:click={() => quickLogin('admin')}
            disabled={loading}
          >
            Admin
          </button>
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            on:click={() => quickLogin('cs')}
            disabled={loading}
          >
            CS
          </button>
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            on:click={() => quickLogin('marketing')}
            disabled={loading}
          >
            MKT
          </button>
        </div>
      </div>
    </div>
    
    <div class="text-center text-sm text-slate-600">
      <p>Credential demo:</p>
      <ul class="mt-1 space-y-1">
        <li>Admin: admin / password</li>
        <li>Customer Service: cs / cs123</li>
        <li>Marketing: marketing / marketing123</li>
      </ul>
    </div>
  </div>
</div>