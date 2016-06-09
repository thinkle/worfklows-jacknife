var defaultCalendarBodyTemplate = 'We have given <<username>> read access to the following calendars: <<CalendarsRead>>\nWe have given them write access to the following calendars: <<CalendarsWrite>>'
var defaultCalendarSubjectTemplate = 'Calendars Shared'

function createCalendarFormAndConfig (calendarIDs, form) {
	var ret = {}
	ret.form = createCalendarAddForm(calendarIDs,form);
	ret.configTable = {
		'Username':'Username',
		'CalendarsRead':'Calendars (Read Access)',
		'CalendarsWrite':'Calendars (Write Access)',
		'CalendarKeys':calendarIDs.map(function (cid) {
			return CalendarApp.getCalendarById(cid).getName()
		}),
		'CalendarVals':calendarIDs,
	} // end configTable
	return ret; 
} // end createCalendarFormAndConfig

function createCalendarAddForm (calendarIDs, form) {
  if (!form) {
    form = FormApp.create("Add Calendar Form");
    form.setTitle('Add Calendar Form');
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

function addUserToCalendarFromForm (results, calConfigSettings, emailTemplateSettings) {
	var calendarSettings = lookupField(calConfigSettings,results);
	var cals = calendarSettings.calendars.split(',');
	var user = calendarSettings.user;
	var calsAdded = [];
	cals.forEach( function (c) {
		var success = addUserToCalendar(user,c);
		if (success) {
			calsAdded.push(c);
		}
	})
	sendEmailUpdate(user,calsAdded);
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
  Calendar.Acl.insert(acl, calendarId);
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
