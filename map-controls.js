// SVG is enough for this small map. Keep panning and zooming here so the
// routing code doesn't need to know anything about pointer events.
export function setupMapControls(map, fitRoute) {
  const box = () => {
    const { x, y, width, height } = map.viewBox.baseVal;
    return { x, y, width, height };
  };
  const move = (view) =>
    map.setAttribute(
      'viewBox',
      `${view.x} ${view.y} ${view.width} ${view.height}`
    );

  function zoom(factor) {
    const view = box();
    const width = Math.min(2200, Math.max(100, view.width * factor));
    const height = (view.height * width) / view.width;
    move({
      x: view.x + (view.width - width) / 2,
      y: view.y + (view.height - height) / 2,
      width,
      height,
    });
  }

  document
    .getElementById('zoom-in')
    .addEventListener('click', () => zoom(0.75));
  document
    .getElementById('zoom-out')
    .addEventListener('click', () => zoom(1 / 0.75));
  map.addEventListener('keydown', (event) => {
    const view = box();
    const arrows = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (arrows[event.key]) {
      event.preventDefault();
      const [dx, dy] = arrows[event.key];
      move({
        ...view,
        x: view.x + (dx * view.width) / 8,
        y: view.y + (dy * view.height) / 8,
      });
    } else if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0') fitRoute();
      else zoom(event.key === '-' ? 1 / 0.75 : 0.75);
    }
  });

  let drag = null;
  map.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const matrix = map.getScreenCTM()?.inverse();
    if (!matrix) return;
    drag = {
      view: box(),
      matrix,
      origin: new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix
      ),
      id: event.pointerId,
    };
    map.setPointerCapture(event.pointerId);
    map.classList.add('dragging');
  });
  map.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      drag.matrix
    );
    move({
      ...drag.view,
      x: drag.view.x - (point.x - drag.origin.x),
      y: drag.view.y - (point.y - drag.origin.y),
    });
  });
  const stopDragging = () => {
    drag = null;
    map.classList.remove('dragging');
  };
  map.addEventListener('pointerup', stopDragging);
  map.addEventListener('pointercancel', stopDragging);
  map.addEventListener('lostpointercapture', stopDragging);
}
