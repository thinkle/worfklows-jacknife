
////////////////////////////////////////////////////
// This file contains code that handles triggers  //
// for forms and approvals                        //
////////////////////////////////////////////////////


///////////////////////////////
// Quick ways to read form fields from
// config files...
////////////////////////////////////////

var FAILURE = 'FAILED';

function lookupField (settings, results) {
	if (settings['Field']) {
		var value = results[settings['Field']]
	}
	if (settings['Lookup Field']) {
		var fieldValue = results[settings['Lookup Field']]
		var value = settings[fieldValue]
	}
	if (value) {
		return value
	}
	else {
		return settings['Default']
	}
}

// We support three kinds of syntax
//
// key : val (just provide the value)
// key : %val (lookup %val in our results)
// key : @val>>newfield (lookup %val in lookup table newfield in settings)
function lookupFields (settings, results) {
	logNormal('lookupFields(%s,%s)',settings,results);
  logVerbose('Starting with settings: %s, results: %s',JSON.stringify(settings),JSON.stringify(results));
	fields = {}
	if (results.FormUser) { fields.FormUser=results.FormUser }
	if (results.Timestamp) { fields.Timestamp = results.Timestamp }
	for (var settingKey in settings) {
		logVerbose('lookupFields "%s"=>"%s"',settingKey,settings[settingKey]);
		var val = settings[settingKey];
		if (val[0]=='%') {
			val = val.substr(1);
			fields[settingKey] = results[val];
      logVerbose('fields[%s]=%s',settingKey,fields[settingKey]);
		}
		else {
			if (val[0]=='@' && val.indexOf('>>')>-1) {
				val = val.substr(1); // Now we get the value and pass it through
				var vals = val.split('>>');
				var fieldKey = vals[0]
				var lookupVar = vals[1]
				var initialResult = results[fieldKey]
				var lookupDict = settings[lookupVar+'Lookup'];
				if (!lookupDict) {
					throw "Illegal settings: no lookup dict "+lookupVar+'Lookup'+' for lookup value @'+val;
				}
				else {
					function getResult (r) {
						var fieldVal = lookupDict[r]
						if (fieldVal) { return fieldVal }
						else { return lookupDict['Default']}
					}
					if (Array.isArray(initialResult)) {
						fields[settingKey] = initialResult.map(getResult)
					}
					else {
						fields[settingKey] = getResult(initialResult)
					}
				}
			}
			else {
				fields[settingKey] = val;
			}
		}
	}
	return fields
}

/////////////////////////////////
// Form2Form Stuff for Approval Forms
///////////////////////////////////


function preFillApprovalForm (params) {
  // Pre-Fill Out approval form and return editUrl
  // params.targetForm = form object
  // params.responseItems = response items dictionary
  // params.field2field = lookup dictionary for fields that don't map directly  
  var formResponse = params.targetForm.createResponse()
  items = params.targetForm.getItems();  
  //Logger.log('Looking through items=>'+JSON.stringify(items));
  //Logger.log('There are '+items.length+' items.');
  for (var i=0; i < items.length; i++) {
    item = items[i]
    go_on = false; isNumber = false;
    if (item.getType() == 'TEXT') {
      item = item.asTextItem();
      go_on = true
    }
    if (item.getType() == 'PARAGRAPH_TEXT') {
      item = item.asParagraphTextItem();
      go_on = true
    }
    if (item.getType() == 'MULTIPLE_CHOICE') {
      item = item.asMultipleChoiceItem();
      go_on = true
    }
    if (item.getType()== 'SCALE') {
      item = item.asScaleItem();
      go_on = true;
      isNumber = true;
    }
    if (go_on) {
      Logger.log('Working with '+item.getType()+item.getTitle())
      itemTitle = item.getTitle()      
      if (params.field2field.hasOwnProperty(itemTitle)) {        
        sourceKey = params.field2field[itemTitle]
        value = params.responseItems[sourceKey]
      }
      else {
        value = params.responseItems[itemTitle] // assume we can translate directly
      }
      if (value) {
        if (isNumber) {
          value = Number(value);
        }
        //Logger.log('Creating response with value '+JSON.stringify(value));
        try {
          itemResponse = item.createResponse(value); // Create a response
          formResponse.withItemResponse(itemResponse);
					Logger.log('Created response to item '+itemTitle+': '+value);
        }
        catch (exception) {
          Logger.log('Skipping itemResponse '+value+' exception:'+exception);
          msg = 'Error with itemResponse: '+itemResponse+' value: '+value
          msg += '<br>Exception: '+exception
          sendEmail('thinkle@innovationcharter.org','Error in Budget Script',msg)
        }
      }
      else {
        Logger.log('No response to create: value'+JSON.stringify(value))
        Logger.log('Field was: '+itemTitle);
      }          
    }
    else {
      Logger.log('Ignoring item of type =>'+item.getType());
    }
  }
  submittedFormResponse = formResponse.submit()  
  edit_url = submittedFormResponse.getEditResponseUrl();  
  Logger.log('preFill=>'+edit_url);
  var allResponses = params.targetForm.getResponses();
  var lastRespNo = allResponses.length - 1;
  var lastResp = allResponses[lastRespNo]
  var newEditUrl = lastResp.getEditResponseUrl();
	edit_url = newEditUrl; // ARRRGHH -- work around broken google crap
  Logger.log('preFill2=>'+newEditUrl);
  
  //Debug...
  var masterSheet = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');

  createConfigurationSheet(masterSheet,
                           'Approval Response Received Here is the Edit URL',
                           {'editUrl':edit_url,'second_edit_url':newEditUrl,'this is':'a test'});          
  
  // End debug...
  
  return edit_url
}

