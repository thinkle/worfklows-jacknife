// Simple interface for handling our configuration sheets.
// The configuration sheets are a bit of an unusual format. 
//
// The first two columns are for simple key->value pairs
//
// A     |      B
// KEY   ->   VAL
// KEY   ->   VAL
// KEY   ->   VAL
//
// Repeated keys are not checked for but are not advised -- the later key
// will wipe out the earlier one.
//
// Columns 3 on are used for list-values, with the orientation changing as follows:
//
// C   |   D   |  E  | ...
// KEY |  KEY  | KEY | ...
// VAL |  VAL  | VAL | ...
// VAL |  VAL  | VAL | ...
// VAL |  VAL  | VAL | ...
// VAL |  VAL  | VAL | ...
//
//
// If the column names here contain Key and Value, then we create additional
// Dictionaries with the name...
//
// FooKey | FooVal
// KEY    | VAL
// KEY    | VAL
//
// Will produce...
//
// {FooKey : [KEY, KEY, ...],
//  FooVal : [VAL, VAL, ...],
//  FooLookup : {KEY : VAL, KEY : VAL}
//  }
// 
// The key object here is ConfigurationSheet, used as follows
//
// cs = ConfigurationSheet( sheet )
// var table = cs.loadConfigurationTable()
// // table is a simple lookup containing either the single
// // items or the list of items:
// // 
// // {k:v, k:v, k:v, k:[v,v,v,v], k:[v,v,v,v]}
//
// // Updated values can be written with...
// cs.writeConfigurationTable(table)
//
// Note: the master spreadsheet contains the following...
//
// Form 1 - Action - Configuration 1 - Configuration 2 - Configuration 3 - Configuration 4...
// 

function getSheetById (ss, id) {
  var sheets = ss.getSheets()
  for (var i=0; i<sheets.length; i++) {
    if (sheets[i].getSheetId()==id) {
      return sheets[i]
    }
    else {
      Logger.log('Oops, '+sheets[i].getSheetId()+'!='+id);
    }
  }  
}

function getConfigurationSheetById (ssID, sheetID, settings) {
  if (! ssID.getSheets) { // Handle case where we get handed a SS obj.
    Logger.log('Grabbing sheet from ID: '+ssID+' obj: '+shortStringify(ssID));
    var ss = SpreadsheetApp.openById(ssID);
  }
  else{
    var ss = ssID
  }
  var sheet = getSheetById(ss, sheetID);
  if (sheet) {
    logVerbose('Got sheet '+shortStringify(sheet))
    return ConfigurationSheet(sheet, settings) 
  }
  else {
    throw 'Did not find sheet'+ss+sheetID
  }
}

COLORS = {
  'key' : {'even' : {'fg' : '#ffffff',
                     'bg': '#283593'},
           'odd' : {'fg': '#E8EAF6',
                    'bg' : '#303F9F'},
          },
  'val' : {'even': {'fg':'#1A237E',
                    'bg':'#FFECB3'},
           'odd': {'fg':'#1A237E',
                   'bg':'#FFF8E1'},
          },
  'lkey' : {'odd' : {'fg' : '#F5F5F5',
                     'bg': '#212121'},
						'even' : {'fg': '#E0E0E0',
											'bg' : '#424242'},
           },
  'lval' : {'even': {'fg':'#424242',
                     'bg':'#F5F5F5'},
						'odd': {'fg':'#212121',
										'bg':'#E0E0E0'},
           },           
}


function formatKeys (sheet, i) {    
  var keyc = i % 2 ? COLORS.key.even : COLORS.key.odd;
  var valc = i % 2 ? COLORS.val.even : COLORS.val.odd;
  var key = sheet.getRange(i,1,1,1)
  logVerbose('Setting key: '+keyc.fg+' on '+keyc.bg);
  key.setFontColor(keyc.fg); key.setBackground(keyc.bg);
  key.setFontWeight('bold');key.setFontStyle('normal');
  var val = sheet.getRange(i,2,1,1)
  logVerbose('Setting val: '+valc.fg+' on '+valc.bg);
  val.setFontColor(valc.fg); val.setBackground(valc.bg);
  val.setFontWeight('normal');val.setFontStyle('italic');  
}

