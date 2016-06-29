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
  return {'edit_url':edit_url,
          'response':lastResp}
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

function checkForApprovals (form, logsheet) {
	var allResponses = form.getResponses();
	var logTable = Table(logsheet.getDataRange(), 'OriginalResponseId');
	var fixed = []
	allResponses.forEach (function (resp) {
		var respId = resp.getId();
        // Here's some seriously f*ed up code thanks to google -- guess what, each form ID
        // can actually be one of TWO different IDs, and the ID you get off of an object
        // from resp.getId() is DIFFERENT than the ID you get from 
        // form.getResponse(resp).getId() -- so yeah, thanks google, thanks a fucking lot.
		if (! logTable.hasRow(respId) && ! logTable.hasRow(form.getResponse(resp.getId()))) {
			// We don't have the row! We better do this thing...
			Logger.log('Do this thing! '+respId+' '+resp);
            //foo = y + 7 + 23;
			//
			fakeEvent = {
				'source':form,
				'response':resp,
			}
			logNormal('checkForApprovals triggering fakeEvent: %s',fakeEvent);
			onFormSubmitTrigger(fakeEvent);
		}
		else {
			logNormal('checkForApprovals found perfectly good row: %s',respId);
		}
	}); // end forEach resp
}

function approvalOnTimerCleanup () {
	form_sources = []
	ScriptApp.getProjectTriggers().forEach(function (trigger) {
		if (trigger.getEventType()==ScriptApp.EventType.ON_FORM_SUBMIT) {
			var formSource = trigger.getTriggerSourceId();
			if (form_sources.indexOf(formSource)==-1) {
				form_sources.push(formSource) // add to our list of form sources...
			}
		}
	}) // end forEach trigger
	var props = PropertiesService.getUserProperties()    
	form_sources.forEach(function (fs) {
		var masterID = props.getProperty(fs)
		try {
          logNormal('approvalOnTimerCleanup grabbing MASTER %s',masterID);
			var masterSheet = SpreadsheetApp.openById(masterID)
		}
		catch (err) {
          Logger.log('Error grabbing SS %s for %s',masterID,fs);
          return
		}
		var masterConfig = getMasterConfig(masterSheet);
		masterConfig.getConfigsForId(fs).forEach( function (row) {
			if (row.Action=='Approval') {
				Logger.log('We should do something with Approval row: %s',row)
				logSS = SpreadsheetApp.openById(row['Config3'].table.SpreadsheetId);
				logSheet = getSheetById(logSS, row['Config3'].table.SheetId);
				checkForApprovals(FormApp.openById(fs),logSheet);
			}
		});
	}) // end forEach formSource
}
			
function listProps () {
  var allProps = PropertiesService.getUserProperties().getProperties();  
  for (var key in allProps) {Logger.log('%s:%s',key,allProps[key]);}
  
}
function startoverProp () {
    PropertiesService.getUserProperties().deleteProperty('FY16-06-###');
    var scriptCache = CacheService.getScriptCache();
    scriptCache.remove('FY16-06-###');
}
    
function testWeirdness () {
   form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
   existingResp = '2_ABaOnucOVov0flUTCRKnY938U4Qw3q3lEFKd3QYkY_gNFHOcSrn5TO1ZmUz9q0o'
   Logger.log('existing id=>%s',form.getResponse(existingResp).getId());   
   missingResp = 'ChMzMDQxODYzNjc5OTk2MjI3MzUzEOaJ4oW8yJGLjwE'
   Logger.log('missing id=>%s',form.getResponse(missingResp).getId());
}
