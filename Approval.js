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

function checkForApprovals (form, logsheet) {
	var allResponses = form.getResponses();
	var logTable = Table(logsheet, 'OriginalResponseId');
	var fixed = []
	allResponses.forEach (function (resp) {
		var respId = resp.getId();
		if (! logTable.hasRow(respId)) {
			// We don't have the row! We better do this thing...
			Logger.log('Do this thing! '+respId+' '+resp);
			//
		}
	}); // end forEach resp
}

function approvalOnTimerCleanup () {
}
