import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function loadComponent(path, extra = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^import[\s\S]*?from [^;]+;\r?\n/gm, '');
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, React, ...extra });
  return exports.default;
}

test('math input cannot introduce HTML, including inside generated formatting', () => {
  const MathText = loadComponent('../src/components/quiz/MathText.jsx');
  for (const payload of ['<img src=x onerror=alert(1)>', '\\text{<svg onload=alert(1)>}', 'x^{<img src=x onerror=alert(1)>}', '&lt;script&gt;']) {
    const html = renderToStaticMarkup(React.createElement(MathText, { text: '$' + payload + '$' }));
    assert.doesNotMatch(html, /<(img|svg|script)\b/i);
    assert.match(html, /&(?:lt|amp);/);
  }
  const html = renderToStaticMarkup(React.createElement(MathText, { text: '$x^{2} + H_2$' }));
  assert.match(html, /<sup>2<\/sup>/);
  assert.match(html, /<sub>2<\/sub>/);
});

test('HTML resources are contained in a sandbox without script or same-origin privileges', () => {
  const passthrough = ({ children }) => React.createElement('div', null, children);
  const Viewer = loadComponent('../src/components/resources/ResourceViewer.jsx', {
    useEffect() {}, useState: () => [null, () => {}],
    Dialog: passthrough, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough
  });
  const html = renderToStaticMarkup(React.createElement(Viewer, { open: true, resource: { type: 'html', title: 'test', content: '<script>alert(1)</script>' } }));
  assert.match(html, /sandbox=""/);
  assert.match(html, /srcDoc="&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
