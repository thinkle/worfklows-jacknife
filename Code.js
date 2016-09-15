/*function doGet() {
  var html = HtmlService.createTemplateFromFile('dataInterface');
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}*/

function onOpen (e) {
  SpreadsheetApp.getUi().createAddonMenu()  
  .addItem('Open Workflows','showSidebar')
  .addToUi();
}

function showSidebar () {
  var ui = HtmlService.createHtmlOutputFromFile('Sidebar')
  .setTitle('Jacknife');
  SpreadsheetApp.getUi().showSidebar(ui);
}


function onInstall (e) {
  onOpen(e)
}

function include(filename) { 
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function createApprovalFormFromId (formId) {
  Logger.log('createApprovalForm(%s)',formId);
  firstForm = FormApp.openById(formId);
  createApprovalForm (firstForm);
}
