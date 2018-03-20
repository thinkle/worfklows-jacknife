/////////////////////////////////
// Form2Form Stuff for Approval Forms
///////////////////////////////////

var supported_approval_field_types
var approvalTest, approvalApprovedTest

function _initApproval () {
    supported_approval_field_types = [
        'TEXT','PARAGRAPH_TEXT','MULTIPLE_CHOICE','LIST','DATETIME','DATE','PAGE_BREAK',
    ]
}

function _initZZTestsApproval () {
    approvalTest = Test({
        metadata : {name : 'Test Approval Request'},
        test : function () {resubmitForm('1WGKg3jEmRI4oGZIh1TfAEW4H8AlzNtttAEbWfEo989s',1)}     // this will be live soon -- change before we go to production FIXME
    })
    approvalApprovedTest = Test({
        metadata : {name : 'Test Approved Approval'},
        test : function () {resubmitForm('1lVauucfWhU57sU_PVUY0j2oFcmBAbUTHnJVDLuyT0Tk',1)} // this will be live soon - change before we go into production
    });
}


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
        go_on = false; isNumber = false; isDate = false;
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
	if (item.getType() == 'LIST') {
	    item = item.asListItem();
	    go_on = true;
	}
        if (item.getType()== 'SCALE') {
            item = item.asScaleItem();
            go_on = true;
            isNumber = true;
        }
	if (item.getType()=='DATETIME') {
	    item = item.asDateTimeItem();
	    go_on = true;
	    isNumber = false;
	    isDate = true;
	}
	if (item.getType()=='DATE') {
	    item = item.asDateItem();
	    go_on = true;
	    isNumber = false;
	    isDate = true;
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
		if (isDate) {
		    value = toFormDate(value);
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
    // Check for collecting email address...
    // Not yet... 
    submittedFormResponse = formResponse.submit()  
    edit_url = submittedFormResponse.getEditResponseUrl();  
    edit2_url = params.targetForm.getResponse(submittedFormResponse.getId()).getEditResponseUrl();
    var lastRespNo = allResponses.length - 1;
    var lastResp = allResponses[lastRespNo]
    var newEditUrl = lastResp.getEditResponseUrl();
    console.log('Three edit URLs: the one from our form object: %s and the one from our last object %s and finally the probably right one: %s',edit_url,newEditUrl,edit2_url);
    return {'edit_url':edit2_url,
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
        Logger.log('conf: '+shortStringify(conf));
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
        Logger.log('conf: '+shortStringify(conf));
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
	var respId2 = form.getResponse(respId).getId()
        //form.getResponse(resp.getId()).getId())
	if (! logTable.hasRow(respId) && ! logTable.hasRow(respId2) ) {
	    // We don't have the row! We better do this thing...
            logNormal('Do this thing! '+respId+' or '+respId2+' '+resp);
	    //foo = y + 7 + 23;
	    //
	    fakeEvent = {
		'source':form,
		'response':resp,
	    }
	    logNormal('checkForApprovals triggering fakeEvent: %s',fakeEvent);
	    //onFormSubmitTrigger(fakeEvent);
	}
	else {
	    //logNormal('checkForApprovals found perfectly good row: %s',respId);
	}
    }); // end forEach resp
}

function approvalOnTimerCleanup () {
    Logger.log('approvalOnTimerCleanup')
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
        logNormal('approvalonTimer looking at form: %s',fs);
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
	masterConfig.getConfigsForId(fs).forEach( function (row,i) {
	    if (row.Action=='Approval') {
		Logger.log('Checking approvals at config: %s',i)
		checkParam(row.Config3,'SpreadsheetId',SPREADSHEETID);
		checkParam(row.Config3,'SheetId',IS_DEFINED);
		logSS = SpreadsheetApp.openById(row['Config3'].table.SpreadsheetId);
		logSheet = getSheetById(logSS, row['Config3'].table.SheetId);
		console.log('Checking for approvals with sheets: %s, %s',logSS, logSheet);
		//console.log('Working with config: %s',row['Config3'].table)
		checkForApprovals(FormApp.openById(fs),logSheet);
	    }
	});
    }) // end forEach formSource
}

