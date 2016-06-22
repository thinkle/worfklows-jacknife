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
	if (! results) {
		logAlways('No results (%s) handed to lookupFields',results)
	}
	logNormal('lookupFields(%s,%s)',settings,results);
  logVerbose('Starting with settings: %s, results: %s',JSON.stringify(settings),JSON.stringify(results));
	fields = {}
	if (results.FormUser) { fields.FormUser=results.FormUser }
	if (results.Timestamp) { fields.Timestamp = results.Timestamp }
	for (var settingKey in settings) {
		logVerbose('lookupFields "%s"=>"%s"',settingKey,settings[settingKey]);
		var val = settings[settingKey];
		if (val[0]=='?') {
			logNormal('Looking up action! %s',val);
			// Syntax = +ACTION.attribute.attribute.attribute
			var result = val.substr(1);
			// BUILD REST OF THIS TO PARSE OUT ACTION RESULTS
			// BASED ON MAGIC :)
			var objectChain = result.split('.');
			var obj = results.actionResults[objectChain.shift()]
			while (obj && objectChain.length > 0) {
				try {
					var obj = obj[objectChain.shift()]
				}
				catch (err) {
					logAlways('Error %s getting setting +%s, unable to read object %s',
										err, val, obj
									 )
					obj = undefined
				}
			} // end looping through attributes
			settings[settingKey] = obj
			logVerbose('%s settings[%s]=>%s',val,settingKey,obj);
		}
		if (val[0]=='%') {
			// Syntax = %FieldnameFromForm
			val = val.substr(1);
			fields[settingKey] = results[val];
      logVerbose('fields[%s]=%s',settingKey,fields[settingKey]);
		}
		else {
			// Syntax = @FormFieldname>>LookupFieldName
			if (val[0]=='@') {
				if (val.indexOf('>>')==-1) {
					throw 'Invalid configuration: '+val+' - @ with no >>';
				}
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
					logVerbose('Looking up %s in dictionary %s',initialResult, lookupDict);
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
					logVerbose('fields[%s]=>%s',settingKey,fields[settingKey])
				}
			}
			else {
				fields[settingKey] = val;
			}
		}
	}
	logVerbose('Looked up fields->%s',fields);
	return fields
}

function getMonthString (d) {
	var month = d.getMonth()+1
	month = "" + month;
	if (month.length==1) {
		month = "0"+month
	}
	return month
}

function getYearString (d,n) {
	var year = d.getFullYear()
	if (n==2) {
		return (""+year).substr(2)
	}
	else {
		return ""+year
	}
}

function padNum (n, digits) {
	numString = ""+n
	while (numString.length < digits) {
		numString = "0"+numString
	}
	return numString
}

// Update config based on magic...
function lookupMagic (config, responses, form) {
  logNormal('working with lookupMagic(%s, %s, %s)',config, responses, form);
	for (var key in config) {
		var val = config[key]
		if (typeof val === 'string') {
			if (val.indexOf('*#*')===0) {
				// PO-MAGIC!
				val = val.substr(3); // cut off magic stuff... we'll handle the magic now!
				d = new Date()
				// Start search at...
				if (val.indexOf('YY') >= 0) {
					var timestampDate = new Date(d.getFullYear())
				}
				if (val.indexOf('MM') >= 0) {
					var timestampDate = new Date(d.getFullYear(),d.getMonth())
				}
				val = val.replace('MM',getMonthString(d));
				val = val.replace('YYYY',getYearString(d,4));
				val = val.replace('YY',getYearString(d,2));
				if (val.indexOf('#') >= 0) {
					// This is an incrementer!
					var allResponses = form.getResponses(timestampDate);
          //var allResponses = form.getResponses();
					var item = getItemByTitle(form,key);
					var numberMatch = /#+/g
					var numLength = val.match(numberMatch)[0].length
					// Now go through the responses and check for incrementation needs...
					existingResponses = []
          Logger.log('allResponses = '+allResponses);
          Logger.log('item=%s',item);
          if (allResponses) {
						allResponses.forEach(function (resp) {
              Logger.log('Looking @ %s',resp);
              
              
              if (resp.getResponseForItem(item)) {
                existingResponses.push(                  
                  resp.getResponseForItem(item).getResponse() // response as string
                )
              } // end if
            }); // end for Each...				
          } // end if (allResponses)
					// Now let's just iterate through
					// FIXME - How to iterate through and check for highest number... ?
					var haveUniqueNumber = false;
					var n = 0;
					while (! haveUniqueNumber) {
						n += 1; 
						var numberCandidate = val.replace(numberMatch,padNum(n,numLength))
						if (existingResponses.indexOf(numberCandidate)==-1) {
							haveUniqueNumber = true;
							config[key] = numberCandidate;
						}
					} // end while ! haveUniqueNumber
				} // end test for magic incrementing # thingy...
			} // end test for magic at all
		} 
	} // end for key in config
} // end lookupMagic


