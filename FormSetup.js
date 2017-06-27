// This file contains code for creating the approval forms

function createTestTriggerManually () {
    ScriptApp.newTrigger('onFormSubmitTrigger')
	.forForm(FormApp.openById('1PRaZe94HaFVszseps2kJzoEYC14_nQJDNFTVAm6Q1mQ'))
	.onFormSubmit()
	.create()
}

function configureFormItem (item, params) {
    if (params['title']) {
	item.setTitle(params['title'])
    }
    if (params['helpText']) {
	item.setHelpText(params['helpText'])
    }  
}


function createFormItem (form, params) {
    switch (params['type']) {
    case FormApp.ItemType.TEXT:
	item = form.addTextItem();
	break; 
    case FormApp.ItemType.PARAGRAPH_TEXT:
	item = form.addParagraphTextItem();
	break;
    case FormApp.ItemType.SECTION_HEADER:
	item = form.addSectionHeaderItem();            
	break;
    default:
	item = form.addTextItem()
	break;
    }
    configureFormItem(item,params);
}

function listFormItemTitles (form) {
    var titles = []  
    form.getItems().forEach(function (item) {        
	var title = item.getTitle();
	if (title) {
	    titles.push(item.getTitle())
	}
	else {
	    Logger.log('ignoring '+shortStringify(item));
	}
    }) // end forEach item
    return titles
} // end listFormItemTitles


function testListFormItemTitles() {
    var form = FormApp.openById('1LRophsb8hTo1GNv8qpGp8G-dCpdLIFBboO5rx5pIfII')
    Logger.log('listFormItemTitles=>'+listFormItemTitles(form));
}

function testTableThing (){
Logger.log('Got template: %s',createEmailTableTemplateForForm('1WGKg3jEmRI4oGZIh1TfAEW4H8AlzNtttAEbWfEo989s'));
}

function createEmailTableTemplateForForm (form, extras) {
    form = getForm(form);
    var htmlOut = '<table>'
    var everyOther = true
    form.getItems().forEach( function (item) {
	var txt = item.getTitle(); Logger.log('%s %s',item.getTitle(),item.getType());
	if (item.getType() == FormApp.ItemType.SECTION_HEADER || item.getType() == FormApp.ItemType.PAGE_BREAK) {
	    htmlOut += '<tr style="background-color:#222;color:#ddf;font-weight:bold;><td colspan=2>'
	    htmlOut += txt
	    htmlOut += '</td></tr>'
	}
	else {
	    if (everyOther) {
		htmlOut += '<tr style="background-color:#ffd">'
	    }
	    else {
		htmlOut += '<tr style="background-color:#ddf">'
	    }
	    everyOther = (! everyOther);
	    htmlOut += '<th style="text-align: right;">'+txt+'</th><td>{{'+txt+'}}</td></tr>';
	}
    }) // end forEach item
    if (extras) {
	extras.forEach(function (extraItem) {
	    if (everyOther) {
		htmlOut += '<tr style="background-color:#ffd">'
	    }
	    else {
		htmlOut += '<tr style="background-color:#ddf">'
	    }
	    everyOther = (! everyOther);
	    htmlOut += '<th style="text-align: right;">'+extraItem[0]+'</th><td>{{'+extraItem[1]+'}}</td></tr>';
	}); // end forEach extra
    }
    htmlOut += '</table>';
    return htmlOut;
}

function createCalendarSettings (form, calConfig, params) {
    var formAsFile = DriveApp.getFileById(form.getId());
    var formTitle = form.getTitle()+' Calendar'; Logger.log('title='+formTitle);
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configSheets = [];
    configSheets.push(
	createConfigurationSheet(
	    controlSS, formTitle+' Settings',
	calConfig
	));
    masterConfig.pushConfig(
	form,
	'Calendar',
	configSheets
    );
    createFormTrigger(form, controlSS);
}

