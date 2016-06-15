function handleMagicSettings (settings) {
}


function createLogHeaderRow (form) {
  row = []
  //form = FormApp.openById() // Comment me
  form.getItems().forEach( function (item) {        
    row.push(item.getTitle())
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
    var headers = logSheet.getRange(1,1,1,logSheet.getLastColumn())
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