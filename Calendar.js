function createCalendarAddForm (calendarIDs, form) {
  if (!form) {
    form = FormApp.create("Add Calendar Form");
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

