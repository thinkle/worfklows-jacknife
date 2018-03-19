var triggerActions, TEXT, FOLDER, FIELDCONVERSION, FIELDLIST, PARA, FIELD, FOLDERLIST, BOOL, SPREADSHEET, FORM;

function _initWorkflowFramework () {
 triggerActions = {
} // registry of triggers by name, with functions
 TEXT = 1
 FOLDER = 2
 FIELDCONVERSION = 3
 FIELDLIST = 4
 PARA = 5
 FIELD = 6
 FOLDERLIST = 7
 BOOL = 8
 SPREADSHEET = 9;
 FORM = 10;
  console.log('Loaded globals and triggerActions');
  Logger.log('Ran load()');
};

function exportGlobals () {
    return "globals="+JSON.stringify({
	TEXT:TEXT,
	FOLDER:FOLDER,
	FIELDCONVERSION:FIELDCONVERSION,
	FIELDLIST:FIELDLIST,
	PARA:PARA,
	FIELD:FIELD,
	FOLDERLIST:FOLDERLIST,
	BOOL:BOOL,
	SPREADSHEET:SPREADSHEET,
	//FUNCTION:FUNCTION,
    });
}

/* Note: the FIELD set necessitates a *mode* to be specified...

   Modes consist of...

   field -> %fieldName 
   value -> Raw Value
   lookup -> @lookup
   magic -> %magic?
*/



// To be used as follows...
// Blade({
//     name : Create User, -> name of workflow for UI
//     shortname : NewUser -> name of workflow for code purposes
//     trigger : function (event, masterSheet, actionRow, actionResults) {},
//     create : function (form, params) { /* create trigger and such  */}, /*OPTIONAL FUNCTION TO CREATE TRIGGER IF OTHER THAN DEFAULT MODE */
//     params : {} /* parameters used to create initial set-up */
//     
// })


