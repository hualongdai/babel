class Scope {
  constructor(parentScope) {
    this.parent = parentScope;
    // 存放了在本作用于下 所有声明的变量
    this.declarations = [];
  }

  set(name, value) {
    this.declarations[name] = value;
  }

  getLocal(name) {
    return this.declarations[name];
  }

  get(name) {
    let result = this.getLocal(name);
    if (result === undefined && this.parent) {
      result = this.parent.get(name);
    }
    return result;
  }

  has(name) {
    return !!this.getLocal(name);
  }
}

module.exports = Scope;