function createCalendarEventSettings (form, calConfig, params) {
    var formAsFile = DriveApp.getFileById(form.getId());
    var formTitle = form.getTitle()+' Calendar Event'; 
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configSheets = [];
    configSheets.push(
	createConfigurationSheet(
	    controlSS, formTitle+' Settings',
	    calConfig
	));
    masterConfig.pushConfig(
	form,
	'CalendarEvent',
	configSheets
    );
    createFormTrigger(form, controlSS);
}


function createGroupSettings (form, params) {
    var formAsFile = DriveApp.getFileById(form.getId());
    var formTitle = form.getTitle(); Logger.log('title='+formTitle);
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configSheets = []
    config = {'username':params.username ? params.username : '%Username',
	      'groups': params.groups ? params.username : '%Add to Google Groups', // should match default value in Groups.js
	      'NeedsAuthorization':params.NeedsAuthorization ? params.NeedsAuthorization : 'True',
	      'Authorize':params.Authorize ? params.Authorize : '@FormUser>>AuthorizedUser',
	      'AuthorizedUserKey':['user@foo.bar','user@boo.bang','Default'],
	      'AuthorizedUserVal':[1,1,0],
	     }
    handleLookups(config,params);
    configSheets.push(
	createConfigurationSheet(
	    controlSS, formTitle+' Group Fields',
	    config
	));
    masterConfig.pushConfig(
	form,
	'Group',
	configSheets
    );
    createFormTrigger(form,controlSS);
}

function createFolderSettings (form, config, params) {
    var formAsFile = DriveApp.getFileById(form.getId());
    var formTitle = form.getTitle()+' Folder'; Logger.log('title='+formTitle);
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configSheets = [];
    configSheets.push(
	createConfigurationSheet(
	    controlSS, formTitle,
	    config
	));
    masterConfig.pushConfig(
	form,
	'Folder',
	configSheets
    );
    createFormTrigger(form,controlSS);
}

function createAccountSettings (form, params) {
    var formAsFile = DriveApp.getFileById(form.getId());
    var formTitle = form.getTitle();
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configSheets = []
    configSheets.push(
	createConfigurationSheet( // field settings
            controlSS, form.getTitle()+' Account Information',
	    {
		username:'%Username',
		first:'%First',
		last:'%Last',
		informFormUser:1,
		informOther:'%Personal Email',
		requirePasswordReset:1,
		emailSubject:defaultCreateAccountSubject,
		emailTemplate:defaultCreateAccountTemplate,
		'Possible Fields':listFormItemTitles(FormApp.openById(formAsFile.getId())),
		'NeedsAuthorization':1,
		'Authorize':'@FormUser>>AuthorizedUser',
		'AuthorizedUserKey':['user@foo.bar','user@boo.bang','Default'],
		'AuthorizedUserVal':[1,1,0],
	    }
	))
    // configSheets.push(
    // 	createConfigurationSheet( // informSettings
    //         controlSS, form.getTitle()+' Account To-Inform',
    // 		{'Field':'Personal Email',
    // 		}
    // 	))
    // configSheets.push(
    // 	createConfigurationSheet( // email template
    // 		controlSS, form.getTitle()+' Email Template',
    // 		{'Body':defaultCreateAccountTemplate,
    // 		 'Subject':defaultCreateAccountSubject,}
    // 	));
    masterConfig.pushConfig(
	form,
	'NewUser',
	configSheets);    
    createFormTrigger(form,controlSS);
}

// Create a form with the fields necessary for creating a new user
function createUserForm (calendarIDs, groups, folderIDs,params) {
    logNormal('createUserForm(%s,%s,%s,%s)',calendarIDs,groups,folderIDs,params);
    form = FormApp.create('New User Form')
	.setTitle('New User Form')
	.setCollectEmail(true);
    form.addSectionHeaderItem()
	.setTitle('New User Information');
    form.addTextItem().setTitle('First')
    form.addTextItem().setTitle('Last')
    form.addTextItem().setTitle('Username')
    form.addTextItem()
	.setTitle('Personal Email')
	.setHelpText('Email to get sent login information');
    createAccountSettings(form,params); 
    // Calendar...
    if (calendarIDs) {
	var formResults = createCalendarFormAndConfig(calendarIDs,form);
	createCalendarSettings(form,formResults.configTable,params)
    }
    if (groups) {
	// Group
	createGroupForm(groups,form);
	createGroupSettings(form,params);
    }
    if (folderIDs) {
	Logger.log('folderIDs=%s',folderIDs);
	var ret = createDriveFormAndConfig(folderIDs,form);
	createFolderSettings(ret.form,ret.configTable,params);
    }
    Logger.log('Created User Form: '+form.getPublishedUrl());
    return form
} // end createUserForm


