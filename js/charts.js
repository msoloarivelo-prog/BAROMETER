/*
 * Dependency-free SVG/HTML charts (the tool must work offline).
 * Reproduces the Excel dashboard charts (one donut per pillar, bars per
 * aspect) and adds a Gantt timeline for the workplan.
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

  function lang() {
    return root.BarometerI18n ? root.BarometerI18n.getLang() : 'fr';
  }

  function fmt(value, digits) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    var s = value.toFixed(digits === undefined ? 1 : digits);
    return lang() === 'fr' ? s.replace('.', ',') : s;
  }

  /** Donut: score / max with the value in the centre. */
  function donut(score, max, options) {
    options = options || {};
    var size = options.size || 150;
    var stroke = options.stroke || 16;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var ratio = score === null ? 0 : Math.max(0, Math.min(1, score / max));
    var cx = size / 2;

    var svg = el('svg', {
      viewBox: '0 0 ' + size + ' ' + size,
      width: size,
      height: size,
      class: 'chart-donut',
      role: 'img',
      'aria-label': (options.label || '') + ' ' + fmt(score) + ' / ' + max
    });
    svg.appendChild(el('circle', { cx: cx, cy: cx, r: r, fill: 'none', class: 'donut-track', 'stroke-width': stroke }));
    svg.appendChild(el('circle', {
      cx: cx, cy: cx, r: r, fill: 'none',
      stroke: options.color || 'currentColor',
      'stroke-width': stroke,
      'stroke-dasharray': (c * ratio) + ' ' + c,
      'stroke-linecap': ratio > 0 && ratio < 1 ? 'round' : 'butt',
      transform: 'rotate(-90 ' + cx + ' ' + cx + ')'
    }));
    svg.appendChild(el('text', { x: cx, y: cx + 4, 'text-anchor': 'middle', class: 'donut-value', style: 'font-size:' + Math.round(size / 5) + 'px' }, fmt(score)));
    svg.appendChild(el('text', { x: cx, y: cx + size / 7 + 6, 'text-anchor': 'middle', class: 'donut-caption' }, '/ ' + max));
    return svg;
  }

  /**
   * Horizontal bars.
   * @param {Array<{label:string, value:number|null, delta?:number|null, color?:string}>} rows
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
      fill.style.width = row.value === null || row.value === undefined ? '0' : (row.value / max) * 100 + '%';
      var color = row.color || options.color;
      if (color) fill.style.background = color;
      track.appendChild(fill);

      var value = document.createElement('div');
      value.className = 'bar-value';
      value.textContent = options.format ? options.format(row.value) : fmt(row.value);
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

  /**
   * Gantt timeline (HTML string).
   * rows: [{ label, sub, start, end, category, status }];
   * header: { groups: [{label, span}], labels: [string per month] }.
   */
  function gantt(rows, header, esc) {
    var n = header.labels.length;
    var html = '<div class="gantt-chart" style="--months:' + n + '">' +
      '<div class="gantt-head gantt-years"><div class="gantt-name"></div>' +
      header.groups.map(function (g) { return '<div class="gantt-year" style="grid-column:span ' + g.span + '">' + esc(g.label) + '</div>'; }).join('') + '</div>' +
      '<div class="gantt-head"><div class="gantt-name"></div>' +
      header.labels.map(function (m) { return '<div class="gantt-month">' + esc(m) + '</div>'; }).join('') + '</div>';
    rows.forEach(function (r) {
      html += '<div class="gantt-line cat-' + r.category + ' status-' + r.status + '">' +
        '<div class="gantt-name"><span class="gantt-title">' + esc(r.label) + '</span>' +
        (r.sub ? '<span class="gantt-sub">' + esc(r.sub) + '</span>' : '') + '</div>' +
        '<div class="gantt-track">' +
          '<div class="gantt-bar" style="grid-column:' + r.start + ' / ' + (r.end + 1) + '"></div>' +
        '</div></div>';
    });
    return html + '</div>';
  }

  root.BarometerCharts = { donut: donut, bars: bars, gantt: gantt, fmt: fmt };
})(this);
