// Simple interface for reading a table with headers
//
// TableObj(range)
//
// Each row of data then can be accessed via header names OR indices
//
// t = TableObj(range)
// t[1]['Name'] -> returns value of 2nd row in
//                    column with header "Name"
// or
// t[1].Name -> Same diff

function getSheetById (ss, id) {
  if (! ss) {
    throw "No Spreadsheet handed to getSheetById!"
  }
  var sheets = ss.getSheets();
  for (var i=0; i<sheets.length; i++) {
    if (sheets[i].getSheetId()==id) {
      return sheets[i]
    }
    else {
      logVerbose('Oops, '+sheets[i].getSheetId()+'!='+id);
    }
  }
}

function Table (range, idHeader) {
  var values = range.getValues()
  logVerbose('Table(' + JSON.stringify(range) + ')')
  var sheet = range.getSheet()
  var rowOffset = range.getRow()
  var colOffset = range.getColumn()
  var headers = values[0]
  var rowsById = {}
  
  logVerbose('headers=>'+JSON.stringify(headers))  
  
  function processRow (row) {
    //newObj = {'foo':'bar'}
    //logVerbose('processRow('+JSON.stringify(row)+')')
    
//    row.setValue = function (name, val) {
//      var i = headers.indexOf(name)
//      if (! i) {
//        var i = name; // assume we got a number
//        var[name] = headers[i]
//      }
//      var rowNum = values.indexOf(row);
//      var cell = sheet.getRange(rowOffset+rowNum, colOffset+i);
//      cell.setValue(val);
//      row[i] = val;
//    } // end row.setValue
    
    var rowObj = {}
    var rowNum = values.indexOf(row);

    function buildProperties (i, h) { // for closure purposes
      logVerbose('Setting '+h+'->'+i);
      Object.defineProperty(rowObj,
                            h,
                            {
                              'enumerable': true,
                              'set': function(v) {
                                //row[i] = v;
                                var cell = sheet.getRange(Number(rowOffset) + Number(rowNum),Number(colOffset) + Number(i))
                                cell.setValue(v);
                                row[i]=v;
                              },
                              'get': function() {return row[i]}
                            });
      Object.defineProperty(rowObj,
                            i,
                            {
                              'enumerable': true,
                              'set': function(v) {row[i] = v;
                                                  sheet.getRange(rowOffset + rowNum,colOffset + i).setValue(v);
                                                  },
                              'get': function() {return row[i]},
                            }
                              )   
      if (idHeader && h==idHeader) {
        rowsById[row[i]] = rowObj
      }
     }      // end buildProperties
    
    
    for (var i in headers) {
      logVerbose('rowNum='+(Number(rowOffset)+Number(rowNum)))
      logVerbose('colNum='+(Number(colOffset)+Number(i)))    
      var h = headers[i] 
      logVerbose('Set property '+h+' -> '+row[i]);
      buildProperties(i,h)
      logVerbose('Now we have '+rowObj+'.'+h+'=>'+rowObj[h]);
    }    
    
    return rowObj
  } // end processRow
  
  var table = []
  Object.defineProperty(
    table,
    'sheet',
    {'value': sheet, configurable: false, writable: false}
    )
  Object.defineProperty(
    table,
    'range',
    {'value': range, configurable: false, writable: false
    })    
  // process each row into a row object...
  for (var rn in values) {
    table.push(processRow(values[rn]));
  }
  
  table.pushRow = function (data) {
    logVerbose('pushRow got '+JSON.stringify(data))
    var pushArray = []
    for (var key in data) {  
      if (data.hasOwnProperty(key)) {
      logVerbose('look at key: '+key);
      logVerbose('Number(key)=>'+JSON.stringify(Number(key)))
      if (isNaN(Number(key))) {
        logVerbose('Stringy key: '+key);        
        var i = headers.indexOf(key);
        if (i > -1) {
          logVerbose('Converts to i='+i);
          pushArray[i] = spreadsheetify(data[key]) // set to the integer...          
        }
      }
      else {
        logVerbose('Numerical key: '+key);
        // Otherwise we're looking at a numerical key...
        pushArray[key] = spreadsheetify(data[key])
      } 
    }
    } // end for    
    // Now that we've created our data, let's push ourselves onto the spreadsheet...
    if (! pushArray[headers.length-1]) {
      pushArray[headers.length-1] = ""; // extend array to proper length...
    }
    //cell = sheet.getRange(rowOffset+values.length,colOffset,1,headers.length)
		var appendRow = [];
		for (var i=1; i<colOffset; i++) {
			appendRow.push(''); // pad beginning of array...
		}
		appendRow = appendRow.concat(pushArray);
    logVerbose('New values = '+shortStringify(pushArray));
    //cell.setValues([pushArray]); // push to sheet...
		sheet.appendRow(appendRow);
    values.push(pushArray); // push to array
    table.push(processRow(pushArray));
  } // end values.pushRow

	table.hasRow = function (id) {
		return rowsById.hasOwnProperty(id)
	}

    table.getRow = function (id) {
      return rowsById[id];
    }
    
  table.updateRow = function (data) {
    var id = data[idHeader]
    if (rowsById.hasOwnProperty(id)) {
			var lock = LockService.getScriptLock()
			try {
				lock.waitLock(240000);
				var row = rowsById[id];
				for (var prop in data) {
					if (data.hasOwnProperty(prop) && row.hasOwnProperty(prop)) {  
						if (data[prop] !== undefined) {
							row[prop] = data[prop]
						}
					}
				}
			}
			catch (err) {
				emailError('Error during table write',err);
			}
			finally {
				lock.releaseLock();
			}
    }
    else {
      table.pushRow(data)
    }
  }
  
  table.headers = headers;
  
  return table;
}

function spreadsheetify (value) {
	if (Array.isArray(value)) {
		return value.map(function (o) {return spreadsheetify(o)}).join(", ");
	}
	if (typeof value == 'object') {
		return JSON.stringify(value)
	}
	if (typeof value == 'undefined') {
		return ''
	}
	if (typeof value == 'boolean') {
		if (value) {return 1}
		else {return 0}
	}
	else {
		return value;
	}
}

function testTableWithIDs () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk') 
    var sheet = getSheetById(ss,'98430562')  
    var table = Table(sheet.getDataRange(),'ID');
  table.updateRow({'ID':78,'Name':'Merwin','Age':105})
  table.updateRow({'ID':3,'Name':'Clara-boo','Age':6})
}

function testTable () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk')  
  var sheet = getSheetById(ss,'573504329')  
  //var sheet = ss.getSheetByName("testGrid");
  var table = Table(sheet.getDataRange())
  logNormal('Table length is : '+table.length);
  logNormal('Table row 1: '+table[1].First+' '+table[1].Last)
  logNormal('Table row 1: '+table[1][0]+' '+table[1][1])
  logNormal('Got table '+shortStringify(table))
  table[1]['Last'] = 'Sayre'
  table[2]['Last'] = 'Hinkle'
  table[3]['Last']='Holy Shit It Worked'
  table.pushRow(['Jon','Churchill',42])  
  table.pushRow({'Last':'Gross','First':"Terry",'Age':'Unknown'})
	table.pushRow({'Last':'Clifford','First':"Stephen",'Age':'42','Extra':'Stuff','What':'Happens?'})
    table[5]['Age'] = '28'
  logNormal('Table length is now: '+table.length)
}