function convertUnpushableFields (form) {
  // Convert fields that we cannot copy data between :(
  console.log('Convert unpushables in %s',form.getEditUrl());
  existingItems = form.getItems();
  existingItems.forEach(function (itm) {
    supported = false;
    supported_approval_field_types.forEach(function (t) {if (itm.getType()==t) {supported = true}});
    if (!supported) {
      console.log('Not supported: %s,%s (not in %s)',itm.getTitle(),itm.getType(),supported_approval_field_types)
      var replacement = form.addTextItem()
      replacement.setTitle(itm.getTitle());
      replacement.setHelpText(itm.getHelpText());
      form.moveItem(replacement.getIndex(),itm.getIndex())
      form.deleteItem(itm)
    }
    else {
      console.log('Supported : %s %s',itm.getTitle(),itm.getType())
    }
  });
}

/* newTextItems=['Approval'], convertFields={'Requester':'FormUser', 'Request Timestamp':'Timestamp'}, ) */
function createApprovalForm (firstForm, params) {
    if (params == undefined) {params = {}}
    var formAsFile = DriveApp.getFileById(firstForm.getId())
    var origTitle = firstForm.getTitle()
    var origName = formAsFile.getName()
    var titleSuffix = params['titleSuffix'] ? params['titleSuffix'] : ' Approval'  
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    if (params['DestinationFolder']) {
	var approvalFormAsFile = formAsFile.makeCopy(origName+' '+titleSuffix, params['destinationFolder'] ? params['destinationFolder'] : "")
    }
    else {
	var approvalFormAsFile = formAsFile.makeCopy(origName+' '+titleSuffix);
    }
    var approvalForm = FormApp.openById(approvalFormAsFile.getId());   
    approvalForm.setTitle(origTitle+' '+titleSuffix)  
    var convertFields = params['convertFields'] ? params['convertFields'] : [{'from':'FormUser','to':'Requester','type':FormApp.ItemType.TEXT},
                                                                             {'from':'Timestamp','to':'Request Timestamp','type':FormApp.ItemType.TEXT},
									     {'from':'*#*FY16-MM-###','to':'PO Number','type':FormApp.ItemType.TEXT},
                                                                            ]
    var newSectionHeader = params['approvalHeader'] ? params['approvalHeader'] : {'title':'Approval', 'helpText':'The above information was filled out by the requester. Use the section below to indicate your approval.'}
    var newFields = params['newFields'] ? params['newFields'] : [{'type':'textField','title':'Signature','helpText':'Write initials and date here to approve.'}]  
    newSectionHeader['type']=FormApp.ItemType.SECTION_HEADER

    Logger.log('create header');
    createFormItem(approvalForm,newSectionHeader);  
    for (var fi in convertFields) {
	var fieldParams = convertFields[fi]
	//var existingItems = approvalForm.getItems(fieldParams['type'])
	var existingItems = approvalForm.getItems(FormApp.ItemType.TEXT)
	for (var ii in existingItems) {
	    itm = existingItems[ii]
	    if (itm.getTitle()==fieldParams['from']) {
		Logger.log('Delete existing '+fieldParams['from'])
		approvalForm.deleteItem(itm)
	    }
	    
	    
	}
	fieldParams['title']=fieldParams['to']
	fieldParams['helpText'] = 'Do not modify this field.';
	Logger.log('Create from: '+fieldParams);
	createFormItem(approvalForm,fieldParams)    
    }
    for (var i in newFields) {
	var fieldParams = newFields[i]
	Logger.log('Create from: '+fieldParams);
	createFormItem(approvalForm,fieldParams)    
    }
    convertUnpushableFields(approvalForm);
    var fromFields = []; toFields = []; helpText = []; fieldTypes = [];
    function addField (f) {
	fromFields.push(f.from ? f.from : '')
	toFields.push(f.to ? f.to : f.title ? f.title : '')
	helpText.push(f.helpText ? f.helpText : '')
	fieldTypes.push(f.type ? f.type : '')
    }
    newFields.forEach(addField);  
    convertFields.forEach(addField);  
    
    // Create config sheets...
    var configSheets = []
    approvalConfig = {
	'Approval Form ID':approvalForm.getId(),
	'Approval Form Edit URL':approvalForm.getEditUrl(),
	'toFields':toFields,
	'fieldTypes':fieldTypes,
	'helpText':helpText,
    };
    for (var i=0; i<fromFields.length;i++) {
	var toField = toFields[i];
	var fromField = fromFields[i];
	if (fromField) {
	    if (['%','*','?','@'].indexOf(fromField[0])==-1) {
		approvalConfig[toField] = '%'+fromField;
	    }
	    else {
		approvalConfig[toField] = fromField;
	    }
	}
    }
    configSheets.push(createConfigurationSheet(
	controlSS, firstForm.getTitle()+' Approval Form',approvalConfig
    ));
    configSheets.push(createConfigurationSheet(
	controlSS, firstForm.getTitle()+' Approval Emails',
	{'RequestSubject':firstForm.getTitle()+' Approval needed',
	 //'RequestBody':'We have received a request and need your approval. <a href="<<link>>">Click here</a> to approve.\n' + createEmailTableTemplateForForm(firstForm, [['PO Number','PO Number']]),
	 'RequestBody':(params['emailRequestBody'] ? params['emailRequestBody'] : 'We have received a request and need your approval. <a href="<<link>>">Click here</a> to approve.') +'\n\n'+ createEmailTableTemplateForForm(approvalForm),
	 'Approver':'foo@bar.com',
	 'allowSelfApproval':0,
	 'ApproverDefault':'DEFAULTAPPROVAL@FOO.BAR',
	 'ApproverBackup':'BACKUPAPPROVAL@FOO.BAR',
	 'includeFormSubmitter':0,
	 'InformSubmitter':1,
	 'InformSubject':firstForm.getTitle()+' Request submitted',
	 //'InformBody':'Your request has been submitted for approval to <<Approver>>. You have been issued an initial PO number <<PO Number>>, to be active upon approval.\n\nHere are the details of your request:\n'+createEmailTableTemplateForForm(firstForm, [['PO Number','PO Number'],['Approver','Approver']]),
	 'InformBody' : (params['emailInformBody'] ? params['emailInformBody'] : 'Your request has been submitted for approval to <<Approver>>. You have been issued an initial PO number <<PO Number>>, to be active upon approval.\n\nHere are the details of your request:')+'\n\n'+createEmailTableTemplateForForm(approvalForm),
	 'Possible Fields':listFormItemTitles(FormApp.openById(formAsFile.getId())),
	}
    )
		     );
    var log = SpreadsheetApp.create(firstForm.getTitle()+' Approval Log');
    log.getActiveSheet().appendRow(
	['OriginalResponseId','OriginalURL','ApprovalResponseId','ApprovalURL','InformedEmail','ToApproveEmail']
    );
    configSheets.push(createConfigurationSheet(
	controlSS, firstForm.getTitle()+' Approval Log',
	{
	    'SheetId':'0',
	    'SpreadsheetId':log.getId(),
	}
    ));
    // write Configuration Data...
    Logger.log('masterConfig.pushConfig'+shortStringify([firstForm,'Approval',configSheets]));
    masterConfig.pushConfig(
	firstForm,
	'Approval',
	configSheets
    )
    emailConfigSheets = []
    emailConfigSheets.push(createConfigurationSheet(
	controlSS,
	approvalForm.getTitle()+' Email Template',
	{'Subject': firstForm.getTitle()+' Response',
	 'Body':'Your request has been responded to by <<FormUser>>.\n\n'+createEmailTableTemplateForForm(approvalForm),
	 'To':'%Requester',
	 'Possible Fields':listFormItemTitles(approvalForm),
	 'EmailKey':['Key1','Key2','Key3'],
	 'EmailVal':['foo@bar.baz','foo@bar.bax','foo@bar.bay'],
	 'onlyEmailIf':'%Signature'
	}
    ));
    // emailConfigSheets.push(createConfigurationSheet(
    //   controlSS,
    //   approvalForm.getTitle()+' Email Settings',
    //   {
    //   'Lookup Field':'',
    //   'Value 1':'foo@bar.com',
    //   'Value 2':'boo@foo.com',
    //   'Default':'asdf@asdf.org',    
    //   'Possible Fields':listFormItemTitles(approvalForm),
    //   }
    //   ));         
    // Now write second config file...
    masterConfig.pushConfig(
	approvalForm,
	'Email',
	emailConfigSheets);
    // Now set up triggers so that the master form 
    // triggers the approval form...  
    // if we don't have one already...
    createFormTrigger(firstForm, controlSS);
    createFormTrigger(approvalForm, controlSS);

    return approvalForm
}

