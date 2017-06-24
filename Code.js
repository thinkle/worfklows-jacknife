function doGet() {
    var html = HtmlService.createTemplateFromFile('WebApp');
    return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

TEXT = 1
FOLDER = 2
FIELDCONVERSION = 3
FIELDLIST = 4
PARA = 5
FIELD = 6
/* Note: the FIELD set necessitates a *mode* to be specified...

   Modes consist of...

   field -> %fieldName 
   value -> Raw Value
   lookup -> @lookup
   magic -> %magic?
*/


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

function getLookupsForField (form, fieldName) {
    // Get reasonable lookup values for fieldName in form.
    return {'Default':true}
}


sidebarActions = {
    // Organize information for sidebar UI
    log : {
	shortname: 'Log',
	name : 'Log'
    },
    calendar : {
	shortname : 'Calendar',
	name : 'Share Calendar',
    },
    folder : {
	shortname: 'Folder',
	name : 'Share Folder'
    },
    calendarEvent : {
	name : 'Create Event',
	shortname : 'CalendarEvent',
	callback : function (formUrl, params) {
	    var form = FormApp.openByUrl(formUrl)
	    return createCalEventTrigger(form, params);
	},
	params : {
	    CalendarID:{label:'Calendar ID',val:'',type:TEXT,},
	    Title:{label:'Title',val:'',type:FIELD,mode:'field'},
	    Date:{label:'Date',val:'',type:FIELD,mode:'field'},
	    Location:{label:'Location',val:'',type:FIELD,mode:'field'},
	    Description:{label:'Description',val:'',type:PARA,mode:'field'},
	    onlyAddIf: {label:'Only Add If Value is True (not No or False or Empty):',val:'',type:FIELD,mode:'field'},
	},
    },
    email : {
	name : "Send Email",
	shortname : 'Email',
	callback : function (formUrl, params) {
	    form = FormApp.openByUrl(formUrl);
	    createEmailTrigger(form, params);
	}, // end email callback
	params : {
	    'EmailTitle':{val:'Form Received','type':FIELD,'label':'Title',mode:'value'},
	    'Body':{val:'Email body? Use fields like this: <<Field Title>>.','type':PARA,'label':'Body'},
	    'To':{val:'',type:FIELD,label:'To',mode:'field'},
	    'onlyEmailIf':{val:'',type:FIELD,label:'Only Email If Value is True (not No or False or empty)',mode:'field'}
	},
    }, // end email
    approval : {
	name : "Create Approval Form",
	shortname : 'Approval',
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
    addToGroup : {
	name : 'Add to groups',
	shortname : 'Group',
	params : {
	    'username':{'label':'User to be added to group',
			'type':FIELD,
		       },
	    'groups':{'label':'Groups to add user to',
		      'type':FIELD,},
	},
	callback : function (formUrl, params) {
	}, // end addToGroup callback
    },
    // calEvent : {
    // 	name : "Create Calendar Event",
    // 	callback: function (formId) {
    // 		Logger.log('Cal Event Callback!');
    // 		var calConfig = createCalEventConfig();       
    // 		var params = {};
    // 		createCalendarEventSettings(FormApp.openByUrl(formId), calConfig, params);
    // 	} // end calEvent callback
    // } // end calEvent
} // end sidebarActions


var actionLookup = {};
for (var key in sidebarActions) {
    act = sidebarActions[key]
    if (act.shortname) {
	actionLookup[act.shortname] = act;
    }
}

function getSidebarActions () {
    actions = []
    for (var sa in sidebarActions) {
	actions.push({'action':sa, 'name':sidebarActions[sa]['name']})
    }
    return actions
}

function getCurrentMasterConfig (sid) {
    Logger.log('get data config...');
    if (!sid) {
	conf = getMasterConfig(SpreadsheetApp.getActiveSpreadsheet());
    }
    else {
	conf = getMasterConfig(SpreadsheetApp.openById(sid));
    }
    Logger.log('Config of length: %s',conf.length);
    for (var i=1; i<conf.length; i++) {
	table = conf[i];
	Logger.log('look @ %s',table);
	for (var n=1; n<=3; n++) {
	    if (table['Config '+n+' Link'] && (table['Config '+n+' Link'] != 'NOT_FOUND')) {
		table['ConfigLink'+n]=table['Config '+n+' Link']
		table['ConfigId'+n]=table['Config '+n+' ID']
	    }
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
    var sbActions = getSidebarActions()
    Logger.log('Config %s',conf);
    Logger.log('actions = %s',sbActions);
    return {config: conf, actions: sbActions}
}

function getAllFormFields (form) {
    var items = form.getItems();
    ret = []
    items.forEach(function (i) {
	ret.push(i.getTitle());
    }
		 );
    return ret;
}

function getActionDetails (actionName, formUrl) {
    var action = sidebarActions[actionName];
    if (!action) {
	action = actionLookup[actionName];
    }
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
	if (param.type == FIELDLIST || param.type == FIELDCONVERSION || param.type == FIELD || param.type == PARA) {			
	    if (! options) {
		options = getAllFormFields(form)
		options.push('FormUser')
		options.push('Timestamp')
		options.push('*#*MAGIC-FIELD-YY-###')
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
