import { useEffect, useRef } from 'react';

/**
 * Watches browser-level signals commonly used for lightweight exam proctoring
 * and reports each one through onViolation(type, meta).
 */
export function useViolationMonitor(active, onViolation) {
  const cbRef = useRef(onViolation);
  cbRef.current = onViolation;

  useEffect(() => {
    if (!active) return undefined;

    const report = (type, meta) => cbRef.current && cbRef.current(type, meta);

    const onVisibilityChange = () => {
      if (document.hidden) report('tab_switch', { hiddenAt: new Date().toISOString() });
    };
    const onBlur = () => report('window_blur');
    const onCopy = (e) => { report('copy'); };
    const onPaste = (e) => { report('paste'); };
    const onContextMenu = (e) => { e.preventDefault(); report('right_click'); };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) report('fullscreen_exit');
    };
    const onKeyDown = (e) => {
      const blockedCombos =
        (e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 'x'].includes(e.key.toLowerCase());
      const devTools = e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));
      if (devTools) {
        report('dev_tools_shortcut');
      }
      if (blockedCombos && e.target.tagName !== 'TEXTAREA') {
        // allow copy/paste inside the code editor itself, block elsewhere
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);
}

export function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}