function handleLookups (config, params, form) {
    // Add lookups from params to config...
    for (var p in params) {
	val = params[p];
	if (val[0] && val[0]=='@' && val.indexOf('>>')>-1) {
	    var vals = val.split('>>');
	    lookupVar = vals[1]
	    config[p+'Key'] = ['Default']
	    config[p+'Val'] = [true]
	}
    } // end for p in params
    return params // for chaining
}

function createEmailTrigger (form, params) {
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var emailConfigSheets = []
    var config = {'Subject': params['Subject'] ? params['Subject'] : firstForm.getTitle()+' Response',
		  'Body':(params['Body'] ? params['Body'] : 'Your request has been responded to by <<FormUser>>.') + '\n\n'+createEmailTableTemplateForForm(form),
		  'To':params['To'] ? params['To'] : '%FieldNameHere',
		  'Possible Fields':listFormItemTitles(form),
		  //'EmailKey':['Key1','Key2','Key3'],
		  //'EmailVal':['foo@bar.baz','foo@bar.bax','foo@bar.bay'],
		  'onlyEmailIf':params['onlyEmailIf'] ? params['onlyEmailIf'] : '1'
		 }
    handleLookups(config, params)
    emailConfigSheets.push(createConfigurationSheet(
	controlSS,
	form.getTitle()+' Email Template',
	config
    ));
    masterConfig.pushConfig(
	form,
	'Email',
	emailConfigSheets);
    createFormTrigger(form, controlSS);	
}