/////////////////////////////////
// Form2Form Stuff for Approval Forms
///////////////////////////////////


function preFillApprovalForm (params) {
  // Pre-Fill Out approval form and return editUrl
  // params.targetForm = form object
  // params.responseItems = response items dictionary
  // params.field2field = lookup dictionary for fields that don't map directly  
  logNormal('preFillApprovalForm(%s)',params);
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
        value = params.field2field[itemTitle];
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

function getResponseItems (resp, actionResults) {

  responseItems = {}
	// attach action results so we can act on those as well :)
	if (actionResults) { responseItems.actionResults = actionResults; }
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
  'Email' : function (event, masterSheet, actionRow, actionResults) {
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
  }, // end Email
  'Folder' : function (event, masterSheet, actionRow) {
    Logger.log('!!! FOLDER TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
		responses = getResponseItems(event.response);
		var config = actionRow['Config1'].table;
	  return addUserToFoldersFromForm(responses,config);
  }, // end Folder
	'Group': function (event, masterSheet, actionRow) {
    Logger.log('!!! GROUP TRIGGER !!!! => '+event+'-'+masterSheet+'-'+actionRow);
		responses = getResponseItems(event.response);
		var groupConfig = actionRow['Config1'].table;
		return addToGroupFromForm(responses,groupConfig);
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
    //var f2f = getApprovalFormToMasterLookup(actionRow)
		f2f = lookupFields(actionRow.Config1.table,responses);
    Logger.log('Got f2f'+JSON.stringify(f2f));
    if (! actionRow['Config1'].table) {
      Logger.log('Did not find approval form to master :(');
      Logger.log('actionRow: '+JSON.stringify(actionRow));
			return 0
		}
		var targetForm = FormApp.openById(actionRow['Config1'].table['Approval Form ID'])
    lookupMagic(f2f,responses,targetForm);
    //emailError ("Working with target f2f:"+JSON.stringify(f2f), 'no real error') 
		var editUrl = preFillApprovalForm({'targetForm':targetForm,
                                       'responseItems':responses,
                                       'field2field':f2f})
    //if (actionRow['Config2'].table && actionRow['Config3'].table) {
    var templateSettings = actionRow['Config2'].table
		config = lookupFields(templateSettings,responses);
    //var lookupSettings = actionRow['Config3'].table
		//responses['link'] = editUrl;
		checkForSelfApproval(config);
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
    // sendFormResultEmail(
		// 	responses,
		// 	templateSettings,
		// 	lookupSettings
    // );
    return config;
  }, // end Approval Form Trigger
	'Log' : function (event, masterSheet, actionRow, actionResults) {
      Logger.log('!!! Action Log !!!');
      Logger.log('Event %s actionRow %s actionResults %s',event, actionRow, actionResults);
		var settings = lookupFields(actionRow['Config1'].table,getResponseItems(event.response))
		handleMagicSettings(settings) // here be dragons...
		settings.Triggers = {}
		for (var key in actionResults) {
			settings[key+'Action'] = actionResults[key]
			settings.Triggers[key] = actionResults[key]
		}
		settings.ResponseId = event.response.getId()
		var sheet = getSheetById(SpreadsheetApp.openById(settings.SpreadsheetId),settings.SheetId);
		var table = Table(sheet.getDataRange(),'ResponseId');
        Logger.log('Updating row with %s',JSON.stringify(settings));
		table.updateRow(settings) // we just push our settings -- the set up of the table then becomes the key...
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
  var result = undefined;
  form.getItems().forEach(function (i) {
    //Logger.log('look @ %s',i);
    if (i.getTitle()==title) {
      //Logger.log('%s is a hit for %s!',i, title);
      result = i
    }
    //else {
    //  Logger.log('%s is not %s',i.getTitle(),title);
    //}
  }) // end forEach item
  return result;
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
	PropertiesService.getUserProperties().setProperty('1s-jsFphG0dMysJivN4YUY7yBZLFY97eplYvXbbimysE','1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
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
      Logger.log('Ran into error on action %s: %s\nSTACK:%s',action,err.name,err.stack);
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
																		 'field2field':f2f,
																		 //'config':config,
																		})
  Logger.log('Edit URL: '+editUrl);  
}

function cleanupSheets () {
  var ssApp = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
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

function testIACSApprovalTrigger () {
	var form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
	var formResponse = form.createResponse();
	items = form.getItems();
	items.forEach(function (item) {
		switch (item.getTitle()) {
		case 'Total Cost': var value="41.14"; break;
		case 'Vendor': var value="Fake Vendor"; break;
		case 'Total Type': var value="Exact Amount"; break;
		case 'Request Type': var value="Purchase Order"; break;
		case 'Item Name': var value="Widget"; break;
		case 'Item Description': var value="Shiny"; break;
		case 'Order Notes': var value="Get quick!"; break;
		case 'Order Method': var value="NM Elan card"; break;
		case 'Cost Account Type': var value="Technology (TH)"; break;
		case 'Cost Sub-Account Type': var value="Operational Cost"; break;
		default: return;
		}
		switch (item.getType()) {
    case FormApp.ItemType.CHECKBOX: var item = item.asCheckboxItem(); break;
    case FormApp.ItemType.TEXT: var item = item.asTextItem(); break;
    case FormApp.ItemType.PARAGRAPH_TEXT: var item = item.asParagraphTextItem(); break;
    case FormApp.ItemType.MULTIPLE_CHOICE: var item = item.asMultipleChoiceItem(); break;
		default: return; // don't handle anything else.
		}
		try {
      var itemResponse = item.createResponse(value); // Create a response
      formResponse.withItemResponse(itemResponse);
    }
    catch (err) {
      Logger.log('Oh well, no response for: '+JSON.stringify(item));
			Logger.log('Error: '+err);
    }
  }) // end forEach
  formResponse.submit();
}

function testApprovalTrigger () {
  // Submit a form so we can test our trigger...
  //var form = FormApp.openById('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4');
  var form = FormApp.openById('1uWzGNMj0cGMKy9i9C-qHZyaMwH7ModeEe0Cna-XmcBU');  
  var formResponse = form.createResponse()
  items = form.getItems();  
  items.forEach(function (item) {
		switch (item.getTitle()) {
		  case 'Price':
			var value = '47.77';
      break;
		case 'Item (Short Desc)':
			var value = 'Widget, Extra Fancy';
			break;
          case 'Item Notes':
            var value = 'Be sure to buy the prettiest ones';
            break;          
		default: 
            var value = "English";
    }
		switch (item.getType()) {
          case FormApp.ItemType.CHECKBOX: var item = item.asCheckboxItem(); break;
          case FormApp.ItemType.TEXT: var item = item.asTextItem(); break;
          case FormApp.ItemType.PARAGRAPH_TEXT: var item = item.asParagraphTextItem(); break;
          case FormApp.ItemType.MULTIPLE_CHOICE: var item = item.asMultipleChoiceItem(); break;
		}
    try {
      var itemResponse = item.createResponse(value); // Create a response
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
  var form = FormApp.openById("1s-jsFphG0dMysJivN4YUY7yBZLFY97eplYvXbbimysE") 
  formResp = form.createResponse();
  items = form.getItems();
  items.forEach(function (item) {           
    var responded = false;
    if (item.getTitle()=="Username") {          
      formResp.withItemResponse(item.asTextItem().createResponse("NewestFaker.Fake@innovationcharter.org"))                   
      responded = true;
    }
    if (item.getTitle()=="First") {
      formResp.withItemResponse(item.asTextItem().createResponse("Fake"));
      responded = true;
    }
    if (item.getTitle()=="Last") {
      formResp.withItemResponse(item.asTextItem().createResponse("Faker"));
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
	var masterSheet = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
	Logger.log('GOT Configs: '+JSON.stringify(getMasterConfig(masterSheet).getConfigsForId('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4')));
}

function testField () {  
  form = FormApp.openById('1o8u9iGIN6e5M9CTOtQNBDjueR-8QSYNHzIQR-EUGv98');
  Logger.log('Form = %s',form.getPublishedUrl());
  
  item  = getItemByTitle(form,'PO Number');
  Logger.log('FOrm %s item %s',form,item);
}

function testMagic () {
	form = FormApp.openById('1o8u9iGIN6e5M9CTOtQNBDjueR-8QSYNHzIQR-EUGv98');
  
	config = {
		'PO Number':'*#*FY17-MM-####',
	}
	responses = []
	lookupMagic(config, responses, form);
	Logger.log('Config %s',config);
}
