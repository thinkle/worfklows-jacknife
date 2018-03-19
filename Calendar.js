var defaultCalendarBodyTemplate,defaultCalendarSubjectTemplate

function _initCalendar () {
    defaultCalendarBodyTemplate = 'We have given <<Username>> read access to the following calendars: <<CalendarsRead>>\nWe have given them write access to the following calendars: <<CalendarsWrite>>'
    defaultCalendarSubjectTemplate = 'Calendars Shared'
}

function createCalendarFormAndConfig (calendarIDs, form) {
    var ret = {}
    ret.form = createCalendarAddForm(calendarIDs,form);
    ret.configTable = {
	'Username':'%Username',
	'CalendarsRead':'@Calendars (Read Access)>>Calendar',
	'CalendarsWrite':'@Calendars (Write Access)>>Calendar',
	'CalendarKey':calendarIDs.map(function (cid) {
            return Calendar.Calendars.get(cid).summary
            //return CalendarApp.getCalendarById(cid).getName()
	}),
	'CalendarVal':calendarIDs,
	'InformFormUser':'True',
	'EmailSubject':defaultCalendarSubjectTemplate,
	'EmailBody':defaultCalendarBodyTemplate,
	'NeedsAuthorization':'True',
	'Authorize':'@FormUser>>AuthorizedUser',
	'AuthorizedUserKey':['user@foo.bar','user@boo.bang','Default'],
	'AuthorizedUserVal':[1,1,0],
    } // end configTable
    return ret; 
} // end createCalendarFormAndConfig

function createCalendarAddForm (calendarIDs, form) {
    if (!form) {
	form = FormApp.create("Add Calendar Form");
	form.setTitle('Add Calendar Form');
	form.setCollectEmail(true);
	Logger.log('Created form: '+form.getPublishedUrl());    
	form.addTextItem()    
	    .setTitle("Username")
	    .setHelpText("Name of User Who Will be Added To Calendars");    
    };  
    form.addSectionHeaderItem().setTitle("Calendars");
    var readCB = form.addCheckboxItem();  
    readCB.setTitle("Calendars (Read Access)");
    var writeCB = form.addCheckboxItem();
    var choices = []
    writeCB.setTitle("Calendars (Write Access)");
    calendarIDs.forEach( function (calendarID) {
	Logger.log('Add calendar ID '+calendarID);
	//try {
	//  var cal = CalendarApp.getCalendarById(calendarID);
	//  var name = cal.getName();
	//}
	//catch (err) {
	//  Logger.log('Error fetching calendar: %s: %s',calendarID, err);
	var cal = Calendar.Calendars.get(calendarID)
	var name = cal.summary      
	//}
	Logger.log('Calendar: '+cal+' name:'+name);
	choices.push(readCB.createChoice(name));
	//writeCB.createChoice(name);
    }); // end forEach calendarID
    readCB.setChoices(choices);
    writeCB.setChoices(choices);
    return form;
}

function checkAuthorization (results, config) {
    var conf = lookupFields(config,results);
    if (! conf.NeedsAuthorization) { return true; }
    if (conf.Authorize) {return true;}
    else {
	Logger.log('Form not authorized (User %s, conf %s)',conf.FormUser,conf);
	sendEmailFromTemplate(conf.FormUser,'Unauthorized attempt',
			      'You attempted to use a form that is meant to trigger actions you are not authorized to perform. If you believe you should have access to the form, please email <a href="thinkle@innovationcharter.org">thinkle@innovationcharter.org</a>.\n\nDetailed technical information about what you were trying to do:\n'+shortStringify(conf))
	return false
    }
}

function addUserToCalendarFromForm (results, calConfig) { //, informConfig, emailConfig) {
    if (! checkAuthorization(results,calConfig)) {
	Logger.log('Unauthorized use attempted.')
	return false;
    }
    var calendarSettings = lookupFields(calConfig,results);	
    var user = calendarSettings.Username;
    var calResults = {'Username':user, 'CalendarsRead':[],'CalendarsWrite':[]}
    if (calendarSettings.CalendarsRead) {
	calendarSettings.CalendarsRead.forEach( function (c) {
	    logVerbose('add user %s to calendar %s',user,c)
	    var success = addUserToCalendar(user,c,'reader');
	    if (success) {
		try {
		    calResults.CalendarsRead.push(
			//CalendarApp.getCalendarById(c).getName()
			Calendar.Calendars.get(c).summary
		    );
		}
		catch (err) {
		    if (! calResults.CalendarsFailedRead) {calResults.CalendarsFailedRead = []};
		    calResults.CalendarsFailedRead.push(c);
		    logAlways('Error %s logging calendar %s',err,c);
		    
		}
	    }
	}) // end forEach CalendarsRead
    }
    if (calendarSettings.CalendarsWrite) {
	calendarSettings.CalendarsWrite.forEach( function (c) {
	    logVerbose('add user %s to calendar %s',user,c)
	    var success = addUserToCalendar(user,c,'writer');
	    if (success) {
		try {
		    calResults.CalendarsWrite.push(
			Calendar.Calendars.get(c).summary
			//CalendarApp.getCalendarById(c).getName()
		    );
		}
		catch (err) {
		    if (! calResults.CalendarsFailedWrite) {calResults.CalendarsFailedWrite = []};
		    calResults.CalendarsFailedWrite.push(c);
		    logAlways('Error %s logging calendar %s',err,c);
		}
	    }
	}) // end forEach CalnedarsWrite
    }
    logNormal('Added calendars: %s',JSON.stringify(calResults));
    // Handle Emailing out update...
    //informList = lookupField(informSettings, results);
    if (calendarSettings.InformFormUser) {
	informList = results.FormUser;
	if (calResults.CalendarsWrite || calResults.CalendarsRead) {
	    sendEmailFromTemplate (informList, calendarSettings.EmailSubject, calendarSettings.EmailBody, calResults, true)
	}
    }
    return {'settings':calendarSettings,'results':calResults}
    //sendEmailUpdate(user,calsAdded);
}

function addUserToCalendar (user, calendarId, role) {
    if (! role) {role='reader'};
    var calendarId = calendarId;
    var acl = {
	scope: {
	    type: 'user',
	    value: user
	},
	role: role
    };
    try {
	Calendar.Acl.insert(acl, calendarId);
	logNormal('Added %s to calendar %s',user,calendarId);
    }
    catch (err) {
	Logger.log("Error adding calendar: "+err)
	emailError('Error adding '+user+' to calendar '+calendarId+' role: '+role,err,{'subject':'Script error adding user to calendar'});
	//throw err;
	return false
    }
    return true;
}

function testAddUser () {
    user = 'Fake.Faculty@innovationcharter.org'
    allSchool =  'innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com' // All School
    addUserToCalendar(user,allSchool,'reader');
    hsCal = 'innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com';
    addUserToCalendar(user,hsCal,'reader');
}

function testCreateForm () {
    var form = createCalendarAddForm(
	['innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com','innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com']
    )
    form.get
}

function testCreateCalendarFormAndConfig () {
    var ss = SpreadsheetApp.openById('1-mHEuYtRNQDtQO1vX0WY49RsB6noRXQuV_sBLUl0DJ0');
    createCalendarFormAndConfig(
	['innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com','innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com','innovationcharter.org_f18ij5fhojmf19fnjtlkcs0gvo@group.calendar.google.com']
    );
}
