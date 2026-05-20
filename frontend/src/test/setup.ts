import "@testing-library/jest-dom";

// JSDOM does not implement scrollIntoView — stub it so tests that render
// components calling scrollIntoView don't throw.
window.HTMLElement.prototype.scrollIntoView = function () {};
