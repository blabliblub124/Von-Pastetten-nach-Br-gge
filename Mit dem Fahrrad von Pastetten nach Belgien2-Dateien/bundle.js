const WIDGET_SRC_URL =
  "https://uiwiwidget.production.ippen.space/commonjs/uiwiwidget.umd.cjs";
(function () {
  const script = document.createElement("script");
  script.src = WIDGET_SRC_URL;
  script.type = "text/javascript";
  document.body.appendChild(script);
})();
