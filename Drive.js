var defaultDriveSubjectTemplate = 'Folders Shared';
var defaultDriveBodyTemplate = 'We have given <<Username>> read access to the following folders: <<FoldersRead>>\nWe have given them write access to the following folders: <<FoldersWrite>>.';

function createDriveFormAndConfig (folders, form) {
	var ret = {}
	ret.form = createDriveForm(folders, form);
	ret.configTable = {
	    'Username':'%Username',
	    'FoldersRead':'@Drive Folders (Read Access)>>Folder',
	    'FoldersWrite':'@Drive Folders (Write Access)>>Folder',
	    'FolderKey':folders.map(function (f) {return DriveApp.getFolderById(f).getName()}),
	    'FolderVal':folders,
	    'EmailSubject':defaultDriveSubjectTemplate,
	    'EmailBody':defaultDriveBodyTemplate,
	    'InformFormUser':1,
	};
	return ret;
}

function createDriveForm (folders, form) {
  Logger.log('createDriveForm(%s,%s)',folders,form);
	if (!form) {
		form = FormApp.create("Google Drive Sharing").setTitle("Google Drive Sharing")        
      .setCollectEmail(true);
    form.addTextItem()
		  .setTitle("Username")
		  .setHelpText("Name of User Who Will be Added to Groups");
		Logger.log('createDriveForm=>'+form.getPublishedUrl());
	}
	form.addSectionHeaderItem()
		.setTitle("Drive");
	var wcb = form.addCheckboxItem()
			.setTitle('Drive Folders (Write Access)');
	var rcb = form.addCheckboxItem()
			.setTitle('Drive Folders (Read Access)');
	choices = []
	folders.forEach( function (fid) {
		var folder = DriveApp.getFolderById(fid)
		choices.push(folder.getName());
	}) // end forEach folder
	wcb.setChoiceValues(choices);
	rcb.setChoiceValues(choices);
	return form;
}


function addUserToFoldersFromForm (results, config) {
  logNormal('addUsersToFolderFromForm(%s,%s)',results,config);
	if (! checkAuthorization(results, config)) {
		Logger.log('Permission denied to add folders (%s, %s)',results,config);
		return
    }
  Logger.log('Authorized, continuing');
	settings = lookupFields(config,results);
  Logger.log('Done getting settings %s',settings);
  folderResults = {'Username':settings.Username, 'FoldersRead':[],'FoldersWrite':[]}
  var modes = ['FoldersRead','FoldersWrite']
  modes.forEach( function (mode) {
    Logger.log('Running mode %s',mode);
    if (settings[mode]) {
		settings[mode].forEach(function (f) {
          Logger.log('Looking @ %s',f);
			var folder = DriveApp.getFolderById(f);
			try {
				if (mode=='FoldersRead') {
					folder.addViewer(settings.Username);
				}
				else {
					folder.addEditor(settings.Username);
				}
			}
			catch (err) {
        Logger.log('Error adding viewer %s to folder %s: %s',settings.Username,f,err);
				emailError('Error adding '+settings.Username+' to folder %s'+f+' (mode='+mode+')',err,{'subject':'Script error creating folder'});
				return;
			}
          logNormal('Added %s to folder %s',settings.Username,folder.getName());
			folderResults[mode].push(folder.getName())
		}) // end forEach folder
    } 
    else {
      Logger.log('No folders for mode %s',mode);
    }
  }) // end forEach mode
	Logger.log('Done adding folders: %s',folderResults)
  // Handle Emailing out update...
  //informList = lookupField(informSettings, results);
    if (settings.InformFormUser) {
      informList = results.FormUser;
      if (folderResults.FoldersRead || folderResults.FoldersWrite) {
        sendEmailFromTemplate (informList, settings.EmailSubject, settings.EmailBody, folderResults, true)
      }
    }
	//sendEmailUpdate(user,calsAdded);
	return {'settings':settings,'results':folderResults}
}

function testCreateDriveFormAndConfig () {
	folders = ['0BysJP8Am5UC3ZldvZV9KTkprYzQ','0BysJP8Am5UC3VGpvS3BOVG84WFE']
	createDriveFormAndConfig(folders)
}

function testAddDriveFromForm () {
	folders = ['0BysJP8Am5UC3ZldvZV9KTkprYzQ','0BysJP8Am5UC3VGpvS3BOVG84WFE','0BxmyTxjAaRdFeThaRU4zTXBDTG8']
	config = {
		'Username':'%Username',
		'FoldersRead':'@Drive Folders (Read Access)>>Folder',
		'FoldersWrite':'@Drive Folders (Write Access)>>Folder',
		'FolderKey':folders.map(function (f) {return DriveApp.getFolderById(f).getName()}),
		'FolderVal':folders,
		'EmailSubject':defaultDriveSubjectTemplate,
		'EmailBody':defaultDriveBodyTemplate,
	};
  config.FolderLookup = {}
  arr = [1,2,3]
  arr.forEach(function (i) {Logger.log('Test loop %s',i);});
  for (var i in config.FolderKey) {
    config.FolderLookup[config.FolderKey[i]] = config.FolderVal[i]
  }
	formResults = {'Username':'pol@innovationcharter.org',
								 'Drive Folders (Read Access)':['Orphans'],
								 'Drive Folders (Write Access)':['Article'],
								}
	addUserToFoldersFromForm(formResults,config);
}
