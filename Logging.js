function handleMagicSettings (settings) {
	// Where we allow magic syntax for magical things :)
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
    var headers = logSheet.getRange(1,1,1,
																		logSheet.getLastColumn())
    headers.forEach( function (i) {
      if (getItemByTitle(form,i)) {
        configOptions[i]='%'+i;
      }
      else {
        configOptions[i]=''
      }
    })
  } // end pre-existing sheet set-up
	// Set up ID and Spreadsheet options
	configOptions['SheetId'] = logSheet.getSheetId()
	configOptions['SpreadsheetId'] = logSheet.getParent().getId()
  return configOptions
}
