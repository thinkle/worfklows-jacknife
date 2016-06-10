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
			.setTitle('Add to Google Groups:')
			.setChoiceValues(groups);
	return form;
}

function addToGroupFromForm (results, groupSettings) {
	var fields = lookupFields(groupSettings, results);
  Logger.log('addToGroupFromForm got fields=>%s',JSON.stringify(fields));
	addToGroups(fields.username,fields.groups);
}

function createAccountFromForm (results, fieldSettings, informSettings, emailTemplateSettings) {
 	var params = {
 		//informList : lookupField(informSettings, results),
      informList : ['thinkle@innovationcharter.org'],
 		emailTemplate : emailTemplateSettings.Body,
 		emailSubject : emailTemplateSettings.Subject,
 	}
 	var moreFields = lookupFields(fieldSettings,results)
 	for (var k in  moreFields) {
 		params[k]=moreFields[k];
 	}
 	createAccount(params)
}


/* username, first, last, fields, informList, emailTemplate, emailSubject */

function createAccount (params) {
	var first = params.first; 
	var last = params.last;
	var informList = params.informList ? params.informList : [];
	var emailTemplate = params.emailTemplate ? params.emailTemplate : defaultCreateAccountTemplate;
	var emailSubject = params.emailSubject ? params.emailSubject : defaultCreateAccountSubject;
	var username = params.username;
	user = params.fields ? params.fields : {}
  Logger.log('Username: '+username);
  try {
		var user = AdminDirectory.Users.get(username) 
    logNormal('User '+username+' already exists')
    return user
  }
  catch (err) {
    logNormal('Error '+err+' likely just means we need to create user...');
    if (! user.primaryEmail) {
      user.primaryEmail = username;
    }
    if (! user.name) {
      user.name = {givenName:first,familyName:last}
    }
    if (! user.password) {
      var pw = (Math.random()).toString(36).replace('0.','')
      user.password = pw
    }
    Logger.log('Creating user: '+JSON.stringify(user));
    user = AdminDirectory.Users.insert(user);
    //Logger.log('User %s created with ID %s',user.primaryEmail,user.id);
    fields = {
      'username':username,
      'first':first,
      'last':last,
      'password':pw,
    }
    if (informList) {
      informList.forEach( function (username) {
        sendEmailFromTemplate(
          username,
          emailSubject,
          emailTemplate,
          fields);
      });
    }
  }
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
