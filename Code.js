/**
* @file Code.js
* Core methods for google apps script
**/


/** 
* @function
* Load ApproverApp or WebApp depending on parameter
**/
function doGet(e) {
  console.log('param info %s: %s',e,e.parameter)
    if (e.parameter.approve) {
	//var html = '<html>HELLO WORLD WEB APP COMING RIGHT UP</html>'
	//var html = HtmlService.createHtmlOutput(html);
        var html = HtmlService.createTemplateFromFile('ApproverApp.html');
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }
    else {
      Logger.log('serve norm');
	var html = HtmlService.createTemplateFromFile('WebApp');
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }
}
/**
* @function
* Load addOnMenu in google sheets
**/
function onOpen (e) {
    SpreadsheetApp.getUi().createAddonMenu()  
	.addItem('Open Workflows','openWebApp')
	.addItem('Gather documents into folder','doGatherIntoFolder')
	.addItem('Duplicate workflow','doCopyWorkflow')
	//.addItem('Test Config','testConf')
	.addToUi();
}


function openWebApp (){
  var baseUrl = ScriptApp.getService().getUrl()
  // for development
  var baseUrl = 'https://script.google.com/a/macros/innovationcharter.org/s/AKfycbxz21oZsPEflnuNbqlZZmgco4PRDezHT4AFrj8NHlY/dev'  
  showAnchor('Open Workflows Jacknife Web App',baseUrl+'?doc='+SpreadsheetApp.getActiveSpreadsheet().getId());
}

function doCreateConfig (name) {
    var ss = SpreadsheetApp.create(name)
    getMasterConfig(ss);
    return ss.getId();
}

function doGatherIntoFolder () {
    var foldername = SpreadsheetApp.getUi().prompt('Folder name?');
    gatherWorkflow(SpreadsheetApp.getActiveSpreadsheet().getId(),foldername);
}

function doCopyWorkflow () {
    var ui =SpreadsheetApp.getUi()
    result = ui.alert('Copy the entire workflow? This will make a copy of this spreadsheet and all forms and other documents referenced in this configuration.',
		      ui.ButtonSet.YES_NO)
    if (result==ui.Button.YES) {
	var ret = copyWorkflow()
	var html = '<html><body><a href="'+ret.file.getUrl()+'">Control Sheet</a>'
	html += '<br><a href="'+ret.folder.getUrl()+'">Folder with all files</a>'
	var htmlOut = HtmlService.createHtmlOutput(html)
	ui.showModelessDialog(htmlOut,"Open");
    }
    else {
	ui.alert('Ok -- canceled');
    }
}

function showAnchor(name,url) {
    var html = '<html><body><a href="'+url+'" target="blank" onclick="google.script.host.close()">'+name+'</a></body></html>';
    var ui = HtmlService.createHtmlOutput(html)
    SpreadsheetApp.getUi().showModelessDialog(ui,"Open");
}

/**
* @function
* @desc Load sidebar UI
**/
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

function getFileInfo (id) {
  try {var f = DriveApp.getFileById(id)}
  catch (e) {
    try {var f = DriveApp.getFolderById(id);}
      catch (e) {
	  try {
	      var f = DriveApp.getFileById(FormApp.openByUrl(id).getId());
	  }
	  catch (e) {
        console.log('Invalid file ID',id,'maybe it is a URL?');
	      var f = DriveApp.getFileById(SpreadsheetApp.openByUrl(id).getId());
	  }
      }
  }
    return {
	id : id,
	name : f.getName(),
	type : f.getMimeType(),
	url : f.getUrl(),
    }
}
function createApprovalFormFromUrl (formId, params) {
    Logger.log('createApprovalForm(%s)',formId);
    firstForm = FormApp.openByUrl(formId);
    setupApprovalConfig (firstForm, params);
}

