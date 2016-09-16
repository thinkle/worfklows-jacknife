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

function getCurrentMasterConfig () {
	conf = getMasterConfig(SpreadsheetApp.getActiveSpreadsheet());
	for (var i=1; i<conf.length; i++) {
		table = conf[i];
		for (var n=1; n<=3; n++) {
			if (table['Config '+n+' Link'] && (table['Config '+n+' Link'] != 'NOT_FOUND')) {
				table['ConfigLink'+n]=table['Config '+n+' Link']
				table['ConfigId'+n]=table['Config '+n+' ID']
			}
		}
	}
	return conf
}

function gotoSheet (id) {
	Logger.log('gotoSheet(%s)',id);
	var ss = SpreadsheetApp.getActiveSpreadsheet()
	var sheet = getSheetById(ss,id);
	ss.setActiveSheet(sheet);
}

