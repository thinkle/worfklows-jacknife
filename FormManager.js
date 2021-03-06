////////////////////////////////////////////////////
// This file contains code that handles triggers  //
// for forms and approvals                        //
////////////////////////////////////////////////////


///////////////////////////////
// Quick ways to read form fields from
// config files...
////////////////////////////////////////
var FAILURE

function _initFormManager () {
    FAILURE = 'FAILED';
}

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
// key : ?action.value (lookup result from another action)
// key : :function(arg|arg|arg) - or bar separated arguments to a function...
//    functions look like spreadsheet functions... but with or bars instead of commas
//    we support...
//    join(JOINCHAR|ARG2|ARG3)
//    if(COND1|THEN|ELSE)
//    and(COND1|COND2)
//    or(COND1|COND2)
function getValue (val,results,settings,settingKey) {
    switch (val[0]) {
    case '?':
	logNormal('Looking up action! %s:%s',settingKey,val);
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
	return obj
	break;
    case '%':
	// Syntax = %FieldnameFromForm
	val = val.substr(1);
	return results[val]
	break;
    case '@':
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
		return initialResult.map(getResult)
	    }
	    else {
		return getResult(initialResult)
	    }
	}
	break;
    case ':':
	// function!
	var fmatcher = /:([^(]*)\(([^]*)\)/;
	var match = val.match(fmatcher);
	if (!match) {
	    console.log('Error with "function" value: ',val)
	    return val
	}
	else {
	    var fname = match[1]
	    var args = match[2].split('|').map(function (a) {return getValue(a,results,settings,settingKey)});
      Logger.log('Looking at function: %s with args %s',fname,args);
	    switch (fname.toLowerCase()) {
	    case 'if':
            Logger.log('if')
		if (checkBool(args[0])) {
		    return args[1]
		}
		else {
		    return args[2]
		}
		break;
	    case 'or':
            Logger.log('Execute or')
		for (var i=0; i<args.length; i++) {
		    if (checkBool(args[i])) {
			return args[i]
		    }
		}
		return false;
		break;
	    case 'and':
            Logger.log('execute and')
		for (var i=0; i<args.length; i++) {
		    if (!checkBool(args[i])) {return false}
		}
		return args[i-1]; // return last arg -- like an or
		break;
	    case 'join':
            Logger.log('execute join');
		var joinchar = args.shift();
		return args.join(joinchar)
		break;
	    default:
		console.log('Invalid function name: %s',fname);
		return val;
		break;
	    } // end inner switch (functions)
	}
	break;
    default:
	return val;
    } // end switch
}


function lookupFields (settings, results) {
    if (! results) {
	logAlways('No results (%s) handed to lookupFields',results)
    }
    logNormal('lookupFields(%s,%s)',settings,results);
    logVerbose('Starting with settings: %s, results: %s',shortStringify(settings),shortStringify(results));
    var fields = {}
    if (results.FormUser) { fields.FormUser=results.FormUser }
    if (results.Timestamp) { fields.Timestamp = results.Timestamp }
    for (var settingKey in settings) {
      logVerbose('lookupFields "%s"=>"%s"',settingKey,settings[settingKey]);
      var val = settings[settingKey];
      fields[settingKey] = getValue(val,results,settings,settingKey)
      
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
    var numString = ""+n
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
		    var lock = LockService.getScriptLock()
		    try {
			lock.waitLock(240000);
		    }
		    catch (err) {
			emailError('Unable to get lock after 30 seconds ;(',err);
		    }                  
		    var numberMatch = /#+/g
		    var numLength = val.match(numberMatch)[0].length
		    var scriptCache = CacheService.getScriptCache();
		    var lastval = scriptCache.get(val);
		    if (! lastval) {
			var lastval =  PropertiesService.getUserProperties().getProperty(val)
		    }
		    if (lastval) {
			newval = Number(lastval) + 1;
			PropertiesService.getUserProperties().setProperty(val,newval);
			scriptCache.put(val,newval,21600);
			config[key] = val.replace(numberMatch,padNum(newval,numLength))
		    }
		    else {
			// Otherwise, we have to look through all responses after date for highest number
			// then increment...
			var allResponses = form.getResponses(timestampDate);
			//var allResponses = form.getResponses();
			var item = getItemByTitle(form,key);
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
			PropertiesService.getUserProperties().setProperty(val,n);
			scriptCache.put(val,n,21600)
			lock.releaseLock();
		    } // end if
		} // end test for magic incrementing # thingy...
	    } // end test for magic at all
	} 
    } // end for key in config
} // end lookupMagic



