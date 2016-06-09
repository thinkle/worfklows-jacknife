function doGet() {
  var html = HtmlService.createTemplateFromFile('dataInterface');
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function include(filename) { 
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}