function formatLKeys (sheet, colnum) {
  var keyc = colnum % 2 ? COLORS.lkey.even : COLORS.lkey.odd;
  var valc = colnum % 2 ? COLORS.lval.even : COLORS.lval.odd;  
  var key = sheet.getRange(1,colnum,1,1)
  key.setFontColor(keyc.fg); key.setBackground(keyc.bg);  
  key.setFontWeight('bold');key.setFontStyle('normal');
  var rows = sheet.getLastRow();
  var val = sheet.getRange(2,colnum,rows-1,1);
  val.setFontColor(valc.fg); val.setBackground(valc.bg);
  val.setFontWeight('normal'); val.setFontStyle('italic');
}

function ConfigurationSheet (sheet, settings) {
  
  function overwriteConfiguration (keyValues, listValues) {
    sheet.clear();
    for (var k in keyValues) {
      if (keyValues.hasOwnProperty(k)) {
        var v = keyValues[k];
        //logVerbose('Pushing row: '+k+'=>'+v);
        sheet.appendRow([k,v]);
        // Now format the sheet...
        formatKeys(sheet,sheet.getLastRow())
        
      }
    } // en for each key
    
    // Now handle list values...
    var column = 3; 
    for (var k in listValues) {
      //logVerbose('Pushing list of values for: '+k);
      if (listValues.hasOwnProperty(k)) {
        var v = listValues[k];
        sheet.getRange(1,column,1,1).setValue(k);
        for (var i in v) {
          // push each item in list...          
          var val = v[i];
          logVerbose('Pushing value: '+val);
          logVerbose('push list item '+i+' '+val+' into row '+(i+2)+' column '+column)
          sheet.getRange((Number(i)+2),column,1,1).setValue(val);
        }      
        formatLKeys(sheet,column);
        column += 1; // increment
      } // end if
    } // end for loop     
    sheet.getDataRange().setWrap(true);
  } // end overwriteConfiguration
  
  function overwriteConfigurationTable (table) {
    keyValues = {}
    listValues = {}
    for (var key in table) {
      if (table.hasOwnProperty(key)) {
        var value = table[key];
        if (Array.isArray(value)) {
          listValues[key] = value;
        }        
        else {
          keyValues[key] = value;
        }
      }
    }
    overwriteConfiguration(keyValues, listValues);
  }
  
  function getConfigurationTable () {
    var keyValues = sheet.getRange(1,1,sheet.getLastRow(),2).getValues()
    logVerbose('working with keyValues='+shortStringify(keyValues));
    var data = {}
    for (var r=0; r<keyValues.length; r++) {
      var row = keyValues[r]
      // warning -- if a value is duplicated, only the second value counts
      data[row[0]] = row[1]
    }
    var listValues = sheet.getRange(1,3,sheet.getLastRow(),sheet.getLastColumn()).getValues();
		var valueListHeaders = []
    for (var c=0; c<(sheet.getLastColumn()-2); c++) {
      // each column is a list of values w/ a header on top
      var header = listValues[0][c]
			valueListHeaders.push(header)
      if (header) {
        var valueList = []
        for (var r=1; r<sheet.getLastRow(); r++) {
          var value = listValues[r][c]
          //if (value) {
          valueList.push(value);
          //}
        }
        data[header] = valueList;
      }
    } // end forEach column...
    valueListHeaders.forEach(
			function (listHeader) {
				if (listHeader.indexOf('Key')==listHeader.length-3) {
					// If we have a key... look for a value
					var rootName = listHeader.substr(0,listHeader.length-3)
					if (data.hasOwnProperty(rootName+'Val')) {
						// Yippee - we have values...
            Object.defineProperty(data,
                                  rootName+'Lookup',
                                  {value:LookupArray(data[listHeader],data[rootName+'Val']),
																	 enumerable:false});
          }
        }
      }); // end forEach valueListHeader...
    return data;
  } // end getConfigurationTable  
  
  configurationSheet = { // object we will return
    
    getSheetLink : function () { return sheet.getParent().getUrl()+'#gid='+sheet.getSheetId();
															 },
    getSheetId: function () { return sheet.getSheetId();
														},
    loadConfigurationTable: function () {
      this.table = getConfigurationTable();
    },    
    
    writeConfigurationTable: function (table) {
      if (table) { this.table = table };
      overwriteConfigurationTable(this.table);
    },
  } // end configurationSheet
  
  return configurationSheet
} 

