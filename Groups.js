defaultCreateAccountSubject = "Account Info";
defaultCreateAccountTemplate = "This email is to inform you that a new account has been created for <<username>> with the initial password <<password>>.";

function createGroupForm (groups, form) {
	if (!form) {
		form = FormApp.create("Google Groups").setTitle("Google Groups")        
      .setCollectEmail(true);
    form.addTextItem()
		  .setTitle("Username")
		  .setHelpText("Name of User Who Will be Added to Groups");
		Logger.log('createGroupForm=>'+form.getPublishedUrl());
	}
	form.addSectionHeaderItem()
		.setTitle("Groups");
	var cb = form.addCheckboxItem()
			.setTitle('Add to Google Groups')
			.setChoiceValues(groups);
	return form;
}

function addToGroupFromForm (results, groupSettings) {
	var fields = lookupFields(groupSettings, results);
  Logger.log('addToGroupFromForm got fields=>%s',JSON.stringify(fields));
	addToGroups(fields.username,fields.groups);
}

function addToGroups (username, groupEmails) {
	groupEmails.forEach(function (groupEmail) {
    try {AdminDirectory.Members.insert({email:username,role:'MEMBER'},groupEmail);
				 logNormal('Inserted '+username+' into group '+groupEmail);
        }
    catch (err) {
      logNormal('Error adding user - already exists? '+err);
    }
	});
}

function testEmailAndAddToGroups () {
	createAccount(
		{username:'Fake.Faculty@innovationcharter.org',
		 first:'Fake',
		 last:'Faculty',
		 informList:['thinkle@innovationcharter.org,tmhinkle@gmail.com'],
		 fields:{'orgUnitPath':'/Staff',},
		});
	addToGroups('Fake.Faculty@innovationcharter.org',
							['ms@innovationcharter.org','all@innovationcharter.org']
						 );
}


function testCreateGroupForm () {
	createGroupForm(['hs@innovationcharter.org',
									 'ms@innovationcharter.org',
									 'all@innovationcharter.org',
									 'innovator-editors@innovationcharter.org']);
}
