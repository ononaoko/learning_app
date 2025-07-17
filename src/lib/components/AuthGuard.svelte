<!-- $lib/components/AuthGuard.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { authGuard } from '$lib/stores/authGuard.js';
    import { isLoggedIn } from '$lib/authStore.js';

    // 認証が必要なページのパターン
    const protectedRoutes = [
      '/dashboard',
      '/normal-mode',
      '/review-mode',
      '/stats'
    ];

    // 認証が不要なページのパターン
    const publicRoutes = [
      '/',
      '/login'
    ];

    let cleanupVisibilityListener;
    let isInitialized = false;

    // 現在のページが認証が必要かチェック
    function isProtectedRoute(pathname) {
      return protectedRoutes.some(route => pathname.startsWith(route));
    }

    // 初期認証チェック
    async function initializeAuth() {
      if (!browser || isInitialized) return;

      const currentPath = $page.url.pathname;
      console.log('AuthGuard初期化:', currentPath);

      // 保護されたページにいる場合のみ認証チェック
      if (isProtectedRoute(currentPath)) {
        console.log('保護されたページです。認証チェック実行中...');
        const isValid = await authGuard.verifyAndRedirect(currentPath);

        if (isValid === false) {
          console.log('認証失敗: ログイン画面に遷移します');
          return;
        }
      }

      isInitialized = true;
    }

    onMount(async () => {
      if (!browser) return;

      // 初期認証チェック
      await initializeAuth();

      // 定期的な認証チェックを開始（5分間隔）
      authGuard.startPeriodicCheck(5);

      // ページ可視化時の認証チェックを設定
      cleanupVisibilityListener = authGuard.checkOnVisibilityChange();

      console.log('AuthGuard: 認証監視を開始しました');
    });

    onDestroy(() => {
      if (!browser) return;

      // 定期チェックを停止
      authGuard.stopPeriodicCheck();

      // 可視化イベントリスナーをクリーンアップ
      if (cleanupVisibilityListener) {
        cleanupVisibilityListener();
      }

      console.log('AuthGuard: 認証監視を停止しました');
    });

    // ページ変更時の認証チェック
    $: if (browser && isInitialized && $page.url.pathname) {
      const currentPath = $page.url.pathname;

      if (isProtectedRoute(currentPath)) {
        // 保護されたページに遷移した場合、認証チェック
        authGuard.verifyAndRedirect(currentPath);
      }
    }
  </script>

  <!-- このコンポーネントは見た目を持たない -->