function createCalEventTrigger (form, params) {
    config = createCalEventConfig(params);
    return createCalendarEventSettings(form,config,params);
}

function createFormTrigger (form, master) {
    var alreadyHaveTrigger =  false
    ScriptApp.getProjectTriggers().forEach(function (t) {
	if (t.getTriggerSourceId()==form.getId()) {
	    if (t.getEventType()==ScriptApp.EventType.ON_FORM_SUBMIT) {
		Logger.log('trigger already installed -- no need for another');
		alreadyHaveTrigger = true
		var controlSheet = PropertiesService.getUserProperties().getProperty(form.getId())
		if (controlSheet != master.getId) {
		    var err =  'Conflicting trigger: each form can only be managed by one control sheet.'
		    err += '\n'+'Was '+controlSheet
		    err += '\n'+'Shoud be '+master.getId()
		    throw err;
		}
	    }
	}
    }) // end forEach trigger
    if (! alreadyHaveTrigger) {
	ScriptApp.newTrigger('onFormSubmitTrigger')
	    .forForm(form)
	    .onFormSubmit()
	    .create();
	PropertiesService.getUserProperties().setProperty(form.getId(),master.getId())
    }
}

function createIACSApprovalLog () {
    var fid = '1o85hFuoe3c1TlQBn6FFxj6flSPkzOiElODFtgitGnrI'
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');	
    createLog(FormApp.openById(fid),{'SpreadsheetApp':ssApp});
}

