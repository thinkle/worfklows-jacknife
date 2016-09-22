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

function createApprovalFormFromUrl (formId) {
  Logger.log('createApprovalForm(%s)',formId);
  firstForm = FormApp.openByUrl(formId);
  createApprovalForm (firstForm);
}

function sidebarDoAction(action, form) {
  Logger.log('Do Action %s to form %s',action,form);
  Logger.log('Action = %s',sidebarActions[action])
  Logger.log('Calling!');
  return sidebarActions[action].callback(form)
}

function testGetGasData () {
	return ['happy','go','lucky'];
}

function testGasCalForm () {
  testCreateCalEventSettings();
}
// SIDEBAR CALLBACKS/ETC

sidebarActions = {
  // Organize information for sidebar UI
  email : {
    name : "Launch Email",
    callback : function (formId) {
    },
  }, // end email
  approval : {
    name : "Create Approval Form",
    callback : createApprovalFormFromUrl,
  }, // end approval
  calEvent : {
    name : "Create Calendar Event",
    callback: function (formId) {
      Logger.log('Cal Event Callback!');
      var calConfig = createCalEventConfig();       
      var params = {};
      createCalendarEventSettings(FormApp.openByUrl(formId), calConfig, params);
    } // end calEvent callback
  } // end calEvent
} // end sidebarActions

function getSidebarActions () {
  actions = []
  for (var sa in sidebarActions) {
    actions.push({'action':sa, 'name':sidebarActions[sa]['name']})
  }
  return actions
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
  var sbActions = getSidebarActions()
  return {config: conf, actions: sbActions}
}

function gotoSheet (id) {
	Logger.log('gotoSheet(%s)',id);
	var ss = SpreadsheetApp.getActiveSpreadsheet()
	var sheet = getSheetById(ss,id);
	ss.setActiveSheet(sheet);
}

function testGasCall () {
	Logger.log('Got Gas Call');
}
