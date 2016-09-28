/*function doGet() {
  var html = HtmlService.createTemplateFromFile('dataInterface');
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}*/

TEXT = 1
FOLDER = 2
FIELDCONVERSION = 3
FIELDLIST = 4
PARA = 5
FIELD = 6

function onOpen (e) {
  SpreadsheetApp.getUi().createAddonMenu()  
  .addItem('Open Workflows','showSidebar')
  .addItem('Test Config','testConf')
  .addToUi();
}

function showSidebar () {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle('Jacknife');
  SpreadsheetApp.getUi().showSidebar(ui);
}

function showPicker () {
  var dialogId = Utilities.base64Encode(Math.random());
	var template = HtmlService.createTemplateFromFile('Picker')
  template.dialogId = dialogId;
  ui = template.evaluate();
	ui.setWidth(800);
	ui.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(ui,"Choose Form");
  //SpreadsheetApp.getUi().showSidebar(template);
  return dialogId;
}

function onInstall (e) {
  onOpen(e)
}

function include(filename) { 
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function createApprovalFormFromUrl (formId, params) {
  Logger.log('createApprovalForm(%s)',formId);
  firstForm = FormApp.openByUrl(formId);
  createApprovalForm (firstForm, params);
}

function sidebarDoAction (action, form, params) {
  Logger.log('Do Action %s to form %s params %s',action,form,params);
  Logger.log('Action = %s',sidebarActions[action])
  Logger.log('Calling! with params needed %s',sidebarActions[action].params);
  if (sidebarActions[action].params && (! params)) {
    Logger.log('do Modal');
    sidebarDoModal(action, form);
    return 'getParams'
  }
  else {
    Logger.log('do action');
    return sidebarActions[action].callback(form, params)
  }
}

function sidebarDoModal (action, form) {  
  var template = HtmlService.createTemplateFromFile('ConfigurationDialog')
  template.action = action;
  template.form = form;
  ui = template.evaluate();
  ui.setWidth(800);
  ui.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(ui,"Configure "+template.action);
  //SpreadsheetApp.getUi().showSidebar(template);
  //return dialogId;
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
    callback : function (formUrl, params) {
			form = FormApp.openByUrl(formUrl);
			createEmailTrigger(form, params);
    }, // end email callback
		params : {
			'EmailTitle':{val:'Form Received','type':TEXT,'label':'Title'},
			'Body':{val:'Email body? Use fields like this: <<Field Title>>.','type':PARA,'label':'Body'},
		},
	}, // end email
  approval : {
    name : "Create Approval Form",
    callback : createApprovalFormFromUrl,
		params : {
			titleSuffix : {'label':'Approval Form Title Suffix',
										 'type':TEXT,
										 'val':' Approval'},
			destinationFolder : {'label':'Folder',
													 'type':FOLDER,
													 'val':undefined,},
			convertFields : {'label':'Fields to Convert',
											 type:FIELDCONVERSION,
											 'val':[{'from':'FormUser','to':'Requester','type':FormApp.ItemType.TEXT},
                              {'from':'Timestamp','to':'Request Timestamp','type':FormApp.ItemType.TEXT},
															{'from':'*#*FY16-MM-###','to':'PO Number','type':FormApp.ItemType.TEXT},
														 ],},
			'approvalHeader.title':{'label':'Header Title for Approval Form',
															'type':TEXT,
															'val':'The above information was filled out by the requester. Use the section below to indicate your approval.',},
			'approvalHeader.helpText':{
				'label':'Approval Form Help Text',
				'type':TEXT,
				'val':'The above information was filled out by the requester. Use the section below to indicate your approval.'
			},
			newFields: {'label':'New Fields',
									'type':FIELDLIST,
									'val':[{'type':'textField','title':'Signature','helpText':'Write initials and date here to approve.'}]},
			emailInformBody : {'label':'Body of email to requester.',
												 'type':PARA,
												 'val':'Your request has been submitted for approval to <<Approver>>. You have been issued an initial PO number <<PO Number>>, to be active upon approval.\n\nHere are the details of your request:'},
			emailRequestBody : {'label':'Body of email to approver.',
													'type':PARA,
													'val':'We have received a request and need your approval. <a href="<<link>>">Click here</a> to approve.'},
		} // end params
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
  Logger.log('get data config...');
	conf = getMasterConfig(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Config of length: %s',conf.length);
	for (var i=2; i<conf.length; i++) {
		table = conf[i];
      Logger.log('look @ %s',table);
		for (var n=1; n<=3; n++) {
			if (table['Config '+n+' Link'] && (table['Config '+n+' Link'] != 'NOT_FOUND')) {
				table['ConfigLink'+n]=table['Config '+n+' Link']
				table['ConfigId'+n]=table['Config '+n+' ID']
			}
          try {
			var f = FormApp.openByUrl(table['Form'])            
			table['Title'] = f.getTitle();
            table['Id'] = f.getId()

          }
          catch (err) {
            Logger.log('config row %s: unable to get form from url %s',i,table['Form']);
          }
          
          if (! table['Title']) {
            table['Title'] = 'Untitled';
          }
        }
    }
  var sbActions = getSidebarActions()
  Logger.log('Config %s',conf);
  Logger.log('actions = %s',sbActions);
  return {config: conf, actions: sbActions}
}

function getAllFormFields (form) {
	var items = form.getItems();
	ret = []
	items.forEach(function (i) {
		ret.push(ite.getTitle());
	}
							 );
	return ret;
}

function getActionDetails (actionName, formUrl) {
  var action = sidebarActions[actionName];
  try {var form = FormApp.openByUrl(formUrl);}
  catch (err) {
    Logger.log('Did we actually get a form?');
    form = formUrl;
  }
	// let's jazz this baby up...
	var options = undefined
	for (var param in action.params) {
      param = action.params[param]
      Logger.log('Jazz up %s, %s',param,param.type);
		if (param.type == FIELDLIST || param.type == FIELDCONVERSION) {			
			if (! options) {
				options = getAllFormFields(form)
			}
          Logger.log('Add the options!');
			param.fields = options;
		}
	}
	return action
}

function gotoSheet (id) {
	Logger.log('gotoSheet(%s)',id);
	var ss = SpreadsheetApp.getActiveSpreadsheet()
	var sheet = getSheetById(ss,id);
	ss.setActiveSheet(sheet);
}

function testConf () {
  sidebarDoAction('approval','testform');
}

function testGasCall () {
	Logger.log('Got Gas Call');
}
