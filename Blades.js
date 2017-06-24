// An alphabetical index of "blades" that can be used by our "jacknife" tool
// Each item is a step that can be triggered by a form as part of a workflow.

Blade({
    shortname:'Approval',
    name : "Create Approval Form",
    create : createApprovalFormFromUrl,
    params : [
	{field:'titleSuffix',
	 label:'Approval Form Title Suffix',
	 type:TEXT,
	 val:' Approval'},
	{field:'destinationFolder','label':'Folder',
	 'type':FOLDER,
	 'val':undefined,},
	{field:'convertFields','label':'Fields to Convert',
	 type:FIELDCONVERSION,
	 'val':[{'from':'FormUser','to':'Requester','type':FormApp.ItemType.TEXT},
		{'from':'Timestamp','to':'Request Timestamp','type':FormApp.ItemType.TEXT},
		{'from':'*#*FY16-MM-###','to':'PO Number','type':FormApp.ItemType.TEXT},
	       ],},
	{field:'approvalHeader.title',label:'Header Title for Approval Form',
	 type:TEXT,val:'The above information was filled out by the requester. Use the section below to indicate your approval.'},
	{field:'approvalHeader.helpText',
	 'label':'Approval Form Help Text',
	 'type':TEXT,
	 'val':'The above information was filled out by the requester. Use the section below to indicate your approval.'
	},
	{field:'newFields','label':'New Fields',
	 'type':FIELDLIST,
	 'val':[{'type':'textField','title':'Signature','helpText':'Write initials and date here to approve.'}]},
	{field:'emailInformBody', label:'Body of email to requester.',
	 type:PARA,
	 val:'Your request has been submitted for approval to <<Approver>>. You have been issued an initial PO number <<PO Number>>, to be active upon approval.\n\nHere are the details of your request:'},
	{field:'emailRequestBody',label:'Body of email to approver.',
	 type:PARA,
	 val:'We have received a request and need your approval. <a href="<<link>>">Click here</a> to approve.'},
    ], // end params

    trigger: function (event, masterSheet, actionRow, actionResults) {
	Logger.log('!!! APPROVAL TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
	responses = getResponseItems(event.response)
	// DEBUG 
	//    try {
	//      createConfigurationSheet(masterSheet,
	//                               'Approval Response Received',
	//                               responses);          
	//    }
	//    catch (err) {
	//      Logger.log('Error creating debug sheet '+err);
	//    }    
	// END DEBUG
	Logger.log('Get actionRow'+JSON.stringify(actionRow));
	Logger.log('Get actionRow[Config1]'+JSON.stringify(actionRow.Config1));
	// configuration set up
	f2f = lookupFields(actionRow.Config1.table,responses);
	var templateSettings = actionRow['Config2'].table
	config = lookupFields(templateSettings,responses);
	var logConf = actionRow['Config3'].table
	checkForSelfApproval(config);
	f2f.Approver = config.Approver;
	logConf.Approver = config.Approver;
	// end configuration setup
	Logger.log('Got f2f'+JSON.stringify(f2f));
	if (! actionRow['Config1'].table) {
	    Logger.log('Did not find approval form to master :(');
	    Logger.log('actionRow: '+JSON.stringify(actionRow));
	    return 0
	}
	var targetForm = FormApp.openById(actionRow['Config1'].table['Approval Form ID'])
	lookupMagic(f2f,responses,targetForm);
	//emailError ("Working with target f2f:"+JSON.stringify(f2f), 'no real error') 
	var approvalRespObj = preFillApprovalForm({'targetForm':targetForm,
						   'responseItems':responses,
						   'field2field':f2f})
	editUrl = approvalRespObj.edit_url
	//if (actionRow['Config2'].table && actionRow['Config3'].table) {
	//var lookupSettings = actionRow['Config3'].table
	//responses['link'] = editUrl;
	// DEBUG
	//emailError('Checked for self-approval: '+JSON.stringify(config),'no error');
	// END DEBUG
	config.link = editUrl;
	// Update with fields from lookup magic...
	for (var key in f2f) {
	    if (! config[key]) {
		Logger.log('Setting config[%s] from f2f[%s]',config[key],f2f[key]);
		config[key] = f2f[key];
	    }
	    else {
		Logger.log('Not overriding[%s] with f2f[%s]',config[key],f2f[key]);
	    }
	}
	for (var key in responses) {
	    config[key] = responses[key];
	}
	// send email with request
	sendEmailFromTemplate(config.Approver,config.RequestSubject,config.RequestBody,
			      config,true);
	if (config.InformSubmitter) {
	    // send email informing user of response thingy...
	    sendEmailFromTemplate(responses.FormUser, config.InformSubject, config.InformBody,
				  config, true
				 ); 
	}
	logEvent(
	    logConf,
	    event,
	    actionResults,
	    {'ApprovalResponseId':approvalRespObj.response.getId(),
	     'ApprovalURL':editUrl,
	     'OriginalResponseId':event.response.getId(),
	     'OriginalURL':event.response.getEditResponseUrl()}
	);
	return config;
    }});

Blade({
    shortname:'Calendar',
    name:'Share Calendar',
    trigger:function (event, masterSheet, actionRow) {
	Logger.log('!!! CALENDAR TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
	responses = getResponseItems(event.response);
	var calConfig = actionRow['Config1'].table;
	//var informConfig = actionRow['Config2'].table;
	//var emailConfig = actionRow['Config3'].table;
	var calendarsAdded = addUserToCalendarFromForm(responses, calConfig)//, informConfig, emailConfig);
	Logger.log('Added calendars: '+JSON.stringify(calendarsAdded));
	return calendarsAdded
    }})


Blade({
    shortname:'CalendarEvent',
    name : 'Create Event',
    create : function (formUrl, params) {
	var form = FormApp.openByUrl(formUrl)
	return createCalEventTrigger(form, params);
    },
    params : [
	{field:'CalendarID',label:'Calendar ID',val:'',type:TEXT,},
	{field:'Title',label:'Title',val:'',type:FIELD,mode:'field'},
	{field:'Date',label:'Date',val:'',type:FIELD,mode:'field'},
	{field:'Location',label:'Location',val:'',type:FIELD,mode:'field'},
	{field:'Description',label:'Description',val:'',type:PARA,mode:'field'},
	{field:'onlyAddIf',label:'Only Add If Value is True (not No or False or Empty):',val:'',type:FIELD,mode:'field'},
    ],
    trigger:function (event, masterSheet, actionRow, actionResults) {
	responses = getResponseItems(event.response);
	var ceConfig = actionRow['Config1'].table;
	return addCalendarEventFromForm(responses,ceConfig);
    }
})

Blade({
    shortname:'Email',
    name:'Send Email',
    create:function (formUrl, params) {
	console.log('Got URL: %s',formUrl);
	form = FormApp.openByUrl(formUrl);
	createEmailTrigger(form, params);
    }, // end email callback
    params :[{field:'Subject',val:'Form Received','type':FIELD,'label':'Subject',mode:'value'},
	     {field:'Body',val:'Your request has been responded to by <<FormUser>>.','type':PARA,'label':'Body'},
	     {field:'To',val:'',type:FIELD,label:'To',mode:'field'},
	     {field:'onlyEmailIf',val:'',type:FIELD,label:'Only Email If Value is True (not No or False or empty)',mode:'field'}
	    ],
    trigger : function (event, masterSheet, actionRow, actionResults) {
	Logger.log('!!! EMAIL TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
	var responses = getResponseItems(event.response,actionResults);
	var settings = actionRow['Config1'].table    
	//var templateSettings = actionRow['Config1'].table;
	//var lookupSettings = actionRow['Config2'].table;
	return sendFormResultEmail(
	    responses,
	    settings
	    //templateSettings,
	    //lookupSettings
	);
    }}) // end Email


Blade({shortname:'Folder',
       name:'Share Folder',
       trigger:function (event, masterSheet, actionRow) {
	Logger.log('!!! FOLDER TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
	responses = getResponseItems(event.response);
	var config = actionRow['Config1'].table;
	return addUserToFoldersFromForm(responses,config);
       },
       create : function (form,params) {
	   createDriveFormAndConfig(params.folders,form)
       },
       params:[
	   {field:'Username',label:'Username',val:'%Username',type:FIELD},
	   {field:'folders',label:'Folder List',type:FOLDERLIST},
	   {field:'EmailSubject',val:defaultDriveSubjectTemplate,type:PARA},
	   {field:'EmailBody',val:defaultDriveBodyTemplate,type:PARA},
	   {field:'InformFormUser',val:1,type:BOOL},
       ],
}) // end Folder



Blade({
    shortname:'Group',
    name:'Add to groups',
    params : [
	{field:'username',label:'User to be added to group',type:FIELD,val:'%Username'},
	{field:'groups','label':'Groups to add user to','type':FIELD,val:'%Add to Google Groups'},
	{field:'NeedsAuthorization',label:'Needs Authorization',type:BOOL,val:true},
	{field:'Authorize',label:'Authorize Users',type:FIELD,val:'@FormUser>>AuthorizedUser'},
    ],
    trigger:function (event, masterSheet, actionRow) {
	Logger.log('!!! GROUP TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
	responses = getResponseItems(event.response);
	var groupConfig = actionRow['Config1'].table;
	return addToGroupFromForm(responses,groupConfig);
    }
})


Blade({
    shortname:'Log',
    name:'Log to File',
    trigger:function (event, masterSheet, actionRow, actionResults) {
	return logEvent(actionRow['Config1'].table,event,actionResults);
    }})

Blade({
    shortname: 'NewUser',
    trigger : function (event, masterSheet, actionRow) {
	var responses = getResponseItems(event.response);
 	var usernameSettings = actionRow['Config1'].table;
 	return createAccountFromForm(
	    //results, fieldSettings, informSettings, emailTemplateSettings
	    responses, 
 	    usernameSettings
 	    //informSettings,
	    //  emailSettings
 	);
    },
})