function LookupArray (array1, array2) {
	var lookupArray = {};      
	array1.forEach(function (key) {
    if (! key) {return};
    logVerbose('Key='+key);
		Object.defineProperty(
			lookupArray,
			key,
			{get : function () {
				var idx = array1.indexOf(key);
				if (idx > -1) {
					return array2[idx]
				}
			}, // end get
			 set : function (v) {
				 var idx = array1.indexOf(key);
				 if (idx > -1) {
					 array2[idx] = v
				 }
				 else {
					 array1.push(key)
					 array2.push(v)
				 }
			 }, // end set
       enumerable: true,
			})
	}) // end forEach key
	Object.preventExtensions(lookupArray); // prevent confusion
	return lookupArray;
}


function createConfigurationSheet (ss, sheetName, table) {
  //ss = SpreadsheetApp.getActiveSpreadsheet()
  var nameIterator = 1; var origSheetName = sheetName;
  while (ss.getSheetByName(sheetName)) {    
    var sheetName = origSheetName + '-' + nameIterator
    nameIterator += 1
  }
  var sheet = ss.insertSheet(sheetName)    
  var cs = ConfigurationSheet(sheet)
  logVerbose('Writing data values'+shortStringify(table))
  cs.writeConfigurationTable(
    table
  )  
  return cs
}


function initializeMasterConfig (ss) {
  // Set up our master config...
  var sheet = getSheetById(ss,0);
  sheet.clear();
  var initialRow = ['Form','FormID','Action','Config 1 Link', 'Config 1 ID', 'Config 2 Link','Config 2 ID', 'Config 3 Link', 'Config 3 ID']
  var hiddenVals = [2,5,7,9]  
  sheet.getRange(1,1,1,initialRow.length).setValues([initialRow])
  // hide IDs
  for (var i=0; i<hiddenVals.length; i++) {
    sheet.hideColumns(hiddenVals[i])
  }
  return getMasterConfig(ss);
}

function getMasterConfig (ss) {
  // Our master sheet is the first sheet (0)
  var sheet = getSheetById(ss,0)
  // If not initialized, initialize...
  if (sheet.getDataRange().getValues()[0].length===1) {
    logNormal('Empty master - initialize');
    return initializeMasterConfig(ss)
  }
  else {
    logNormal('Master has '+sheet.getDataRange().getValues()[0].length);
    logNormal('Presumably we are fine...');
  }
  var table =  Table(sheet.getDataRange())  
  table.pushConfig = function (form, action, configSheets) {
    pushData = {'Form':form.getEditUrl(),'FormID':form.getId(),'Action':action}
    n = 1
    configSheets.forEach( function (configSheet) {
      logAlways('Pushing configSheet '+n+': '+shortStringify(configSheet));
      pushData['Config '+n+' Link'] = configSheet.getSheetLink();      
      pushData['Config '+n+' ID'] = configSheet.getSheetId();  
      n += 1;
    }) // end forEach configSheet...
    logAlways('pushRow '+shortStringify(pushData));
    table.pushRow(pushData);
  }
  table.getConfigsForId = function (id) {
    var retRows = []
    table.forEach(function (row) {
      if (row.FormID==id) {
        //row.getConfigurationSheets = function () {
        for (var i=1; i<4; i++) {            
          configId = row['Config '+i+' ID']          
          if (configId) {
            logNormal('Grabbing config '+i+' from sheet '+configId)
            try {
              row['Config'+i] = getConfigurationSheetById(sheet.getParent(), configId)
              row['Config'+i].loadConfigurationTable();
            }
            catch (err) {
              Logger.log('Odd: unable to load Config'+i+': '+configId);
            }
          }
          else {
            row['Config'+i] = 'FOO!'
          }
        } // end for each config
        //return configs;
        //} // end getConfigurationSheets
        
        retRows.push(row)
      }
    }) // end forEach row...
    return retRows;
  }
  return table;
} // end getMasterConfig