/////////////
// Triggers & Such

function getResponse (itemResp) {
    // get our usable response from an item. Usually just the response
    if (itemResp.getItem().getType()=='FILE_UPLOAD') {
	// we get an array of filetypes...
	fileArray = itemResp.getResponse()
	return fileArray.map(
	    function (id) {
		return DriveApp.getFileById(id).getUrl()
	    })
    }
    else {
	return itemResp.getResponse();
    }
}

function getResponseItems (resp, actionResults) {
    var responseItems = {}
    // attach action results so we can act on those as well :)
    if (actionResults) { responseItems.actionResults = actionResults; }
    resp.getItemResponses().forEach(function (itemResp) {
      responseItems[itemResp.getItem().getTitle()]=getResponse(itemResp); // maps oddball types to something more normal
    }) // end forEach itemResp
    responseItems['Timestamp'] = resp.getTimestamp();
    responseItems['FormUser'] = resp.getRespondentEmail();
    logNormal('ResponseItems: >>>'+JSON.stringify(responseItems)+'<<<');
    logNormal('ResponseItems FormUser: >>>'+responseItems.FormUser);
    return responseItems;
}

function listTriggers () {
    var forms = []
    ScriptApp.getProjectTriggers().forEach(
	function (t) {
	    forms.push(t.getTriggerSourceId())
	}
    );
    var masters = {}
    forms.forEach(function (f) {
	var master = PropertiesService.getUserProperties().getProperty(f)
	if (!masters[master]) {masters[master] = []}
	masters[master].push(f)
    });
    return masters
}

function removeTriggers (ss) {
    if (typeof ss === 'string' || ss instanceof String) {
	var ssid = ss;
    }
    else {
        ssid = ss.getId();
    }
    ScriptApp.getProjectTriggers().forEach(function (t) {
        var form = t.getTriggerSourceId();
        var masterConfig = PropertiesService.getUserProperties().getProperty(form);
        if (masterConfig==ssid) {
            console.log('Deleting trigger %s: form %s config %s',
                        t,
                        form,
                        masterConfig);
            ScriptApp.deleteTrigger(t)
        }
    });
}

function setupTriggers (ss) {
    if (typeof ss === 'string' || ss instanceof String) {
	var ss = SpreadsheetApp.openById(ss);
    }
    if (!ss) {
	ss = SpreadsheetApp.getActiveSpreadsheet();
	var conf = getMasterConfig(SpreadsheetApp.getActiveSpreadsheet());
    }
    else {
	conf = getMasterConfig(ss);
    }
    var existingTriggers = listTriggers()[ss.getId()] || [];
    for (var i=1; i<conf.length; i++) {
	var row = conf[i]
	var formId = row['FormID'];
	Logger.log('For form %s',formId);
	if (existingTriggers.indexOf(formId)==-1) {
	    Logger.log('Missing trigger for form %s',formId);
	    createFormTrigger(FormApp.openById(formId),ss);
	}
	else {
	    Logger.log('Trigger already exists for form %s',formId);
	    // Let's make sure it's right though...
	    var controlSheet = PropertiesService.getUserProperties().getProperty(formId);
	    if (controlSheet != ss.getId()) {
		var err =  'Conflicting trigger: each form can only be managed by one control sheet.'
		err += '\n'+'Was '+controlSheet
		err += '\n'+'Shoud be '+ss.getId()
	    }
	}
    }
}

