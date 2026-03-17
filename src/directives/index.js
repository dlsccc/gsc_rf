const focusDirective = {
  mounted(el) {
    if (el && el.hasAttribute('data-auto-focus')) {
      el.focus();
    }
  }
};

const directive = {
  install(app) {
    app.directive('focus', focusDirective);
  }
};

export { focusDirective, directive };
export default directive;
