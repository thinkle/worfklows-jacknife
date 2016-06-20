// Code for creating new accounts

defaultCreateAccountSubject = "Account Info";
defaultCreateAccountTemplate = "This email is to inform you that a new account has been created for <<username>> with the initial password <<password>>.";

function createAccountFromForm (results, fieldSettings) {
	logNormal('createAccountFromForm(%s,%s)',results,fieldSettings);
	if (! checkAuthorization(results, fieldSettings)) {
		Logger.log('Unauthorized use attempted.')
		return false;
	}
	var params = lookupFields(fieldSettings,results);
	params.informList = []
	if (params.informFormUser) {
		params.informList.push(results.FormUser)
	}
	if (params.informOther) {
		params.informList.push(params.informOther)
	}
 	return createAccount(params)
}


/* username, first, last, fields, informList, emailTemplate, emailSubject */

function createAccount (params) {
	logNormal('createAccount(%s)',params);
	var first = params.first; 
	var last = params.last;
	var informList = params.informList ? params.informList : [];
	var emailTemplate = params.emailTemplate ? params.emailTemplate : defaultCreateAccountTemplate;
	var emailSubject = params.emailSubject ? params.emailSubject : defaultCreateAccountSubject;
	var username = params.username;
	var requirePasswordReset = params.requirePasswordReset
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
		if (requirePasswordReset) {
			user.changePasswordAtNextLogin = true
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
          fields, true);
      });
    }
		return user
  }
}