function getApprovalFormToMasterLookup (actionRow) {
  // We expect the first sheet to have our lookup info...
  var f2f = {}
  var conf = actionRow['Config1'].table
  if (conf) {
    if (conf.toFields){
			// Now we build out our array in a bit of a strange way...
			for (var i=0; i<conf.toFields.length; i++) {
				if (conf.fromFields.length > i) {
					var fromField = conf.fromFields[i];
					if (fromField) {
						f2f[conf.toFields[i]] = fromField
					}
				}
			} // end for loop...
    }}
  else {
    Logger.log('No conf ?');
    Logger.log('conf: '+JSON.stringify(conf));
  }
  return f2f
}


/////////////
// Triggers & Such

function getResponseItems (resp) {
  responseItems = {}
  resp.getItemResponses().forEach(function (itemResp) {
    responseItems[itemResp.getItem().getTitle()]=itemResp.getResponse();
    }) // end forEach itemResp
	responseItems['Timestamp'] = resp.getTimestamp();
	responseItems['FormUser'] = resp.getRespondentEmail();
	logNormal('ResponseItems: >>>'+JSON.stringify(responseItems)+'<<<');
  logNormal('ResponseItems FormUser: >>>'+responseItems.FormUser);
  return responseItems;
}

triggerActions = {
	// Trigger Actions should return a value if successful (that can be
	// an object with information about success for future actions to
	// use)
 	'NewUser' : function (event, masterSheet, actionRow) {
      Logger.log('!!! NEW USER TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
     var responses = getResponseItems(event.response);
 		var usernameSettings = actionRow['Config1'].table;
 		//var informSettings = actionRow['Config2'].table;
    //var emailSettings = actionRow['Config3'].table;
 		return createAccountFromForm(
          //results, fieldSettings, informSettings, emailTemplateSettings
      responses, 
 			usernameSettings
 			//informSettings,
      //  emailSettings
 		);
 	},
  'Email' : function (event, masterSheet, actionRow) {
    Logger.log('!!! EMAIL TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
    var responses = getResponseItems(event.response);
    var templateSettings = actionRow['Config1'].table;
    var lookupSettings = actionRow['Config2'].table;
    sendFormResultEmail(
      responses,
      templateSettings,
      lookupSettings
    );
		return true;
  }, // end Email
   'Folder' : function (event, masterSheet, actionRow) {
     Logger.log('!!! FOLDER TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
		 responses = getResponseItems(event.response);
		 var config = actionRow['Config1'].table;
	   addUserToFoldersFromForm(responses,config);
   }, // end Folder
	 'Group': function (event, masterSheet, actionRow) {
     Logger.log('!!! GROUP TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
		 responses = getResponseItems(event.response);
		 var groupConfig = actionRow['Config1'].table;
		 addToGroupFromForm(responses,groupConfig);
		 return true;
	 },
	 'Calendar': function (event, masterSheet, actionRow) {
       Logger.log('!!! CALENDAR TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
		 responses = getResponseItems(event.response);
		 var calConfig = actionRow['Config1'].table;
		 //var informConfig = actionRow['Config2'].table;
		 //var emailConfig = actionRow['Config3'].table;
		 var calendarsAdded = addUserToCalendarFromForm(responses, calConfig)//, informConfig, emailConfig);
		 Logger.log('Added calendars: '+JSON.stringify(calendarsAdded));
		 return calendarsAdded
	 }, // end Calendar
  'Approval': function (event, masterSheet, actionRow) {
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
    var f2f = getApprovalFormToMasterLookup(actionRow)
    Logger.log('Got f2f'+JSON.stringify(f2f));
    if (actionRow['Config1'].table) {
			var targetForm = FormApp.openById(actionRow['Config1'].table['Approval Form ID'])
			var editUrl = preFillApprovalForm({'targetForm':targetForm,
																				 'responseItems':responses,
																				 'field2field':f2f})
    }
    else {
      Logger.log('Did not find approval form to master :(');
      Logger.log('actionRow: '+JSON.stringify(actionRow));
    }
    //if (actionRow['Config2'].table && actionRow['Config3'].table) {
    var templateSettings = actionRow['Config2'].table
    var lookupSettings = actionRow['Config3'].table
		responses['link'] = editUrl;
    sendFormResultEmail(
			responses,
			templateSettings,
			lookupSettings
    );
    //}
    //else {
    //  Logger.log('Did not find email settings for approval :(');
    //  Logger.log('actionRow: '+JSON.stringify(actionRow));
    //}
    return true;
  }, // end Approval Form Trigger
	'Log' : function (event, masterSheet, actionRow, actionResults) {
		var settings = lookupFields(actionRow['Config1'].table)
		handleMagicSettings(settings) // here be dragons...
		var sheet = getSheetById(SpreadsheetApp.openById(settings.SpreadsheetId),settings.SheetId);
		var table = Table(sheet.getDataRange())
		table.pushRow(settings) // we just push our settings -- the set up of the table then becomes the key...
	},
}

function fixBrokenEvent (event) {
  // google's event does not work as documented... Let's fix it! 
  // Help from: comment #2 on https://code.google.com/p/google-apps-script-issues/issues/detail?id=4810 
  if (! event.source ) {
    var responseEditUrl = event.response.getEditResponseUrl(); //gets edit response url which includes the form url
    var responseUrl = responseEditUrl.toString().replace(/viewform.*/,''); //returns only the form url
    event.source = FormApp.openByUrl(responseUrl); //gets the submitted form id
  }
  return event
}

function getItemByTitle (form, title) {
  form.getItems().forEach(function (i) {
    if (i.getTitle()==title) {
      return i
    }
  }) // end forEach item
}

//function getHiddenItem (form, title) {
//  var item  = form.getItemByTitle(title)
//  if (item) { return item }
//  // Create hidden item...
//  if (! getItemByTitle('Metadata: Hide this section from user')) {
//    form.addPageBreakItem('Metadata: Hide this section from user') {
//      
//    }
//  }
//}

function writePropertyTest () {
PropertiesService.getUserProperties().setProperty('1s-jsFphG0dMysJivN4YUY7yBZLFY97eplYvXbbimysE','1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
}

function onFormSubmitTrigger (event) {
  Logger.log('onFormSubmitTrigger got: '+JSON.stringify(event))
  event = fixBrokenEvent(event)  
  var form = event.source;  
  // can we keep this bound in the future?
  //var masterSheet = SpreadsheetApp.getActiveSheet();
  masterSheetId = PropertiesService.getUserProperties().getProperty(form.getId())
  if (!masterSheetId) {
    throw "No Master Sheet ID associated with form that triggered us ;("
  }
  
  var masterSheet = SpreadsheetApp.openById(masterSheetId);
  // now lookup our configuration information and do our thing...
  var masterConfig = getMasterConfig(masterSheet);
  var formActions = masterConfig.getConfigsForId(form.getId());
  Logger.log('Working with formActions: '+JSON.stringify(formActions));
  var actionResults = {}
  formActions.forEach(function (actionRow) {
    Logger.log('Trying action: '+actionRow);
    var action = actionRow.Action;    
    try {
			actionResults[action] = triggerActions[action](event,masterSheet,actionRow,actionResults);
    }
    catch (err) {
			actionResults[action] = FAILURE;
      Logger.log('Ran into error on action %s: %s',action,err);
      Logger.log('Blargh!');
    }
  }
                     )// end forEach action
}

function testPrefillForm () {
  var responseItems = {
    'color':'Yellow',
    'Long description':'This is a long description.', 
    'Multiple Choice Question':'Option 1',
    'Ranking Question':'4',
  }
  var f2f = {
    'What is your favorite color?':'color',
  }
  var form = FormApp.openById("1NFtScmn241rlKBz4azHzJK4DJ3P9Un44xUDSCzKQAiE");
  var editUrl = preFillApprovalForm({'targetForm':form,
																		 'responseItems':responseItems,
																		 'field2field':f2f})
  Logger.log('Edit URL: '+editUrl);  
}

function cleanupSheets () {
  var ssApp = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
  var sheet = ssApp.getSheetByName('Approval Response Received')  
  if (sheet) {ssApp.deleteSheet(sheet)};
  var sheet = ssApp.getSheetByName('Approval Response Received Here is the Edit URL')
  if (sheet) {ssApp.deleteSheet(sheet)};
  for (var i=1; i<200; i++) {
    var sheet = ssApp.getSheetByName('Approval Response Received-'+i);
    if (sheet) {ssApp.deleteSheet(sheet) }
    var sheet = ssApp.getSheetByName('Approval Response Received Here is the Edit URL-'+i)
    if (sheet) {ssApp.deleteSheet(sheet) }
  }
}

function testTrigger () {
  // Submit a form so we can test our trigger...
  var form = FormApp.openById('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4');
  var formResponse = form.createResponse()
  items = form.getItems();  
  items.forEach(function (item) {
    var value = "English";
    try {
      itemResponse = item.createResponse(value); // Create a response
      formResponse.withItemResponse(itemResponse);
    }
    catch (err) {
      Logger.log('Oh well, no response for: '+JSON.stringify(item));
			Logger.log('Error: '+err);
    }
  }) // end forEach
  formResponse.submit();
  //Logger.log('Looking through items=>'+JSON.stringify(items));
  //Logger.log('There are '+items
}

function testUserTrigger () {
  var form = FormApp.openById("1kq-v1uyylpKRXbvBj51TpkssCTzNyMn1PJzpMLmlA14") 
  formResp = form.createResponse();
  items = form.getItems();
  items.forEach(function (item) {           
    var responded = false;
    if (item.getTitle()=="Username") {          
      formResp.withItemResponse(item.asTextItem().createResponse("Newfaker.Fake@innovationcharter.org"))                   
      responded = true;
    }
    if (item.getTitle()=="First") {
      formResp.withItemResponse(item.asTextItem().createResponse("Newfaker"));
      responded = true;
    }
    if (item.getTitle()=="Last") {
      formResp.withItemResponse(item.asTextItem().createResponse("Fake"));
      responded =true;
    }
    if (item.getTitle()=="Personal Email") {
      formResp.withItemResponse(item.asTextItem().createResponse("tmhinkle@gmail.com"));
      responded =true;
    }
    if (! responded) {    
      if (item.getType()=='CHECKBOX') {
        Logger.log('Filling out multiple choice by checking all the boxes');
        var allResponses = item.asCheckboxItem().getChoices().map(function (i) {return i.getValue()})
        Logger.log(JSON.stringify(allResponses));
        var resp = item.asCheckboxItem().createResponse(
          allResponses
        )
        formResp.withItemResponse(resp);
      } // end if
      if (item.getType()=='TEXT') {
        Logger.log('Filling out random form item "'+item.getTitle()+'" with Foo');
        formResp.withItemResponse(item.asTextItem().createResponse('Foo'));
      }
    } // end else
  }); // end forEach
  formResp.submit();
} // end testCallTrigger


function testCalTrigger () {
	var form = FormApp.openById("1a6-6MeMG0oyLpMhcv7h83cOFQ-fG21snRdmnGOolU2U")    
	var formResp = form.createResponse();
	items = form.getItems();
	items.forEach(function (item) {
      
      var title = item.getTitle();      
		if (item.getTitle()=='Username') {          
          formResp.withItemResponse(item.asTextItem().createResponse("Fake.Faculty@innovationcharter.org"))                   
		}
		else {
			if (item.getType()=='CHECKBOX') {
				Logger.log('Filling out multiple choice by checking all the boxes');
                var allResponses = item.asCheckboxItem().getChoices().map(function (i) {return i.getValue()})
                Logger.log(JSON.stringify(allResponses));
				var resp = item.asCheckboxItem().createResponse(
					allResponses
				)
				formResp.withItemResponse(resp);
			} // end if
		} // end else
	}); // end forEach
	formResp.submit();
} // end testCallTrigger

function testGetConfigsForId () {
	var masterSheet = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
	Logger.log('GOT Configs: '+JSON.stringify(getMasterConfig(masterSheet).getConfigsForId('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4')));
}