function getFormFromTrigger (source) {
    var form = undefined;  
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
	if (trigger.getUniqueId()==source.triggerUid) {
	    form = FormApp.openById(trigger.getTriggerSourceId());
	    Logger.log('form=%s',form);  
	    success = form;
	}
	else {
	    Logger.log('%s is not the one we want :(',trigger.getUniqueId());
	}
    });
    Logger.log('Got form=%s',form)
    return form
}


function testFormWeirdness () {
    //var id="1FAIpQLSfeCwEnjOTljgGnbZVVif1z6xgMZ30m2v7SAAonZ15fRGCsZQ"
    //Logger.log('Got form %s',FormApp.openById(id));
    var source = {
	triggerUid : 6464680668718090000
    }
    var form = getFormFromTrigger (source);
    Logger.log('Got form %s',form)
}

function fixBrokenEvent (event) {
    // google's event does not work as documented... Let's fix it! 
    // Help from: comment #2 on https://code.google.com/p/google-apps-script-issues/issues/detail?id=4810 
    if (! event.source ) {
	var responseEditUrl = event.response.getEditResponseUrl(); //gets edit response url which includes the form url
	var responseUrl = responseEditUrl.toString().replace(/viewform.*/,''); //returns only the form url
	try {event.source = FormApp.openByUrl(responseUrl); //gets the submitted form id
	    }
	catch (err) {
	    //emailError('Unable to get form for '+responseUrl+' taken from '+responseEditUrl+' in event '+JSON.stringify(event),err);
	    //throw err
	    try {event.source = getFormFromTrigger(event);}
	    catch (err2) {
		emailError('Unable to get form for '+responseUrl+' taken from '+responseEditUrl+' or from trigger in event' + JSON.stringify(event),err2);
		throw err2;
	    }
	}    
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
    Logger.log('onFormSubmitTrigger got event: '+JSON.stringify(event))
    console.info('Got trigger: %s',event)
    console.time('formtrigger');
    event = fixBrokenEvent(event)
    var form = event.source;
    var masterSheetId = PropertiesService.getUserProperties().getProperty(form.getId())
    if (!masterSheetId) {
	throw "No Master Sheet ID associated with form that triggered us ;("
    }  
    var masterSheet = SpreadsheetApp.openById(masterSheetId);
    logNormal('Trigger got Form %s, master sheet %s',form.getId(),masterSheetId);
    // now lookup our configuration information and do our thing...
    var masterConfig = getMasterConfig(masterSheet);
    var formActions = masterConfig.getConfigsForId(form.getId());
    Logger.log('Working with formActions: '+shortStringify(formActions));
    var actionResults = {}
    formActions.forEach(function (actionRow) {
	var action = actionRow.Action;    
	console.info('Completing action: %s',action)
	console.time('Action')
	try {
	    actionResults[action] = triggerActions[action](event,masterSheet,actionRow,actionResults);
	    console.info('Action completed with results: %s',actionResults[action])
	}
	catch (err) {
	    actionResults[action] = FAILURE;
	    emailError('Error on action '+action+
                       '\n event:'+
                       event+
                       '\nmasterSheet: '+
                       masterSheet+
                       '\nactionRow: '+
                       actionRow+
                       '\nactionResults (thus far):'+actionResults, err);
            console.error('Error runnin action from event %s, masterSheet %s',event,masterSheet);
            console.error('row and results were: actionRow %s, actionResults %s',actionRow,actionResults);
	    console.error('Ran into error on action %s: %s\nSTACK:%s',action,err.name,err.stack);
	}
	console.timeEnd('Action')
    }
                       )// end forEach action
    
    // Log this baby...
    console.timeEnd('formtrigger')
    try {
	console.log('Full log: %s',Logger.getLog())
    }
    catch (err) {
	Logger.log('Error logging to console :( %s',err)
    }
    console.info('Done responding to event: %s',event);
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

function randomChoice (arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function testManyTriggers () {
    // PropertiesService.getUserProperties().setProperty('FY16-06-###','32');
    for (var i=1; i<20; i++) {
	Utilities.sleep(1000);
	testIACSApprovalTrigger();        
    };
}

function paragraphify (s) {
    return s + s + s + s + s + s + s + s + s + s;
}

function testSelfApproval () {
    testIACSApprovalTrigger(
	{
	    'Total Cost':'34.43',
	    'Vendor':'ThinkGeek',
	    'Total Type':'Exact Amount',
	    'Request Type':'Purchase Order',
	    'Item Name':'Mouse',
	    'Item Description':'Wireless',
	    'Order Notes':'Need yesterday',
	    'Order Method':'Self-ordered - Invoice to come',
	    'Cost Account Type':'Technology (TH)',
	    'Cost Sub-Account Type':'Operational Cost',
	})
}

function getAllResponseOptions (form,title) {
    var opts = []
    form.getItems().forEach(function (i) {      
	if (i.getTitle()==title) {
	    var mci = i.asMultipleChoiceItem();    
	    mci.getChoices().forEach( function (c) {  
		opts.push(c.getValue());
	    });
	}});
    return opts;
}

function testAllAccounts () {
    
}
function testGetAllResponseOptions () {
    Logger.log('%s',getAllResponseOptions(
	FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM'),
	'Cost Sub-Account Type'
    ));
}

function getIACSOptions () {
    var form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
    var vals = ['Cost Account Type','Cost Sub-Account Type','Total Type','Order Method','Request Type'];
    var opts = {}
    vals.forEach(function (k) {
	opts[k] = getAllResponseOptions(form,k);
    });
    Logger.log('IACS OPTIONS: %s',opts);
    return opts
}

function oneTest () {
    vals = {
	'Total Cost': 0,
	'Total Type': "Exact Amount",
	'Request Type': "Purchase Order",
	'Order Method': "Self-ordered - Receipt or proof of purchase to be provided",
	'Cost Account Type': "Technology (TH)",
	'Cost Sub-Account Type': "Operational Cost",
	'Vendor': "NOT REAL",
	'Item Name': "TEST",
	'Item Description': "TEST DESC",
	'Order Notes': "TEST NOTES",
    }
    testIACSApprovalTrigger(vals);
}

function testAllIACSOptions () {
    throw "Sheet is live, please don't test anymore";https://docs.google.com/spreadsheets/d/1U2MpGDV9RmczNYJ38z4D-5Pps7_wQlhl_CeSdMVhQRk/edit#gid=1254599839
    var allOpts = getIACSOptions()
    for (var key in allOpts) {
	Utilities.sleep(1000);
	Logger.log('Testing %s',key);
	var choices  = allOpts[key];
	choices.forEach(function (c) { 
	    Logger.log('%s=%s',key,c);
	    var vals = {
		'Total Cost': (Math.random() * 1000).toFixed(2),
		'Vendor': randomChoice(["CDW",'Amazon','Staples','WB Mason']),
		'Total Type': randomChoice(allOpts['Total Type']),
		'Request Type': randomChoice(allOpts['Request Type']),
		'Item Name': 'Testing '+key+':'+c,
		'Item Description': paragraphify('Item Desc testing '+key+':'+c),
		'Order Notes': paragraphify("Order Notes: "+key+':'+c),
		'Order Method': randomChoice(allOpts['Order Method']),
		'Cost Account Type': randomChoice(allOpts['Cost Account Type']),
		'Cost Sub-Account Type': randomChoice(allOpts['Cost Sub-Account Type']),
	    }
	    vals[key] = c;
	    testIACSApprovalTrigger(vals);
	    Utilities.sleep(100);
	});
    }
}

function testIACSApprovalTrigger (vals) {
    var form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
    var formResponse = form.createResponse();
    if (! vals) {
	var allOpts = getIACSOptions()
	vals = {
	    'Total Cost': (Math.random() * 1000).toFixed(2),
	    'Total Type': randomChoice(allOpts['Total Type']),
	    'Request Type': randomChoice(allOpts['Request Type']),
	    'Order Method': randomChoice(allOpts['Order Method']),
	    'Cost Account Type': randomChoice(allOpts['Cost Account Type']),
	    'Cost Sub-Account Type': randomChoice(allOpts['Cost Sub-Account Type']),		
	    'Vendor': randomChoice(["CDW",'Amazon','Staples','WB Mason']),
	    'Item Name': randomChoice(["Widget",'Thingy','Whoosywhatsit']),
	    'Item Description': paragraphify(randomChoice(["This is a shiny item and a long sentence.",'Please make sure to get the Extra Fancy variety.','Very nice if you can get it I believe it would be.  '])),
	    'Order Notes': paragraphify("Get quick! If you can, that is. If you cannot, you can perhaps do it slowly. Maybe just buy it this year."),
	}
    }
    items = form.getItems();
    items.forEach(function (item) {
	if (vals.hasOwnProperty(item.getTitle())) {
	    var value = vals[item.getTitle()];
	}
	else {
	    return
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
	    Logger.log('Oh well, no response for: '+shortStringify(item));
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
	    Logger.log('Oh well, no response for: '+shortStringify(item));
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
		Logger.log(shortStringify(allResponses));
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
		Logger.log(shortStringify(allResponses));
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
    Logger.log('GOT Configs: '+shortStringify(getMasterConfig(masterSheet).getConfigsForId('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4')));
}

function testField () {  
    form = FormApp.openById('1o8u9iGIN6e5M9CTOtQNBDjueR-8QSYNHzIQR-EUGv98');
    Logger.log('Form = %s',form.getPublishedUrl());
    
    item  = getItemByTitle(form,'PO Number');
    Logger.log('FOrm %s item %s',form,item);
}

function testMagic () {
    //var form = FormApp.openById('1o8u9iGIN6e5M9CTOtQNBDjueR-8QSYNHzIQR-EUGv98');
    //var form = FormApp.openById('1HXV-wts968j0FqRFTkPYK8giyeSoYz_yjooIL9NqUVM');
    var form = FormApp.openById('1o85hFuoe3c1TlQBn6FFxj6flSPkzOiElODFtgitGnrI');
    config = {
	'PO Number':'*#*FY16-MM-###',
    }
    responses = []
    lookupMagic(config, responses, form);
    Logger.log('Config %s',config);
}

function testLookupField () {
    settings = {
	'TestAt':'@Foo>>Bar',
	'TestDefault':'@Default>>Bar',
	'TestPerc':'%Foo',
	'TestQuest':'?Email.config.To',
	'TestNorm':'Nuttin special',
	'BarLookup':{'Foo':'FooLookedUp',
                 'Boo':'BooLookedUp',
		     'Bar':'LookedUpBar',
		     'Default':'Default?',
		    },
	TestOr: ':or(no|%Foo)',
	TestOrFalse:':or(no|%Empty)',
	TestAnd: ':and(yes|%Foo)',
	TestAndFalse : ':and(yes|%Empty)',
	TestJoin : ':join(,|%Foo|@Foo>>Bar|@Default>>Bar)',
	TestIfIf : ':if(yes|First Thing|Other Thing)',
	TestIfElse : ':if(%Empty|First Thing|Other Thing)',
    }
    result = {
	'Foo':'Boo',
	'Empty':'No',
	'Default':'Nothing to see here',
	'actionResults':{'Email':{'config':{'To':'me@me.me'}}}
    }
    Logger.log('lookupFields=>%s',lookupFields(settings,result))
}

