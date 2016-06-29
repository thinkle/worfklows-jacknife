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
	if (! checkAuthorization(results,groupSettings)) {
		Logger.log('Unauthorized use attempted.')
		return false;
	}
	var fields = lookupFields(groupSettings, results);
  Logger.log('addToGroupFromForm got fields=>%s',shortStringify(fields));
	var groupsAdded = addToGroups(fields.username,fields.groups);
  return {'user':fields.username,'groups':groupsAdded,'settings':groupSettings}
}

function addToGroups (username, groupEmails) {
  var added = [];
	groupEmails.forEach(function (groupEmail) {
    try {AdminDirectory.Members.insert({email:username,role:'MEMBER'},groupEmail);
         logNormal('Inserted '+username+' into group '+groupEmail);
         added.push(groupEmail)
        }
    catch (err) {
      logVerbose('Error adding user - already exists? '+err);
      if (err!="Exception: Member already exists.") {
        logAlways('No, some other error: %s',err);
				emailError('Error adding '+username+' to group %s'+groupEmail,err,{'subject':'Script error adding user to group'});
        //throw err;
      }
      else {
        added.push(groupEmail); // we record it if it already existed!
      }
    }
    });
  return added
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
                ["all@innovationcharter.org","ms_56team@innovationcharter.org","ms@innovationcharter.org","msfaculty@innovationcharter.org","56advisoryteachers@innovationcharter.org","ECTeam@innovationcharter.org","ms_56_community_membership@innovationcharter.org","PSteam@innovationcharter.org","self_direction_team@innovationcharter.org","ms_78team@innovationcharter.org","78advisoryteachers@innovationcharter.org","ms_advisors@innovationcharter.org"
                ]		
						 );
}

function testAddBunchOfGroups () {
  var result = addToGroups('Faffffke.Faculty@innovationcharter.org',
                ["groupThatIsReallynotAThing@innovationcharter.org","all@innovationcharter.org","ms_56team@innovationcharter.org","ms@innovationcharter.org","msfaculty@innovationcharter.org","56advisoryteachers@innovationcharter.org","ECTeam@innovationcharter.org","ms_56_community_membership@innovationcharter.org","PSteam@innovationcharter.org","self_direction_team@innovationcharter.org","ms_78team@innovationcharter.org","78advisoryteachers@innovationcharter.org","ms_advisors@innovationcharter.org"
                ]		
						 );
  Logger.log('addToGroups=>%s',result);
}

function testCreateGroupForm () {
	createGroupForm(['hs@innovationcharter.org',
									 'ms@innovationcharter.org',
									 'all@innovationcharter.org',
									 'innovator-editors@innovationcharter.org']);
}