function approvedApprovalOnTimerCleanup () {
    // Custom IACS Method -- unlikely to help anyone else :(
    Logger.log('approvedApprovalOnTimerCleanup')
    var masterSheet = SpreadsheetApp.openById('10yauqDvNnG2iQwoaIWbRs_3HKVJkYcx0HK3MRCL2bRE');
    var masterConfig = getMasterConfig(masterSheet);
    var form = FormApp.openById('1o85hFuoe3c1TlQBn6FFxj6flSPkzOiElODFtgitGnrI');
    var logSheet = getSheetById(SpreadsheetApp.openById('1U2MpGDV9RmczNYJ38z4D-5Pps7_wQlhl_CeSdMVhQRk'),'0');
    var logTable = Table(logSheet.getDataRange(),'PO#');
    var byPO = false
    function getByPO () { // only do if needed
	var byPO = {}
	logTable.forEach(function (r) {
	    byPO[r['PO#']] = r
	});
	return byPO
    }
    var poItem = getItemByTitle(form,'PO Number')
    form.getResponses().forEach(function (resp) {
        Logger.log('Looking at response: '+resp);
	var respId = resp.getId()
	var respId2 = form.getResponse(respId).getId()
	if (! logTable.hasRow(respId) && ! logTable.hasRow(respId2)) {
	    // Now check for another corner case -- it's possible we have the PO# but not the ID
	    // in which case it's likely that someone used my form-submitter to do a bulk approval
	    // of these.
	    if (! byPO) { byPO = getByPO()}
	    var poNum = resp.getResponseForItem(poItem).getResponse()
	    if (! byPO.hasOwnProperty(poNum)) {
		// Weird -- it seems we really truly don't have this one.
		// Let's kick it off manually
		fakeEvent = {
		    'source':form,
		    'response':resp,
		}
		onFormSubmitTrigger(fakeEvent);
	    }
	}
    }); // end forEach response
} // end approvedApprovalTimerCleanup

function listProps () {
    var allProps = PropertiesService.getUserProperties().getProperties();  
    for (var key in allProps) {Logger.log('%s:%s',key,allProps[key]);}
    
}


// NOTE: For reasons that don't make sense to me, google forms treats dates as
// if they had no time zone information attached :(
// 
// So, we have to get the date out, which will have timezone, then adjust it, as if
// we were in GMT, then feed that date object back to createResponse
function toFormDate (timeString) {  
    timeString = timeString.replace(/-/g,"/");
    var d = new Date(timeString);
    var offset = new Date(timeString).getTimezoneOffset();
    function addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes*60000);
    }    
    return addMinutes(d,offset*-1);
} 


function startoverProp () {
    PropertiesService.getUserProperties().deleteProperty('FY16-06-###');
    var scriptCache = CacheService.getScriptCache();
    scriptCache.remove('FY16-06-###');
}

function getUnapprovedItems (approvalForm, approvalSettings, user, after) {
    Logger.log('getUnapproved items for form: %s',approvalForm);
    Logger.log('Looking at fields: %s',approvalSettings.Config1.table.toFields);
    Logger.log('Approval form = %s',approvalSettings.Config1.table['Approval Form ID']);
    var approvalForm = FormApp.openById(approvalSettings.Config1.table['Approval Form ID'])
    var itemsToCheck = approvalSettings.Config1.table.toFields.map(function (f) {return getItemByTitle(approvalForm,f)})
    var idItem = getItemByTitle(
	approvalForm,
	approvalSettings.Config1.table.idField
    );
    var approverItem = getItemByTitle(
        approvalForm,
        'Approver'
    );
    Logger.log('From %s we are checking %s',approvalSettings.Config1.table.toFields,
               itemsToCheck);
    var respById = {}
    var forUserCount = 0; totalCount = 0;
    if (after) {
        var responses = approvalForm.getResponses(after)
    }
    else {
        var responses = approvalForm.getResponses();
    }
    responses.map(function (r) {
        totalCount += 1;
        var approver = r.getResponseForItem(approverItem) && r.getResponseForItem(approverItem).getResponse();
        // DEBUG
        if (totalCount < 10) {
            Logger.log('ITEM %s, APPROVER: %s',totalCount,approver);
            Logger.log('Approver item: %s',approverItem);
        }
        // END DEBUG

        if (approver != user) {return} // skip if the user is no match
        forUserCount += 1
	var iresp = r.getResponseForItem(idItem);
	if (iresp) {
	    if (respById.hasOwnProperty(iresp.getResponse())) {
		Logger.log('Duplicate ID: %s',iresp.getResponse());
	    }
	    respById[iresp.getResponse()] = r; // we keep the second one :)
	}
    });
    Logger.log('USER %s has %s of %s ITEMS TOTAL',user,forUserCount,totalCount);
    var unapproved = []
    for (var rid in respById) { // loop through responses...
	var r = respById[rid]
	var anyBlank = false
	for (var i=0; i<itemsToCheck.length; i++) {
	    if (itemsToCheck[i]) {
		var itemresp = r.getResponseForItem(itemsToCheck[i])
		if (!itemresp || !itemresp.getResponse()) {
		    //Logger.log('No response for: %s',approvalSettings.Config1.table.toFields[i]);
		    anyBlank = true;
		}  
	    }
	}
	if (anyBlank) { unapproved.push(r) }
    }
    Logger.log('We have %s unapproved form responses',unapproved.length);
    if (unapproved.length) {
        Logger.log('For example: %s',unapproved[0].getEditResponseUrl());
        Logger.log('and also: %s',unapproved[unapproved.length-1].getEditResponseUrl())
    }
    return unapproved;
}

