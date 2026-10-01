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

  /**
   * Line chart over periods (SVG).
   * series: [{ label, color, values: [number|null], width?, dashed? }]; xLabels: [string]; max: y maximum.
   */
  function lines(series, xLabels, max, options) {
    options = options || {};
    var W = options.width || 720;
    var H = options.height || 260;
    var padL = 34, padR = 16, padT = 14, padB = 40;
    var n = xLabels.length;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    function x(i) { return padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW); }
    function y(v) { return padT + plotH - (v / max) * plotH; }

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-lines', role: 'img', 'aria-label': options.label || '' });
    for (var g = 0; g <= max; g++) {
      svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: y(g), y2: y(g), class: 'grid' }));
      svg.appendChild(el('text', { x: padL - 8, y: y(g) + 4, 'text-anchor': 'end', class: 'axis' }, String(g)));
    }
    xLabels.forEach(function (lab, i) {
      svg.appendChild(el('text', { x: x(i), y: H - padB + 18, 'text-anchor': 'middle', class: 'axis' }, lab));
    });
    series.forEach(function (s) {
      var pts = [];
      s.values.forEach(function (v, i) { if (v !== null && v !== undefined) pts.push([x(i), y(v), v]); });
      if (pts.length > 1) {
        svg.appendChild(el('polyline', {
          points: pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '),
          fill: 'none', stroke: s.color, 'stroke-width': s.width || 2.5,
          'stroke-dasharray': s.dashed ? '6 4' : 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
        }));
      }
      pts.forEach(function (p) {
        svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: s.width ? s.width + 1.5 : 4, fill: s.color }));
        if (s.showValues) {
          svg.appendChild(el('text', { x: p[0], y: p[1] - 10, 'text-anchor': 'middle', class: 'point-value', fill: s.color }, fmt(p[2], 2)));
        }
      });
    });
    var wrap = document.createElement('div');
    wrap.className = 'lines-wrap';
    wrap.appendChild(svg);
    var legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML = series.map(function (s) {
      return '<span><i style="background:' + s.color + (s.dashed ? ';opacity:.6' : '') + '"></i>' + String(s.label).replace(/</g, '&lt;') + '</span>';
    }).join('');
    wrap.appendChild(legend);
    return wrap;
  }

  /**
   * Gantt as an HTML table (for printed reports): the year and month header
   * rows repeat at the top of every printed page.
   */
  function ganttTable(rows, header, esc) {
    var n = header.labels.length;
    var html = '<table class="gantt-table"><colgroup><col class="gt-name">';
    for (var c = 0; c < n; c++) html += '<col>';
    html += '</colgroup><thead><tr class="gt-years"><th></th>' +
      header.groups.map(function (g) { return '<th colspan="' + g.span + '">' + esc(g.label) + '</th>'; }).join('') + '</tr>' +
      '<tr class="gt-months"><th></th>' + header.labels.map(function (m) { return '<th>' + esc(m) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr class="cat-' + r.category + ' status-' + r.status + '"><td class="gt-label"><span class="gantt-title">' + esc(r.label) + '</span>' +
        (r.sub ? '<span class="gantt-sub">' + esc(r.sub) + '</span>' : '') + '</td>';
      for (var m = 1; m < r.start; m++) html += '<td></td>';
      html += '<td colspan="' + (r.end - r.start + 1) + '" class="gt-span"><div class="gantt-bar"></div></td>';
      for (var k = r.end + 1; k <= n; k++) html += '<td></td>';
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  root.BarometerCharts = { donut: donut, bars: bars, gantt: gantt, ganttTable: ganttTable, lines: lines, fmt: fmt };
})(this);
