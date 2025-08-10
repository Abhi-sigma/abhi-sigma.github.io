export function setupMobileMode() {
  // 1. Prevent pinch zoom, scroll, and double-tap zoom
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
  );

  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('gestureend', e => e.preventDefault());
  document.body.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  // 2. Lock orientation to landscape
  async function lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('landscape');
        console.log('✅ Orientation locked');
      } catch (err) {
        console.warn('🔒 Orientation lock failed:', err);
      }
    }
  }

  // 3. Fullscreen on user interaction
  async function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) await elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
  }

  // 4. Show warning if not in landscape
  function checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const warning = document.getElementById('rotate-warning');
    if (warning) {
      warning.style.display = isLandscape ? 'none' : 'flex';
    }
  }

  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();

  // 5. Public initializer
  async function activateMobileMode() {
    await enterFullscreen();
    await lockOrientation();
    checkOrientation();
  }

  return { activateMobileMode };
}