function setupIACSApprovalForm () {
    var fid = '1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM'
    //var fid = '1VrnBZ1Be8t9epgaOlxk6x8z1s9NxGfcWCU3O8LJBWdA'; 
    form = FormApp.openById(fid);
    var approvalFormID = '1o85hFuoe3c1TlQBn6FFxj6flSPkzOiElODFtgitGnrI';
    aform = FormApp.openById(approvalFormID);
    controlSS = SpreadsheetApp.openById('10yauqDvNnG2iQwoaIWbRs_3HKVJkYcx0HK3MRCL2bRE')
    //	var masterConfig = getMasterConfig(controlSS);
    //	masterConfig.pushConfig(form,'Approval',[createConfigurationSheet(controlSS,'FY17 Request Approval Form',{'fix':'me'}),
    //																					createConfigurationSheet(controlSS,'FY17 Request Approval Form',{'fix':'me'})]);
    //	masterConfig.pushConfig(aform,'Email',[createConfigurationSheet(controlSS,'FY17 Request Approval Emails',{'fix':'me'})]);
    //	masterConfig.pushConfig(aform,'Log',[createConfigurationSheet(controlSS,'FY17 Purchase Log',{'fix':'me'})]);
    //createFormTrigger(form, controlSS)
    //createFormTrigger(aform, controlSS)
    var log = SpreadsheetApp.create(firstForm.getTitle()+' Approval Log');
    log.getActiveSheet().appendRow(
	['OriginalResponseId','OriginalURL','ApprovalResponseId','ApprovalURL','InformedEmail','ToApproveEmail']
    );
    configSheets.push(createConfigurationSheet(
	controlSS, firstForm.getTitle()+' Approval Log',
	{
	    'SheetId':'0',
	    'SpreadsheetId':log.getId(),
	}
    ));
    // write Configuration Data...
    Logger.log('masterConfig.pushConfig'+shortStringify([firstForm,'Approval',configSheets]));
    masterConfig.pushConfig(
	form,
	'Approval',
	configSheets
    )

}

function createIACSApprovalForm () {
    var fid = '1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM'
    var origForm = FormApp.openById(fid);
    DriveApp.getFileById(fid).setTrashed(false); // out of trash :)
    var origFolder = DriveApp.getFolderById('0B6UL9LRgyOtHTkJ6U1F1dVVlWkE');  
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    var approvalForm = createApprovalForm(origForm, {'destinationFolder':origFolder,
                                                     'SpreadsheetApp':ssApp,})  
    Logger.log('ID: '+approvalForm.getId())
    Logger.log('Pub URL: '+approvalForm.getPublishedUrl())
    Logger.log('Edit URL: '+approvalForm.getEditUrl())

}

function testCreateApprovalForm () {   
    //var origForm = FormApp.openById('1LRophsb8hTo1GNv8qpGp8G-dCpdLIFBboO5rx5pIfII')
    //var fid = '1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4'
    var fid = '1uWzGNMj0cGMKy9i9C-qHZyaMwH7ModeEe0Cna-XmcBU'
    var origForm = FormApp.openById(fid);
    DriveApp.getFileById(fid).setTrashed(false); // out of trash :)
    var origFolder = DriveApp.getFolderById('0B6UL9LRgyOtHTkJ6U1F1dVVlWkE');  
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    var approvalForm = createApprovalForm(origForm, {'destinationFolder':origFolder,
                                                     'SpreadsheetApp':ssApp,})  
    Logger.log('ID: '+approvalForm.getId())
    Logger.log('Pub URL: '+approvalForm.getPublishedUrl())
    Logger.log('Edit URL: '+approvalForm.getEditUrl())
} // end testCreateApprovalForm

