
export function html(literalSections, ...substs) {
  let raw = literalSections.raw;
  let result = '';
  const els = {};

  substs.forEach((subst, i) => {
    let lit = raw[i];
    if(subst instanceof Template) {
      // Allow nested Template instances to render independently
      const rando = new Uint8Array(10);
      crypto.getRandomValues(rando);
      let id = 'x';
      for(let char of rando) {
        id += char.toString(16);
      }
      els[id] = subst;
      subst = `<div id="${id}"></div>`;
    } else if(lit.endsWith('$')) {
      // Do not htmlEscape if using double dollar signs e.g. html`$${myval}`
      lit = lit.slice(0, -1);
    } else {
      // Escape any passed values, by default
      subst = htmlEscape(subst);
    }
    result += lit;
    result += subst;
  });
  result += raw[raw.length-1];
  return { result, els };
}

export class Template {
  constructor() {
    this.element = document.createElement('tpl');
    this.element.tpl = this;
    this.timeout = null;
  }
  set(key, value) {
    this[key] = value;
    if(this.timeout === null) {
      // Only re-render once if setting multiple times in same loop
      this.timeout = setTimeout(() => {
        this.timeout = null;
        const tpl = this.render();
        this.element.innerHTML = tpl.result;
        for(let id of Object.keys(tpl.els)) {
          this.element.querySelector(`[id="${id}"]`)
            .appendChild(tpl.els[id].element);
        }
      }, 0);
    }
  }
  render() {
    return '';
  }
}

function htmlEscape(str) {
  if(typeof str === 'number') return '' + str;
  return str.replace(/&/g, '&amp;') // first!
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
}

// Helper for event handlers
window.tpl = function(el) {
  return el.closest('tpl').tpl;
}
