
export class Template {
  constructor() {
    this.element = document.createElement('tpl');
    this.element.tpl = this;
    this.timeout = null;
    this.renderMethod = 'render';
    this.set();
  }
  set(key, value) {
    if(key) {
      // Non-op
      if(this[key] === value) return this;

      this[key] = value;
    }
    if(this.timeout === null) {
      // Only re-render once if setting multiple times in same loop
      this.timeout = setTimeout(() => {
        this.timeout = null;
        const tpl = this[this.renderMethod]();
        this._render(tpl);
      }, 0);
    }
    return this;
  }
  _render(tpl) {
    this.element.innerHTML = tpl.result;
    for(let id of Object.keys(tpl.els)) {
      const container = this.element.querySelector(`[id="${id}"]`);
      container.appendChild(tpl.els[id].element);
    }
  }
  render() {
    return '';
  }
  get link() {
    return LINK_HANDLER;
  }
  route(element) {
    const newPath = element.attributes.href.value;
    if(newPath.startsWith('http')) {
      window.open(newPath, '_blank', 'noopener');
    } else {
      app.router.goto(newPath);
    }
    return false;
  }
}

export class AsyncTemplate extends Template {
  constructor() {
    super();
    this.set('loading', true);
    this.renderMethod = 'superRender';
    setTimeout(() => this.superInit(), 0);
  }
  async superInit() {
    this.set('loading', true);
    try {
      await this.init();
    } catch(error) {
      console.error(error);
      this.set('error', true);
    }
    this.set('loading', false);
  }
  superRender() {
    const errorMessage = html`${app.router.error}`;
    if(this.loading) {
      return html`${app.router.loader}`;
    } else if(this.error) {
      return errorMessage;
    }
    this.render().then(result => {
      this._render(result);
    }).catch(error => {
      console.error(error);
      this._render(errorMessage);
    });
    return html`${app.router.loader}`;
  }
}

export function html(literalSections, ...substs) {
  let raw = literalSections.raw;
  let result = '';
  const els = {};

  substs.forEach((substs, i) => {
    let lit = raw[i];
    if(!Array.isArray(substs)) {
      substs = [substs];
    }
    let escapeHtml = true;
    if(lit.endsWith('$')) {
      // Do not htmlEscape if using double dollar signs e.g. html`$${myval}`
      lit = lit.slice(0, -1);
      escapeHtml = false;
    }
    result += lit;
    for(let subst of substs) {
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
      } else if(subst instanceof HTMLTemplate) {
        Object.assign(els, subst.els);
        subst = subst.result;
      } else if(escapeHtml) {
        // Escape any passed values, by default
        if(subst === 0) subst = '0';
        subst = htmlEscape(subst || '');
      }
      result += subst;
    }
  });
  result += raw[raw.length-1];
  return new HTMLTemplate({ result, els });
}

class HTMLTemplate {
  constructor(options) {
    Object.assign(this, options);
  }
}

function htmlEscape(str) {
  return String(str).replace(/&/g, '&amp;') // first!
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
}

// Helper for event handlers
const LINK_HANDLER = 'onclick="return tpl(this).route(this)"';
window.tpl = function(el) {
  return el.closest('tpl').tpl;
}

export function userInput(text) {
  const parts = text.split('https://');
  parts[0] = nl2br(parts[0]);
  for(let i = 1; i< parts.length; i+=2) {
    const firstSpace = parts[i].indexOf(' ');
    const url = parts[i].slice(0, firstSpace !== -1 ? firstSpace : parts[i].length);
    const text = parts[i].slice(url.length);
    parts[i] = html`<a $${LINK_HANDLER} href="https://${url}">https://${url}</a>${nl2br(text)}`;
  }
  return parts;
}

export function nl2br(text) {
  const parts = text.split('\n');
  const literals = [];
  const subst = [];
  for(let i = 0; i<parts.length; i++) {
    literals.push(parts[i]);
    if(i+1 < parts.length) subst.push(html`<br />`);
  }
  return html({raw: literals}, ...subst);

}
