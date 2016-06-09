function addUserToCalendar (user, calendarId) {
  var calendarId = calendarId;
  var acl = {
    scope: {
      type: 'user',
      value: user
    },
    role: 'writer'
  };
  Calendar.Acl.insert(acl, calendarId);
}

function testAddUser () {
	user = 'hs@innovationcharter.org'
	allSchool =  'innovationcharter.org_4f5nt4qijeoblj11aj2q7hibdc@group.calendar.google.com' // All School
	addUserToCalendar(user,allSchool);
	hsCal = 'innovationcharter.org_0a0e0ddepor9shl5kfsvsvbt4c@group.calendar.google.com';
	addUserToCalendar(user,hsCal);
}

