const paletteKeys = ['background', 'surface', 'foreground', 'accent', 'glow'] as const;

type PaletteKey = (typeof paletteKeys)[number];

const parseHex = (value: string) => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  return match ? match.slice(1).map((channel) => Number.parseInt(channel, 16)) : [0, 0, 0];
};

const blendHex = (from: string, to: string, amount: number) => {
  const first = parseHex(from);
  const second = parseHex(to);
  const channels = first.map((channel, index) =>
    Math.round(channel + ((second[index] ?? channel) - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

export function setupSnapGallery(root: HTMLElement) {
  const viewport = root.querySelector<HTMLElement>('[data-gallery-viewport]');
  const slides = [...root.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
  const markers = [...root.querySelectorAll<HTMLButtonElement>('[data-gallery-marker]')];
  const position = root.querySelector<HTMLOutputElement>('[data-gallery-position]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px)');
  if (!viewport || slides.length === 0) return;

  let active = 0;
  let animationFrame = 0;

  const slidePalette = (slide: HTMLElement, key: PaletteKey) =>
    slide.dataset[`gallery${key[0]?.toUpperCase()}${key.slice(1)}` as keyof DOMStringMap] ??
    '#000000';

  const setPosition = (index: number, updateHash = true) => {
    active = Math.max(0, Math.min(slides.length - 1, index));
    root.dataset.galleryActive = String(active);
    markers.forEach((marker, markerIndex) => {
      marker.toggleAttribute('aria-current', markerIndex === active);
      marker.tabIndex = markerIndex === active ? 0 : -1;
    });
    if (position) {
      position.value = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    }
    const id = slides[active]?.dataset.galleryId;
    if (updateHash && id && window.location.hash !== `#${id}`) {
      history.replaceState(null, '', `#${id}`);
    }
  };

  const updateFromScroll = () => {
    animationFrame = 0;
    const width = viewport.clientWidth || 1;
    const progress = Math.max(0, Math.min(slides.length - 1, viewport.scrollLeft / width));
    const fromIndex = Math.floor(progress);
    const toIndex = Math.min(slides.length - 1, Math.ceil(progress));
    const amount = progress - fromIndex;
    const from = slides[fromIndex];
    const to = slides[toIndex];
    if (from && to) {
      paletteKeys.forEach((key) => {
        root.style.setProperty(
          `--gallery-${key}`,
          blendHex(slidePalette(from, key), slidePalette(to, key), amount),
        );
      });
    }
    setPosition(Math.round(progress));
  };

  const queueUpdate = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(updateFromScroll);
  };

  const goTo = (index: number, updateHash = true) => {
    const normalized = Math.max(0, Math.min(slides.length - 1, index));
    viewport.scrollTo({
      left: normalized * viewport.clientWidth,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
    setPosition(normalized, updateHash);
  };

  markers.forEach((marker, index) => marker.addEventListener('click', () => goTo(index)));
  viewport.addEventListener('scroll', queueUpdate, { passive: true });
  viewport.addEventListener(
    'wheel',
    (event) => {
      if (!desktop.matches || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      viewport.scrollBy({ left: event.deltaY * 1.2, behavior: 'auto' });
    },
    { passive: false },
  );
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(active - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(active + 1);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  });

  const requested = slides.findIndex(
    (slide) => slide.dataset.galleryId === window.location.hash.slice(1),
  );
  const initial = requested >= 0 ? requested : 0;
  setPosition(initial, false);
  requestAnimationFrame(() => {
    viewport.scrollLeft = initial * viewport.clientWidth;
    updateFromScroll();
  });
  const resizeObserver = new ResizeObserver(() => {
    viewport.scrollLeft = active * viewport.clientWidth;
    queueUpdate();
  });
  resizeObserver.observe(viewport);
  document.addEventListener(
    'astro:before-swap',
    () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    },
    { once: true },
  );
}
