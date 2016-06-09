var defaultCalendarBodyTemplate = 'We have given <<username>> read access to the following calendars: <<CalendarsRead>>\nWe have given them write access to the following calendars: <<CalendarsWrite>>'
var defaultCalendarSubjectTemplate = 'Calendars Shared'

function createCalendarFormAndConfig (calendarIDs, form) {
	var ret = {}
	ret.form = createCalendarAddForm(calendarIDs,form);
	ret.configTable = {
		'Username':'Username',
		'CalendarsRead':'Calendars (Read Access)',
		'CalendarsWrite':'Calendars (Write Access)',
		'CalendarKey':calendarIDs.map(function (cid) {
			return CalendarApp.getCalendarById(cid).getName()
		}),
		'CalendarVal':calendarIDs,
	} // end configTable
	return ret; 
} // end createCalendarFormAndConfig

function createCalendarAddForm (calendarIDs, form) {
  if (!form) {
    form = FormApp.create("Add Calendar Form");
    form.setTitle('Add Calendar Form');
    form.collectsEmail(true);
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
    var cal = CalendarApp.getCalendarById(calendarID);    
    var name = cal.getName();
    Logger.log('Calendar: '+cal+' name:'+name);
    choices.push(readCB.createChoice(name));
    //writeCB.createChoice(name);
  }); // end forEach calendarID
  readCB.setChoices(choices);
  writeCB.setChoices(choices);
  return form;
}

function CalendarSettings (calConfigSettings, results) {
	settings = {}
	settings['user'] = results[calConfigSettings.Username]
	function getCal (cName) {
		return calConfigSettings.CalendarLookup[cName];
	}
	settings['writeCals'] = results[calConfigSettings.CalendarsWrite].map(getCal);
	settings['readCals'] = results[calConfigSettings.CalendarsRead].map(getCal);
	Logger.log('CalendarSettings=>'+JSON.stringify(settings));
	return settings
}

function addUserToCalendarFromForm (results, calConfig, informConfig, emailConfig) {
	var calendarSettings = CalendarSettings(calConfig,results);	
	var user = calendarSettings.user;
  var calResults = {'Username':user, 'CalendarsRead':[],'CalendarsWrite':[]}
	calendarSettings.readCals.forEach( function (c) {
		var success = addUserToCalendar(user,c,'reader');
		if (success) {
			calResults.CalendarsRead.push(CalendarApp.getCalendarById(c).getName());
        }
	})
    calendarSettings.writeCals.forEach( function (c) {
		var success = addUserToCalendar(user,c,'writer');
		if (success) {
			calResults.CalendarsWrite.push(
              CalendarApp.getCalendarById(c).getName()
              );          
        }
	})
    Logger.log('Added calendars: '+JSON.stringify(calResults));
    // Handle Emailing out update...
    //informList = lookupField(informSettings, results);
    informList = results.FormUser;
    sendEmailFromTemplate (informList, emailConfig.Subject, emailConfig.Body, calResults) 
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
  }
  catch (err) {
    Logger.log("Error adding calendar: "+err)
    throw err;
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
	var ss = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
	createCalendarFormAndConfig(
    ['innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com','innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com']
	);
}