function testCreateUserForm () {
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    var cals = ['innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com','innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com']
    var groups = ['hs@innovationcharter.org','ms@innovationcharter.org','all@innovationcharter.org']
    var folders = []
    createUserForm(cals, groups, folders,                   
		   {'SpreadsheetApp':ssApp});
}

function createIACSUserForm () {	
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');

    var cals = [
	// All / HS / MS
	'innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com', // IACS All School Public Calendar	
	'innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com', // IACS HS Staff Calendar	
	'innovationcharter.org_v7fibqav8iaddl4qqm0hcfv6ss@group.calendar.google.com', // IACS-MS Staff
        // Team Calendars...
        'innovationcharter.org_2acc54qlpdhe8qgiee0l7ldbt8@group.calendar.google.com', // team-calendar-7/8 PS
	'innovationcharter.org_l392359l62rt2c0q9vq0rsvv3s@group.calendar.google.com', // team calendar-7/8 SD	
	'innovationcharter.org_f18ij5fhojmf19fnjtlkcs0gvo@group.calendar.google.com', // team-calendar EC
	'innovationcharter.org_m1lnm7dpk762t9gehum57hmf04@group.calendar.google.com', // team-calendar CM
	

	// All School Rooms
	'innovationcharter.org_2d3438383930363839393536@resource.calendar.google.com', // Auditorium	
	'innovationcharter.org_3738343832303233363636@resource.calendar.google.com', // IACS Van	

	// HS ROOMS
	'innovationcharter.org_3numtkcsl56p3m5ca8k2icrb60@group.calendar.google.com', // Life Sciences Lab	
	'innovationcharter.org_2d383439333334343430@resource.calendar.google.com', // RM 306	
	'innovationcharter.org_hpe4hslbt5heegv7t8dsiiqiro@group.calendar.google.com', // Vernier Equipment	
	'innovationcharter.org_jddt5mqo46n16k0j9dhm14rm7k@group.calendar.google.com', // Fab Lab	

	// MS ROOMS
	'innovationcharter.org_4lmett0d94e402l1j7o9m7es9c@group.calendar.google.com', // 504 Conference Room	
	'innovationcharter.org_gciib4u94jc92pc3dko294ho30@group.calendar.google.com', // 506 Pull out - Landberg Hall	
	'innovationcharter.org_nhi2qmf6hcjvnffltbmtu0l7p8@group.calendar.google.com', // Landberg Hall Pullout 522	

	// chromebook carts
	'innovationcharter.org_2d32343031363330302d363633@resource.calendar.google.com', // chromebook_SD_4th	
	'innovationcharter.org_2d34343738343938322d393932@resource.calendar.google.com', // chromebook_7/8_207	
	'innovationcharter.org_25i0cpo3a5ghmjposk20st26pc@group.calendar.google.com', // chromebook_PS_4th
	'innovationcharter.org_2d3437393932303539393437@resource.calendar.google.com', // BLUE (516) chromebook (was EC)	
	'innovationcharter.org_2d35373236353337322d36@resource.calendar.google.com', // chromebook_5/6_520	
	'innovationcharter.org_333634373034393430@resource.calendar.google.com', // GREEN (515) chromebook (was CM)	
	'innovationcharter.org_3233353932393838333932@resource.calendar.google.com', // YELLOW (518) Chromebook Cart	
	'innovationcharter.org_2d393338353532392d3934@resource.calendar.google.com', // Chromebook 7/8 (401) RED	

    ]
    var groups = [
	'all@innovationcharter.org',
	'hs@innovationcharter.org',
	'ms_56team@innovationcharter.org',
	'ms@innovationcharter.org',
	'msfaculty@innovationcharter.org',
	'56advisoryteachers@innovationcharter.org',
	'ECTeam@innovationcharter.org',
	'ms_56_community_membership@innovationcharter.org',
	'PSteam@innovationcharter.org',
	'self_direction_team@innovationcharter.org',
	'ms_78team@innovationcharter.org',
	'78advisoryteachers@innovationcharter.org',
	'ms_advisors@innovationcharter.org',
    ];
    var folders = [
	'0B672QR9JYGbeX1FVM0xyZUJTSU0',
	'0B672QR9JYGbeNEM3SjdYYVJTZms',
	'0B672QR9JYGbeVkhEMmF5WHd5WmM',
    ];
    
    createUserForm(cals, groups, folders,
		   {'SpreadsheetApp':ssApp}
		  );
}

