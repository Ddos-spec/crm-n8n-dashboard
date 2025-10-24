import { parseNumeric } from '../../../shared/utils/index.js';

function readCanvasHeight(canvas) {
  if (!canvas) return null;

  const clientHeight = parseNumeric(canvas.clientHeight);
  if (clientHeight) return clientHeight;

  const inlineHeight = parseNumeric(canvas.style?.height);
  if (inlineHeight) return inlineHeight;

  const attrHeight = parseNumeric(canvas.getAttribute?.('height'));
  if (attrHeight) return attrHeight;

  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const computedHeight = parseNumeric(window.getComputedStyle(canvas)?.height);
    if (computedHeight) return computedHeight;
  }

  return null;
}

function readInnerHeight(element) {
  if (!element) return null;

  let height = parseNumeric(element.clientHeight);
  if (height && typeof window !== 'undefined' && window.getComputedStyle) {
    const styles = window.getComputedStyle(element);
    const paddingTop = parseNumeric(styles?.paddingTop) || 0;
    const paddingBottom = parseNumeric(styles?.paddingBottom) || 0;
    height -= paddingTop + paddingBottom;
  }

  if (height && height > 0) {
    return height;
  }

  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const styles = window.getComputedStyle(element);
    const computedHeight = parseNumeric(styles?.height);
    if (computedHeight) {
      const paddingTop = parseNumeric(styles?.paddingTop) || 0;
      const paddingBottom = parseNumeric(styles?.paddingBottom) || 0;
      const innerHeight = computedHeight - paddingTop - paddingBottom;
      return innerHeight > 0 ? innerHeight : null;
    }
  }

  return null;
}

function ensureChartWrapper(canvas) {
  if (!canvas) return null;

  const currentParent = canvas.parentElement;
  if (!currentParent) return null;

  if (currentParent.dataset?.chartWrapper === 'true') {
    return currentParent;
  }

  const wrapper = document.createElement('div');
  wrapper.dataset.chartWrapper = 'true';
  wrapper.style.display = 'block';
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';

  currentParent.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  return wrapper;
}

export function lockChartArea(canvas, fallbackHeight) {
  if (!canvas) {
    return { container: null, height: fallbackHeight };
  }

  const wrapper = ensureChartWrapper(canvas);
  const container = wrapper || canvas.parentElement || null;

  const baseFallback = fallbackHeight || 0;
  let height =
    parseNumeric(canvas.dataset?.fixedHeight) ??
    readCanvasHeight(canvas) ??
    readInnerHeight(container) ??
    baseFallback;

  if (!height || height <= 0) {
    height = baseFallback || 256;
  }

  canvas.dataset.fixedHeight = `${height}px`;

  if (container) {
    if (!container.dataset.fixedHeight) {
      let containerHeight = readInnerHeight(container);
      if (!containerHeight || containerHeight <= 0) {
        containerHeight = height;
      }
      container.dataset.fixedHeight = `${containerHeight}px`;
    }

    const lockedContainerHeight = parseNumeric(container.dataset.fixedHeight) || height;
    const containerHeightPx = `${lockedContainerHeight}px`;
    container.style.height = containerHeightPx;
    container.style.maxHeight = containerHeightPx;
  }

  const heightPx = `${height}px`;
  canvas.style.height = heightPx;
  canvas.style.maxHeight = heightPx;
  canvas.style.width = '100%';

  const numericHeight = parseNumeric(height);
  if (numericHeight && numericHeight > 0) {
    canvas.setAttribute('height', Math.max(Math.round(numericHeight), 1));
  }

  return { container, height };
}
