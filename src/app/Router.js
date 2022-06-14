export default class Router {
  constructor(options) {
    Object.assign(this, {
      element: null,
      loader: null, // Template instance
      routes: [],
    }, options);
    window.addEventListener('popstate', this.popstate.bind(this));
    this.popstate();
  }
  popstate() {
    this.goto(window.location.pathname);
  }
  async goto(path, skipPush) {
    if(!skipPush) {
      window.history.pushState({}, '', path);
    }
    this.path = path;
    for(let route of this.routes) {
      const match = path.match(route.regex);
      if(match) {
        window.scrollTo(0, 0);
        if(this.loader) {
          this.element.innerHTML = '';
          this.element.appendChild(this.loader.element);
        }
        const klass = await import(route.template);
        const args = 'constructor' in route ? route.constructor(match) : [];
        const base = new klass.default(...args);
        this.element.innerHTML = '';
        this.element.appendChild(base.element);
        return;
      }
    }
  }
}
