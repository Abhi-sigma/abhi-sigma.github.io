

export function initGamepadControls(pressedKeys) {
// 3. Add event listeners for touch/
  document.querySelectorAll('.arrow-button').forEach(button => {
    const key = button.dataset.key;

    button.addEventListener('touchstart', e => {
      e.preventDefault();
      pressedKeys[key] = true;
      dispatchKey(key, true);
    });
    button.addEventListener('touchend', e => {
      e.preventDefault();
      pressedKeys[key] = false;
      dispatchKey(key, false);
    });

    button.addEventListener('mousedown', () => {
      pressedKeys[key] = true;
      dispatchKey(key, true);
    });
    button.addEventListener('mouseup', () => {
      pressedKeys[key] = false;
      dispatchKey(key, false);
    });
    button.addEventListener('mouseleave', () => {
      pressedKeys[key] = false;
      dispatchKey(key, false);
    });
  });

  function dispatchKey(key, down) {
    const event = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  // 4. Optionally hide on non-touch devices
  if (!('ontouchstart' in window)) {
    gamepad.style.display = 'none';
  }
}
