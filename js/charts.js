/*
 * Graphiques SVG sans dépendance externe (l'outil doit fonctionner hors ligne).
 * Reprend les graphiques du tableau de bord Excel : un anneau par pilier
 * (score / score maximum) et des barres par aspect.
 */
(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, text) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmt(value, digits) {
    if (value === null || value === undefined) return '—';
    return value.toFixed(digits === undefined ? 1 : digits).replace('.', ',');
  }

  /** Anneau : score / max, valeur au centre. */
  function donut(score, max, options) {
    options = options || {};
    var size = options.size || 160;
    var stroke = options.stroke || 18;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var ratio = score === null ? 0 : Math.max(0, Math.min(1, score / max));

    var svg = el('svg', {
      viewBox: '0 0 ' + size + ' ' + size,
      width: size,
      height: size,
      class: 'chart-donut',
      role: 'img',
      'aria-label': (options.label || 'Score') + ' : ' + fmt(score) + ' sur ' + max
    });
    var cx = size / 2;
    svg.appendChild(el('circle', { cx: cx, cy: cx, r: r, fill: 'none', class: 'donut-track', 'stroke-width': stroke }));
    svg.appendChild(el('circle', {
      cx: cx, cy: cx, r: r, fill: 'none',
      stroke: options.color || 'currentColor',
      'stroke-width': stroke,
      'stroke-dasharray': (c * ratio) + ' ' + c,
      'stroke-linecap': ratio > 0 && ratio < 1 ? 'round' : 'butt',
      transform: 'rotate(-90 ' + cx + ' ' + cx + ')'
    }));
    svg.appendChild(el('text', { x: cx, y: cx - 2, 'text-anchor': 'middle', class: 'donut-value' }, fmt(score)));
    svg.appendChild(el('text', { x: cx, y: cx + 20, 'text-anchor': 'middle', class: 'donut-caption' }, 'sur ' + max));
    return svg;
  }

  /**
   * Barres horizontales.
   * @param {Array<{label:string, value:number|null, delta?:number|null}>} rows
   */
  function bars(rows, max, options) {
    options = options || {};
    var wrap = document.createElement('div');
    wrap.className = 'chart-bars';
    rows.forEach(function (row) {
      var line = document.createElement('div');
      line.className = 'bar-row';

      var label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = row.label;

      var track = document.createElement('div');
      track.className = 'bar-track';
      for (var i = 1; i < max; i++) {
        var tick = document.createElement('span');
        tick.className = 'bar-tick';
        tick.style.left = (i / max) * 100 + '%';
        track.appendChild(tick);
      }
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = row.value === null ? '0' : (row.value / max) * 100 + '%';
      if (options.color) fill.style.background = options.color;
      track.appendChild(fill);

      var value = document.createElement('div');
      value.className = 'bar-value';
      value.textContent = fmt(row.value);
      if (row.delta !== undefined && row.delta !== null) {
        var d = document.createElement('span');
        d.className = 'delta ' + (row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'flat');
        d.textContent = (row.delta > 0 ? '+' : '') + fmt(row.delta);
        value.appendChild(d);
      }

      line.appendChild(label);
      line.appendChild(track);
      line.appendChild(value);
      wrap.appendChild(line);
    });
    return wrap;
  }

  root.BarometerCharts = { donut: donut, bars: bars, fmt: fmt };
})(this);
