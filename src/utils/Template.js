
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
      this[key] = value;
    }
    if(this.timeout === null) {
      // Only re-render once if setting multiple times in same loop
      this.timeout = setTimeout(() => {
        this.timeout = null;
        const tpl = this[this.renderMethod]();
        this.element.innerHTML = tpl.result;
        for(let id of Object.keys(tpl.els)) {
          const container = this.element.querySelector(`[id="${id}"]`);
          container.appendChild(tpl.els[id].element);
        }
      }, 0);
    }
  }
  render() {
    return '';
  }
  get link() {
    return 'onclick="return tpl(this).route(this)"';
  }
  route(element) {
    const newPath = element.attributes.href.value;
    if(newPath.startsWith('http')) {
      window.open(newPath);
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
    if(this.loading) {
      return html`${app.router.loader}`;
    } else if(this.error) {
      return html`
        <p>Error!</p>
      `;
    }
    return this.render();
  }
}

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
    } else if(subst instanceof HTMLTemplate) {
      Object.assign(els, subst.els);
      subst = subst.result;
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
window.tpl = function(el) {
  return el.closest('tpl').tpl;
}