function getUnapprovedItemsFromMaster (user, ssid, after) {
    var mcfg = getMasterConfig(SpreadsheetApp.openById(ssid));
    var approvals = []
    mcfg.forEach(function (cfg) {
        if (cfg.Action=='Approval') {
            approvals.push.apply(approvals,getUnapprovedItems(cfg.Form,mcfg.getConfigsForRow(cfg),user,after));
        }
    });
    return approvals
}

function getUnapproved (ssid, daysAgo) {
    if (daysAgo) {
        var now = new Date().getTime();
        var weeksAgo = 3;
        var oldestTimeWeCareAbout = new Date(now-1000*60*60*24*daysAgo)
    }
    return getUnapprovedItemsFromMaster(
        Session.getActiveUser().getEmail(),
        ssid,
        daysAgo && oldestTimeWeCareAbout
    ).map(formResponseToJSON)
}

function formResponseToJSON (fr) {
    var obj  = {
        id : fr.getId(),
    }
    fr.getItemResponses().forEach(
        function (ir) {
            obj[ir.getItem().getTitle()] = ir.getResponse();
        }
    );
    return obj
}

function approveItems (fid, responseIds, approvalValues) {
    var form = FormApp.openById(fid)
    responseIds.forEach(function (rid) {
        var response = form.getResponse(rid);
        var responses = formResponseToJSON(response);
        for (var key in approvalValues) {
            responses[key] = approvalValues[key];
        }
        Logger.log('Pushed response: %s',preFillApprovalForm(
            {
                targetForm : form,
                responseItems : responses,
                field2field : {},
            }
        ));
    });
}

function testApproveItems () {
    form = FormApp.openById(
        '1pgtky1vVNg8bESxlAh2wOs2aY84S5d163nwgmq4A_ow'
    );
    items = [form.getResponses()[0].getId()]
    Logger.log('To begin with, our form has %s responses',form.getResponses().length);
    approveItems(
        '1pgtky1vVNg8bESxlAh2wOs2aY84S5d163nwgmq4A_ow',
        items,
        {'Signature':'Test signature from the bots!'}
    )
    Logger.log('Post approval, our form has %s responses',form.getResponses().length);
}

function testUnapprovedItems () {
    ssid = '1YECCtTGxgpMo-aO_VIszvzJmJAA18qlWsF0Rov3OYqU';
    Logger.log('Got %s',getUnapprovedItemsFromMaster('thinkle@innovationcharter.org',ssid).map(formResponseToJSON));
  // mcfg = getMasterConfig(SpreadsheetApp.openById(ssid));
  // approvals = []
  // mcfg.forEach(function (cfg) {
  //   if (cfg.Action=='Approval') {
  //     Logger.log('Approval form: %s',cfg.Form)
  //     getUnapprovedItems(cfg.Form,mcfg.getConfigsForRow(cfg));
  //   }
  // });  
}


function testWeirdness () {
    form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
    existingResp = '2_ABaOnucOVov0flUTCRKnY938U4Qw3q3lEFKd3QYkY_gNFHOcSrn5TO1ZmUz9q0o'
    Logger.log('existing id=>%s',form.getResponse(existingResp).getId());   
    missingResp = 'ChMzMDQxODYzNjc5OTk2MjI3MzUzEOaJ4oW8yJGLjwE'
    Logger.log('missing id=>%s',form.getResponse(missingResp).getId());
}


function runApprovalTrigger () {
    approvalTest.solo()
}


function runApprovedApprovalTrigger () {
    approvalApprovedTest.solo();
}

