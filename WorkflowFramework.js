TEXT = 1
FOLDER = 2
FIELDCONVERSION = 3
FIELDLIST = 4
PARA = 5
FIELD = 6
FOLDERLIST = 7
BOOL = 8

function exportGlobals () {
    return "globals="+JSON.stringify({
	TEXT:TEXT,
	FOLDER:FOLDER,
	FIELDCONVERSION:FIELDCONVERSION,
	FIELDLIST:FIELDLIST,
	PARA:PARA,
	FIELD:FIELD,
	FOLDERLIST:FOLDERLIST,
	BOOL:BOOL
    });
}

/* Note: the FIELD set necessitates a *mode* to be specified...

   Modes consist of...

   field -> %fieldName 
   value -> Raw Value
   lookup -> @lookup
   magic -> %magic?
*/


triggerActions = {} // registry of triggers by name, with functions


// To be used as follows...
// Workflow({
//     name : Create User, -> name of workflow for UI
//     shortname : NewUser -> name of workflow for code purposes
//     trigger : function (event, masterSheet, actionRow, actionResults) {},
//     create : function (form, params) { /* create trigger and such  */}, /*OPTIONAL FUNCTION TO CREATE TRIGGER IF OTHER THAN DEFAULT MODE */
//     params : {} /* parameters used to create initial set-up */
//     
// })


function Blade (data) {
    // register trigger
    triggerActions[data.shortname] = function (a1,a2,a3,a4) {
	Logger.log('%s trigger (%s,%s,%s,%s)',data.shortname,a1,a2,a3,a4);
	triggerActions[data.trigger](a1,a2,a3,a4)
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
	    handleLookups(config,params)
	    // Config is set
	    var formAsFile = DriveApp.getFileById(form.getId());
	    var formTitle = form.getTitle(); Logger.log('title='+formTitle);
	    var controlSS = args['SpreadsheetApp'] ? args['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
	    var configSheets = [createConfigurationSheet(controlSS,formTitle+' Settings',config)];
	    getMasterConfig(controlSS)
		.pushConfig(formUrl,data.shortname,configSheets);
	    createFormTrigger(formUrl,controlSS);
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
    if (ssid) {var controlss = SpreadsheetApp.openById(ssid)}
    else {var controlss = SpreadsheetApp.getActiveSpreadsheet()}
    var fid = PropertiesService.getScriptProperties().getProperty(ssid+' folder');
    if (fid) {
	var folder = DriveApp.getFolderById(fid);
    }
    else {
	var topId = PropertiesService.getScriptProperties().getProperty("Toplevel Folder");
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
    files.forEach(function (f) {
	folder.addFile(f);
    });
    return folder;
}

function testGatherWorkflow () {
    Logger.log('gatherWorkflow=>%s',gatherWorkflow('13J7v8UvtHFB0L7k0qJrDPIuZHRMaT01Ayas47jxion8'));
    //gatherWorkflowInFolder(
    //SpreadsheetApp.openById('10yauqDvNnG2iQwoaIWbRs_3HKVJkYcx0HK3MRCL2bRE'),
    //DriveApp.getFolderById('0BysJP8Am5UC3aDMxN1F2RVVCV2s')// 'FY17 Budget Workflow'
    //);
}