// Create a log for input to form in sheet params.logSheet.
// If logSheet is not provided, we will create a new spreadsheet.
function createLog (form, params) {
    var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
    var masterConfig = getMasterConfig(controlSS);
    var configOptions = setupLoggingSheet(form,params.logSheet);
    var configSheets = [];
    configSheets.push(createConfigurationSheet(controlSS,form.getTitle()+' Log',configOptions));	
    masterConfig.pushConfig(
	form,'Log',configSheets
    );
    createFormTrigger(form,controlSS);
}

function testCreateLog () {
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    var form = FormApp.openById('1s-jsFphG0dMysJivN4YUY7yBZLFY97eplYvXbbimysE');
    createLog(form, {'SpreadsheetApp':ssApp});
}

function testCreateCalendarForm () {
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    calObj = createCalendarFormAndConfig(['innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com','innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com']);
    createCalendarSettings(calObj.form,calObj.configTable,
                           {'SpreadsheetApp':ssApp});
    
}

function testCreateOnboardingTrigger () {
    form = FormApp.openById('1s-jsFphG0dMysJivN4YUY7yBZLFY97eplYvXbbimysE')
    controlSS = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
    createFormTrigger(form,controlSS);
}

function clearAll () {
    var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    ssApp.getSheets().forEach(function (s) {
	if (s.getSheetId()!=0) { ssApp.deleteSheet(s) }
    });
    var config = getMasterConfig(ssApp)
    config.forEach(function (row) {
	var formID = row.FormID
	ScriptApp.getProjectTriggers().forEach(function (t) {
	    if (t.getTriggerSourceId()==formID) {
		ScriptApp.deleteTrigger(t)
		Logger.log('Deleting trigger %s',t);
	    }
	}); // end for Each trigger
	try {
	    var f = DriveApp.getFileById(formID);
	    Logger.log('trashing file: %s %s',f,formID);
	    f.setTrashed(true); // trash form
	}
	catch (err) {
            Logger.log('Error deleting %s',formID);
            Logger.log('Error: %s\nStack %s',err,err.stack);
	}
    }); // end for Each row
    getSheetById(ssApp,0).clear(); // clear config sheet
} // end clearAll


function createTestTriggerTomTom () {
    form = FormApp.openByUrl("https://docs.google.com/a/innovationcharter.org/forms/d/1wd-8BsJztO-502w-XzBlbt0KwLdzpNlCtskKE2tJk6M/edit");
    form2 = FormApp.openByUrl('https://docs.google.com/a/innovationcharter.org/forms/d/1QOuOBah01kZ9_HyLd-fX4AIM37Lfp5242miP5NJl304/edit')
    //form2 = FormApp.openById('1FAIpQLSc0yfoJyypDbXXpTakbQUrk34bwg4uAKQJxP8gQkPGq1qWuwg')  
    ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/13J7v8UvtHFB0L7k0qJrDPIuZHRMaT01Ayas47jxion8/edit')
    createFormTrigger(form,ss)
    createFormTrigger(form2,ss)
}

convertTest = Test({
    metadata : {name:'Test field conversion'},
    test : function (p) {
      console.log('Run conversion test');
      var f = DriveApp.getFileById(p.fileForm).makeCopy();
      //f = DriveApp.getFileById('1jAnp-92wGxfihWvK9hgTcWBSmCZZEFHeAvfrP0UQqzs');
      var form = FormApp.openById(f.getId());
      console.log('Try converting unpushables...');
      convertUnpushableFields(form)
      console.log('Completed converting unpushables');
      console.log('URL: %s',form.getEditUrl());
      return {url:form.getEditUrl()}
    },
})

function testFieldConversion () {convertTest.solo()}