function sidebarDoAction (action, form, params) {
    Logger.log('Do Action %s to form %s params %s',action,form,params);
    Logger.log('Action = %s',sidebarActions[action])
    //Logger.log('Calling! with params needed %s',sidebarActions[action].params);
    if (params.SpreadsheetApp) {
	params.SpreadsheetApp = SpreadsheetApp.openById(params.SpreadsheetApp);
    }
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


var sidebarActions

function _initCode () {
    sidebarActions = {}
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
	var table = conf[i];
	Logger.log('look @ %s',table);
	for (var n=1; n<=3; n++) {
	    if (table['Config '+n+' Link'] && (table['Config '+n+' Link'] != 'NOT_FOUND')) {
		table['ConfigLink'+n]=table['Config '+n+' Link']
		table['ConfigId'+n]=table['Config '+n+' ID']
		table['Config'+n] = getConfigTable(sid,table['ConfigId'+n])
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
    var ret = ['Timestamp']
    if (form.collectsEmail()) {
	ret.push('FormUser');
    }
    items.forEach(function (i) {
	ret.push(i.getTitle());
    }
		 );
    ret.push('ResponseId');
    return ret;
}

function getFormFieldOptions (form, initialOptions) {
    if (initialOptions) {
	var ret = initialOptions
    }
    else {
	var ret = {
	    // title : [optionA, optionB, optionC,...]
	}
    }
    //var form = FormApp.openById('1WGKg3jEmRI4oGZIh1TfAEW4H8AlzNtttAEbWfEo989s');
    form.getItems().forEach(function (i) {
      if (i.getType()=='MULTIPLE_CHOICE') {
          if (!ret[i.getTitle()]) {ret[i.getTitle()]=[]}
          i.asMultipleChoiceItem().getChoices().forEach(
              function (c) {
                ret[i.getTitle()].push(c.getValue())
                });
       }
    });
    return ret
}

function testFieldOptions () {
  var f = FormApp.openById('1WGKg3jEmRI4oGZIh1TfAEW4H8AlzNtttAEbWfEo989s');
  Logger.log('got %s',f);
  Logger.log('Got %s',JSON.stringify(getFormFieldOptions(f)));
}

function getForm (maybeUrl) {
    if (typeof maybeUrl=='string') {
	if (maybeUrl.indexOf('//') > -1) {
	    return FormApp.openByUrl(maybeUrl);
	}
	else {
	    return FormApp.openById(maybeUrl);
	}
    }
    else {
	// let's hope it's a form
	return maybeUrl
    }
	
}

function getActionDetails (actionName, formUrl, upstreamFormUrls) {
    // actionName is the name of our action type
    // formUrl is the URL of our form
    // upstreamFormUrls lists other forms that might be in our approval chain.
    // This allows us to populate multiple choice options into formFieldOptions
    // (since we typically map multiple choice -> text fields to make management
    // easier, this allows us to present a UI based on the upstream multiple choice
    // options).
    var action = sidebarActions[actionName];
    if (!action) {
	action = actionLookup[actionName];
    }
    var form = getForm(formUrl)
    action.formFields = getAllFormFields(form);
    action.formFieldOptions = getFormFieldOptions(form);
    if (upstreamFormUrls) {
	upstreamFormUrls.forEach(function (url) {
	    var upstreamForm = getForm(url);
	    action.formFieldOptions = getFormFieldOptions(upstreamForm,action.formFieldOptions);
	})
	console.log('ActionDetails Got upstream options: %s',action.formFieldOptions,action.formFieldOptions);
    }

    // let's jazz this baby up...
    var options = undefined
    for (var param in action.params) {
	param = action.params[param]
	Logger.log('Jazz up %s, %s',param,param.type);
	if (param.type == FIELDLIST || param.type == FIELDCONVERSION || param.type == FIELD || param.type == PARA) {			
	    //if (! options) {
	    //options = getAllFormFields(form)
	    //options.push('FormUser')
	    //options.push('Timestamp')
	    //options.push('*#*MAGIC-FIELD-YY-###')
	    // }
	    //Logger.log('Add the options!');
	    param.fields = action.formFields;
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