function testReadConfigsFromMaster () {
  var formId = '1FZSNYuDWpf1scB1_CvJrt7mnyIBH_-AALxXyIDUJWR0';
  var ss = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
  var masterConfig = getMasterConfig(ss)
  var configs = masterConfig.getConfigsForId(formId)
  configs.forEach(function (cRow) {
    logVerbose('Config row: '+shortStringify(cRow))
    logVerbose('Has method: '+shortStringify(cRow.getConfigurationSheets));
    //cRow.getConfigurationSheets().forEach( function (sheet) {
    var sheet = cRow['Config1']
    logVerbose('Got sheet: '+JSON.stringify(sheet.table))
    logVerbose('From fields: '+JSON.stringify(sheet.table.fromFields))
    logVerbose('Approval Form ID: '+JSON.stringify(sheet.table['Approval Form ID']))
		// })
  })
}


function testCreateConfig () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk');
  createConfigurationSheet(ss,'Test',
                           {'Regular Key':123,
                            'Other key':'This is a cool value',
                            'Some other key':123.120391823,
                            'Listy Key':[1,2,3,4,5],
                            'Other List':['Red','Blue','Green','Purple']
                           })
}// end testCreateConfig


function testReadConfigurationSheet () {
  var cs = getConfigurationSheetById(
    '1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk',
    '286151412'
  )
  Logger.log('Got configuration sheet'+JSON.stringify(cs))
  cs.loadConfigurationTable()
  Logger.log('Got data table: '+JSON.stringify(cs.table));
  cs.table['Places'].push('Westford')
  cs.table['Colors'].push('Green')
  cs.writeConfigurationTable();
  Logger.log('Edit URL: ' + cs.getSheetLink());
  Logger.log('Sheet ID: '+cs.getSheetId());
}

function testLookupFieldsStuff () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk');
  var config = createConfigurationSheet(ss, 'TestMagicDict',
                                        {'Key':'321',
                                         'FieldKey':'%Name',
                                         'LookupFieldKey':'@Supervisor>>Supervisor',
																				 'Colors':'@Colors>>Color',
                                         'SupervisorKey':['Arnold','Ringwall','Kapeckas'],
                                         'SupervisorVal':['earnold@innovationcharter.org','cringwall@innovationcharter.org','mkapeckas@innovationcharter.org'],
																				 'ColorKey':['Red','Blue','Green'],
																				 'ColorVal':['#f00','#00f','0f0'],
                                         'OtherList':['a','b','c',1,2,3,'asdfasdf'],
                                        })
  config.loadConfigurationTable()
	Logger.log('Got %s',JSON.stringify(lookupFields(
		config.table,
		{'Name':'Harry Potter',
		 'Supervisor':'Ringwall',
		 'Colors':['Red','Blue','Green'],
		}
	)));
}

function testMagicDictionaryStuff () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk');
  var config = createConfigurationSheet(ss, 'TestMagicDict',
                                        {'Regular Key':123,
                                         'Other key':'foo biz bang',
                                         'FooKey':['Fruit','Vegetable','Protein','Grain'],
                                         'FooVal':['Apple','Kale','Salmon','Flatbread'],
                                         'SquaresKey':[2,4,6,8],
                                         'SquaresVal':[4,16,36,64],
                                         'OtherList':['a','b','c',1,2,3,'asdfasdf'],
                                        })
  Logger.log(JSON.stringify(config));
  Logger.log(JSON.stringify(config['Regular Key']));
  Logger.log(JSON.stringify(config['Other Key']));
  Logger.log(JSON.stringify(config['SquaresKey']));
  Logger.log(JSON.stringify(config['SquaresLookup']));
}

function testReadMagic () {
  var cs = getConfigurationSheetById(
    '1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk',
    '652288327'
  );
  cs.loadConfigurationTable();
  Logger.log('Config:'+JSON.stringify(cs));
  Logger.log(JSON.stringify(cs.table['Regular Key']));
  Logger.log(JSON.stringify(cs.table['Other Key']));
  Logger.log(JSON.stringify(cs.table['SquaresKey']));
  Logger.log(JSON.stringify(cs.table['SquaresLookup']));
  Logger.log(JSON.stringify(cs.table['SquaresLookup'][6]));
  Logger.log(JSON.stringify(cs.table['FooLookup'].Fruit));
  cs.table['FooLookup'].Fruit = 'Banana';
  cs.writeConfigurationTable();
}

function testInitializeConfig () {
  var ss = SpreadsheetApp.openById('1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk');
  Logger.log(initializeMasterConfig(ss));
}
