<script lang="ts">
  import '../app.postcss';
  import { page } from '$app/stores';
  import { redirect } from '@sveltejs/kit';
  import { authStore } from '$stores/auth/authStore';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let isAuthenticated = false;
  let isLoading = true;

  onMount(() => {
    const unsubscribe = authStore.subscribe((state) => {
      isAuthenticated = state.isAuthenticated;
      isLoading = false;
      
      // Cek otentikasi untuk halaman yang dilindungi
      if (browser) {
        const protectedPaths = ['/', '/customer-service', '/marketing'];
        const currentPath = window.location.pathname;
        
        if (protectedPaths.includes(currentPath) && !state.isAuthenticated) {
          // Redirect ke halaman login jika belum otentikasi
          window.location.href = '/login';
        }
      }
    });
    
    // Cek otentikasi saat komponen dimuat
    authStore.checkAuth();
    
    return unsubscribe;
  });
</script>

<svelte:head>
  <title>CRM Dashboard (SvelteKit)</title>
</svelte:head>

{#if !isLoading && isAuthenticated}
  <nav class="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm">
    <div class="flex flex-wrap items-center gap-6">
      <a 
        href="/" 
        class="{$page.url.pathname === '/' ? 'font-semibold text-blue-600' : 'text-slate-600 hover:text-blue-600'}"
      >
        Dashboard Utama
      </a>
      <a 
        href="/customer-service" 
        class="{$page.url.pathname === '/customer-service' ? 'font-semibold text-blue-600' : 'text-slate-600 hover:text-blue-600'}"
      >
        Customer Service
      </a>
      <a 
        href="/marketing" 
        class="{$page.url.pathname === '/marketing' ? 'font-semibold text-blue-600' : 'text-slate-600 hover:text-blue-600'}"
      >
        Marketing
      </a>
    </div>
  </nav>
{/if}

<slot />