function Blade (data) {
  
    // register trigger
    console.log('Creating blade: %s',data.shortname);
    triggerActions[data.shortname] = function (a1,a2,a3,a4) {
	console.log('%s trigger (%s,%s,%s,%s)',data.shortname,a1,a2,a3,a4);
	return data.trigger(a1,a2,a3,a4); // don't forget to return our results to pass to other triggers!
    }

    if (!data.create) {
	data.create = function (formUrl, args) {
	    var config = {};
	    data.params.forEach(function (p) {
		if (args[p.field]) {
		    config[p.field] = args[p.field]
		}
		else {
		    // default value...
		    config[p.field] = p.val
		}
	    }); // end mapping config fields...
	    handleLookups(config,data.params)
	    // Config is set
	    var form = FormApp.openByUrl(formUrl);
	    var formAsFile = DriveApp.getFileById(form.getId());
	    var formTitle = form.getTitle(); Logger.log('title='+formTitle);
	    var controlSS = args['SpreadsheetApp'] ? args['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
	    var configSheets = [createConfigurationSheet(controlSS,formTitle+' Settings',config)];
	    getMasterConfig(controlSS)
		.pushConfig(form,data.shortname,configSheets);
	    createFormTrigger(form,controlSS);
	}
    }

    // register UI
    sidebarActions[data.shortname] = {
	name:data.name,
	callback: data.create,
	params:data.params,
    }

} // end workflow


function gatherFiles (controlss) {
    var fileList = [DriveApp.getFileById(controlss.getId())];
    var configTabs = [];
    var config = getMasterConfig(controlss);
    Logger.log(JSON.stringify(controlss));
    config.shift();
    config.forEach(function (masterRow) {
	[1,2,3].forEach(function (n) {
	    var configId = masterRow['Config '+n+' ID'];
	    if (configId && configId!='NOT_FOUND') {
		configTabs.push(
		    getConfigTable(
			controlss.getId(),
			configId
		    )
		);
            }
	}) // end configId harvest
	try {
	    fileList.push(DriveApp.getFileById(masterRow.FormID));
	    Logger.log('Pushed: %s',masterRow.FormID);
	}
	catch (e) {
	    Logger.log('Trouble fetching: %s',masterRow.FormID);
	    Logger.log('Error: %s',e);
	}
    });
    configTabs.forEach(function (configTab) {
	//Logger.log('Looking at configTab %s',JSON.stringify(configTab));
	['SpreadsheetId','Approval Form ID'].forEach(
	    function (prop) {
		Logger.log('Checking for prop: %s',prop);
		if (configTab[prop]) {
		    try {
			fileList.push(DriveApp.getFileById(configTab[prop]));
			console.log('Added file %s %s',prop,configTab[prop]);
		    }
		    catch (e) {
			console.log('Error adding %s: %s',
				    configTab.prop,
				    e);
		    }
		}
	    });
	
    })
    //console.log('Gathered list: %s',fileList);
    return fileList;
}

function gatherWorkflow (ssid, foldername) {
    //Gather a workflow associated with a spreadsheet into a folder, then return the ID of the folder that contains it;
    logNormal('Gather workflow at %s into folder named %s',ssid,foldername)
    if (ssid) {var controlss = SpreadsheetApp.openById(ssid)}
    else {var controlss = SpreadsheetApp.getActiveSpreadsheet()}
    var fid = PropertiesService.getScriptProperties().getProperty(ssid+' folder');
    if (fid) {
	var folder = DriveApp.getFolderById(fid);
	if (foldername) {
	    folder.setName(foldername)
	}
    }
    else {
	var topId = PropertiesService.getUserProperties().getProperty("Toplevel Folder");
	if (!topId) {
	    var top = DriveApp.createFolder("Workflows Jacknife Workflows")
	    PropertiesService.getScriptProperties().setProperty("Toplevel Folder",top.getId())
	}
	else {
	    var top = DriveApp.getFolderById(topId)
	}
	if (!foldername) {foldername = controlss.getName()+' Files'}
	var folder = DriveApp.createFolder(foldername)
	top.addFolder(folder);
	DriveApp.removeFolder(folder); // remove from root
	PropertiesService.getScriptProperties().setProperty(ssid+' folder',folder.getId())
    }
    return gatherWorkflowInFolder(controlss, folder).getId()
}

// Gather
function gatherWorkflowInFolder (controlss, folder) {
    var files = gatherFiles(controlss)
    logNormal('Gathering files: %s',files);
    files.forEach(function (f) {
	folder.addFile(f);
    });
    return folder;
}

function testGatherWorkflow () {
    Logger.log('gatherWorkflow=>%s',DriveApp.getFolderById(gatherWorkflow('13J7v8UvtHFB0L7k0qJrDPIuZHRMaT01Ayas47jxion8')));
    //gatherWorkflowInFolder(
    //SpreadsheetApp.openById('10yauqDvNnG2iQwoaIWbRs_3HKVJkYcx0HK3MRCL2bRE'),
    //DriveApp.getFolderById('0BysJP8Am5UC3aDMxN1F2RVVCV2s')// 'FY17 Budget Workflow'
    //);
}

function testEndOfGather () {
  var ssid = '1lldMEo4F5K_T8Zb2kURh2CZfgL4-K1yesILGrnmDT5Q'
  //var ss = SpreadsheetApp.openById(ssid);
  Logger.log(gatherWorkflow(ssid).getUrl())
}

function copyWorkflow (ssid) {
    // to copy a workflow, we duplicate all the sheets involved...
    // we do not set up the triggers by default
    if (ssid) {
	var ss = SpreadsheetApp.openById(ssid);
    }
    else {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	ssid = ss.getId()
    }
    // Files to copy...

    var copied = {}
    function duplicate (id) {
      if (!copied[id]) {
        copied[id] = DriveApp.getFileById(id).makeCopy()
      }
      return copied[id];
    }

    var newSS = SpreadsheetApp.openById(duplicate(ssid).getId());
    
    // much like gatherFiles now...
  Logger.log('Grab master config');
    var config = getMasterConfig(newSS);
  Logger.log('got config');
    config.shift(); // remove header
    config.forEach(function (masterRow) {
	var formId = masterRow.FormID
	masterRow.FormID = duplicate(formId).getId();
	masterRow.Form = copied[formId].getUrl();
	[1,2,3].forEach(function (n) {
	    var configId = masterRow['Config '+n+' ID'];
	    if (configId && configId!='NOT_FOUND') {
		var cs = getConfigurationSheetById (newSS.getId(), configId)
		cs.loadConfigurationTable()
		var modified = false;
		['SpreadsheetId','Approval Form ID'].forEach(
		    function (prop) {
			if (cs.table[prop]) {
			    // we have a file property... let's make a copy
			    console.log('Copying file: %s',cs.table[prop]);
			    cs.table[prop] = duplicate(cs.table[prop]).getId();
			    modified = true;
			    console.log('Copied to: %s',cs.table[prop]);
			}
		    });
          if (modified) {
            cs.writeConfigurationTable()
          }
	    }
	}); // done with config sheets...
    }) // done with each row...
    return {folder:DriveApp.getFolderById(gatherWorkflow(newSS.getId())),
	    file:newSS}
}

var SPREADSHEETID = 2
var FORMID = 3
var IS_DEFINED = 4

function checkParam (config, param, type, require) {
    if (!config.table.hasOwnProperty(param)) {
	console.log('Warning: %s not defined in config %s',param,config.getSheetLink());
	if (type==IS_DEFINED) {
	    console.log('param %s is required',param);
	    throw {error:"Required Parameter Not Defined",
		   config:config.getSheetLink()}
	}
    }
    if (type==SPREADSHEETID || type==FORMID) {
	var id = config.table[param]
	try {
	    if (type==FORMID) {
		FormApp.openById(id);
	    }
	    if (type==SPREADSHEETID) {
		SpreadsheetApp.openById(id);
	    }
	}
	catch (err) {
	    console.log('Error: %s does not appear to be a %s (defined in %s)',
			type==SPREADSHEETID && 'Sheet' || 'Form',
			config.table[param],
			config.getSheetLink())
	    throw err;
	}
    }
}


function assertError (f) {
    try {
	f()
    }
    catch (err) {
	Logger.log('Error as expected: %s',err);
	return
    }
    // if we get here there was no error :(
    throw {error:'Should have thrown error but did not','f':f}
}

checkParamTest = Test({
    metadata : {name: 'Config - test check params'},
    setup : function (p) {
      Logger.log('Set up!');
	var ss = p.getScratchSS();
      Logger.log('Got ss');
	p.cs = createConfigurationSheet(ss,'Test Param Check',
					  {SheetID : p.getScratchSS().getId(),
					   FormID : p.getScratchForm().getId(),
					   PresentValue : 'This value is present',
					   BadFormValue : 'Not a form ID',
					   BadSheetValue : 'Not a sheet ID'});
	p.cs.loadConfigurationTable();
    },
  test: function (p) {
    var cs = p.cs;
	// No error for these...
	checkParam(cs,'SheetID',SPREADSHEETID)
	checkParam(cs,'FormID',FORMID)
	checkParam(cs,'PresentValue',IS_DEFINED)
	checkParam(cs,'ShouldLogWarningButNotThrowError')
	assertError(function () {checkParam(cs,'BadSheetValue',SheetID)});
	assertError(function () {checkParam(cs,'BadFormValue',FORMID)});
	assertError(function () {checkParam(cs,'SheetID',FORMID)});
	assertError(function () {checkParam(cs,'FormID',SheetID)});
	assertError(function () {checkParam(cs,'MissingValue',IS_DEFINED)});
    }
})
		    
function runParamTest () {
    checkParamTest.solo();
}


function testConfigFix () {
  cs = getConfigurationSheetById('146cgFmQ55S2jTJ3OP6biLrM_UYvDueQwV71Ce11luKM',1461439748);
  cs.loadConfigurationTable();
  console.log('Started w: ',cs.table.SpreadsheetId);
  cs.table['SpreadsheetId'] = "1fzjHq5kxM_bYQU08XrheEYVLm5xR_MZf7lkGhm0AmF0";
  cs.table['foo']='bar'
  cs.writeConfigurationTable();
}
var testCopy

function _initZZZTestWorkflowFramework () {
     testCopy = Test({
        metadata : {name:'Copy Workflow Test'},
        test : function (p) {
	    return copyWorkflow(p.masterSS)
        }
    })
}

function runTestCopy () {testCopy.solo()}
