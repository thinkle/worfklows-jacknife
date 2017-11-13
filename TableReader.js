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

/** Return a sheet given ID. 
 * @param {Spreadsheet} spreadsheet - the Spreadsheet Object
 * @param {string} id - the ID of the sheet 
 * This implements a missing method in the google API
 * which supports only getting sheets by name.
 */
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

/** @classdesc
 * Create an Table object representation of a range that can
 * be looped through, assigned to, etc. in a natural way.
 * 
 * Range needs to have unique headers for header based 
 * assignment to work properly
 * 
 * 
 * Usage: 
 * 
 *     var t = Table(range)
 *     t[1].Name -> Return value of column "Name" in second row
 *     t[1].Name = 'New Name' // supports assignment (writes to spreadsheet)
 *     t.forEach(function (row) { 
 *         // do something with row.Name, etc...
 *     }
 * 
 * _WARNING_: you cannot simply push to the table array.
 * To add new content, use:
 * 
 * t.pushRow(ROW) to add content either via object or array.
 * 
 * OR, with IDs, we can be a bit fancier...
 * 
 * Imagine we have a range of a spreadsheet referring to nutritional info
 * indexed by a column "Food"
 * 
 *     t = Table(range,'Food') /??? Does this actually work this way
 *     t.Apple.Calories = 80 // write to row w/ Food "Apple" in column "Calories"
 *     t.Apple.Fiber = 40 // write to row w/ Food "Apple" column "Fiber"
 *
 * Or...
 * row = t.update({Food:'Banana',calories:100,fiber:10})
 * 
 * 
 * @constructor
 * @param range {Range} - the range we are reprsenting.
 * @param {string} idHeader - name of the column header which
 * represents a unique ID. If we have such a header, we support
 * updating tables by ID.
 */
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
	    if (rowObj.hasOwnProperty(h)) {
		console.log('Ignore duplicate column: %s (col %s). %s will refer to the first column by that name.',h,i,h);
		return
	    }
	    Object.defineProperty(rowObj,
				  h,
				  {
				      'enumerable': true,
				      'set': function(v) {
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

    /** @method Table.pushRow 
    * @desc 
    * Add a row to our table.
    * 
    * Return updated row.
    *
    * *Note: we have to use this method to append to our table if we want our
    * magic to keep working. Simply pushing to the table with Table.push will
    * fail to update the sheet*
    *
    * @param data (object) - an object containing k:v pairs for our table.
    * where k is a column header or an integer column number (0-indexed)
    * 
    */
    table.pushRow = function (data) {
	logVerbose('pushRow got '+JSON.stringify(data))
	var pushArray = []
	for (var i=0; i<headers.length; i++) {pushArray.push('')}
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

    /**  @method Table.hasRow
    *
    * @param id - value of ID column
    * Return True if we have this row
    */
    table.hasRow = function (id) {
	return rowsById.hasOwnProperty(id)
    }

    /** @method Table.getRow
     *
     * @param id - value of ID column
     * Return the row identified by id.
     */
    table.getRow = function (id) {
	return rowsById[id];
    }

    /** @method Table.updateRow 
    * @param data - k:v data for row in table.
    * Update a row based on data. Table must have an 
    * id column and data must have that column as well.
    * Return updated row if successful; false if we encounter an error.
    */
    table.updateRow = function (data) {
	var id = data[idHeader]; var success
	if (rowsById.hasOwnProperty(id)) {
	    var lock = LockService.getScriptLock()
	    try {
		lock.waitLock(240000);
		var row = rowsById[id];
		//console.log('Updating table row %s with %s',row,data);
		for (var prop in data) {
		    if (data.hasOwnProperty(prop) && row.hasOwnProperty(prop)) {
			if (data[prop]===undefined) {
			    //Logger.log('Undefined value :( %s',prop);
			    row[prop] = ''
			}
			else {
			    row[prop] = data[prop]
			}
			//if (data[prop] !== undefined) {
			//row[prop] = data[prop]
			//}
		    }
		}
		success = true;
	    }
	    catch (err) {
		emailError('Error during table write',err);
	    }
	    finally {
		lock.releaseLock();
		if (success) {
		    return row
		}
		else {
		    return false;
		}
	    }
	}
	else {
	    return table.pushRow(data)
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

dupTest = Test ({
    metadata : {name:'Test Handling of Duplicate Columns'},
    setup : function (p) {
	p.ss = p.getScratchSS();
	p.ss.getActiveSheet().clear();
	[['h1','h2','h1','h3'], // duplicate h1
	 [1,2,3,4],
	 [2,3,4,5],
	 [3,4,5,6,]].forEach(function (r) {
	     p.ss.appendRow(r)
	 })},
    
    test : function (p) {
	var t = Table(p.ss.getActiveSheet().getDataRange());
	// Succeed with pushing row
	t.pushRow({h1:4,h2:7,h3:9});
	Logger.log('Got: %s',t[1].h1)
	assertEq(t[1].h1, 1) // first column value should win, not second
	assertEq(t[4][0],4) // we pushed to the first column
	assertEq(t[4][2],undefined) // we have a blank third column
    }
})

updateTest=  Test( {
    metadata : {name :'Test Table pushRow and updateRow'},
    setup : function (p) {
	p.ss = p.getScratchSS();
	[['ID','Name','Number','Foo','Bar'],
	 [1,'Tom',82,'asdf','owiaeru'],
	 [2,'Dick',82,'asdfqqq','zzz'],
	 [3,'Harry',82,'asdfasdf','iii'],
	 [4,'Falsey',false,true,'bar bar bar '],
	].forEach(function (r) {p.ss.appendRow(r)});
    },
    test : function (p) {
	var t = Table(p.ss.getActiveSheet().getDataRange(),'ID');
	t.updateRow({ID:1,Name:'Mary','Foo':false,Bar:'',Number:77});
	t.updateRow({ID:2,Name:'Fred','Foo':undefined,Bar:false,Number:-72.123});
	t.pushRow({ID:27,Name:"Foo",Bar:undefined,Foo:false});
	// access in straight row/col fashion for test...
	var newT = Table(p.ss.getActiveSheet().getDataRange());
	assertEq(newT[1].Name,'Mary')
	assertEq(newT[1].Foo,false)
	assertEq(newT[2].Name,'Fred')
	assertEq(newT[2].Foo,'')
	assertEq(newT[2].Number,-72.123)
	assertEq(newT[5].Name,'Foo')
	assertEq(newT[5].Number,'')
	assertEq(newT[5].ID,27)
	assertEq(newT[5].Foo,false)
	//t.updateRow({ID:3,Number:17});
	return {url:p.ss.getUrl()}
    },
})

function doUpdateTest () {
    updateTest.solo();
}

function doDupTest () {
    dupTest.solo();
}
