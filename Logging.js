function logEvent (configTable, event, actionResults, extraConfig) {
    // DEBUG CODE
    //msg = 'logEvent('+JSON.stringify(configTable)+','+JSON.stringify(event)+',';
    //msg += JSON.stringify(actionResults)+','+JSON.stringify(extraConfig)+')';
    //emailError (msg, "NO ERROR",{'subject':'logEvent debug info'})
    // END DEBUG CODE
    var settings = lookupFields(configTable,getResponseItems(event.response, actionResults));	
    settings.Triggers = {};
    for (var key in actionResults) {
	settings[key+'Action'] = actionResults[key]
	settings.Triggers[key] = actionResults[key]
    }
    for (var key in extraConfig) {
	settings[key] = extraConfig[key];
    }
    settings.ResponseId = event.response.getId()
    try {
	var sheet = getSheetById(SpreadsheetApp.openById(settings.SpreadsheetId),settings.SheetId);
    }
    catch (err) {
	emailError('Unable to fetch sheet '+settings.SpreadsheetId+' + '+settings.SheetId,
		   err)
	throw err;
    }
    var idCol = configTable.idCol ? configTable.idCol : undefined
    var table = Table(sheet.getDataRange(),idCol);
    //Logger.log('Updating row with %s',shortStringify(settings));
    //emailError('logEvent updating table '+shortStringify(table)+'row with settings: '+shortStringify(settings),'No error'); // DEBUG
    try {
	table.updateRow(settings) // we just push our settings -- the set up of the table then becomes the key...
    }
    catch (err) {
      emailError('Error updating '+settings.SpreadsheetId+' with '+JSON.stringify(settings), err);
	throw err;
  }
  return settings
}

function createLogHeaderRow (form) {
  row = ['ResponseId','Timestamp']
	ignoreTypes = [FormApp.ItemType.SECTION_HEADER,
								 FormApp.ItemType.PAGE_BREAK]
  //form = FormApp.openById() // Comment me
  form.getItems().forEach( function (item) {
		if (ignoreTypes.indexOf(item.getType()) == -1) {
			if (row.indexOf(item.getTitle()) == -1) {
				// Don't add duplicate header names.
				// We assume that duplicate names are part of
				// multi-page flows that are intended to provide
				// one field value from two different points in a
				// flow through a form as part of a UI
				row.push(item.getTitle());
			}
		}
  }) // end forEach item
  return row
}

function setupLoggingSheet (form, logSheet) {
  var configOptions = {
  }
  if (! logSheet) {    
    var spreadsheet = SpreadsheetApp.create("Log");
    var logSheet = spreadsheet.getActiveSheet();
    var headerRow = createLogHeaderRow(form)
    headerRow.forEach(function (r) {configOptions[r]='%'+r});
    logSheet.appendRow(headerRow)
  } // end new-sheet set-up
  else {
    // If there is an existing sheet... grab the first row...
    logSheet = SpreadsheetApp.getActiveSheet() // comment me
    var headers = logSheet.getRange(1,1,1,logSheet.getLastColumn());
    headers.forEach( function (i) {
      if (getItemByTitle(form,i)) {
        configOptions[i]='%'+i;
      }
      else {
        configOptions[i]='';
      }
    })
  } // end pre-existing sheet set-up
	// Set up ID and Spreadsheet options
	configOptions['SheetId'] = logSheet.getSheetId();
	configOptions['SpreadsheetId'] = logSheet.getParent().getId();
  return configOptions
}


function testLog () {
  fakeEvent = {    
    response : {
      getItemResponses : function () { return [
        {getItem : function () { return {getTitle : function () { return 'Test Item'}}},
         getResponse : function () {return 'testValue'},
        }
      ]},
      getTimestamp : function () { return new Date() },
      getRespondentEmail : function () { return 'thinkle+responder@innovationcharter.org'},
      getId : function () { 
      //  return (Math.random()*100000).toFixed(0); 
        return 79722
      },
    }
  }
  configTable = {    
    'TestLookup':'%Test Item',
    'SpreadsheetId':'1dJZALNnN86MIt2UIXhpoq7Gd2oFuHMqxKY2-763LSEI',
    'SheetId':'0',
    'idCol':'ResponseId',
  }
  extraConfig = {'Foo':'Bear'}
  actionResults = {}
  logEvent(configTable,fakeEvent,actionResults,extraConfig);
}

function testIDWackiness () {
	var ss = SpreadsheetApp.openById('1U2MpGDV9RmczNYJ38z4D-5Pps7_wQlhl_CeSdMVhQRk');
	var sheet = ss.getActiveSheet();
	var table = Table(sheet.getDataRange(),'ResponseId');
	table.updateRow(
		{'ResponseId':'2_ABaOnufyOAOCS9OEtiO00cDjpvhAQhEM_QnLrAFMJAdHoBX7koD3EugQGjG0pQ',
		 'Signature':'Test Update From Script!'}
	);
}
