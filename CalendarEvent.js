function toDate (timeString) {
  timeString = timeString.replace(/-/g,"/");
  var d = new Date(timeString);
  Logger.log('toDate %s=>%s',timeString,d);
  return d;
}

function addEvent (calId, eventParams) {
    if (eventParams.hasOwnProperty('onlyAddIf')) {
	    logNormal('Checking onlyAddIf');
	    if (! checkBool(eventParams.onlyAddIf)) {
		    logNormal('Not adding event: %s',eventParams)
		return 'No Event Added'
	    }
    }
    var cal = CalendarApp.getCalendarById(calId);
    logVerbose('cal.createEvent - cal=%s params=%s',cal,eventParams);
    if (eventParams.startTime && eventParams.endTime) {
	var startTime = new toDate(eventParams.startTime)
	var endTime = new toDate(eventParams.endTime)
	// If we end before we start, let's assume we should shift
	// the end time by twelve hours :)
	if (startTime > endTime) {
	    Logger.log('Silently fixing AM/PM issue');
	    endTime.setHours(endTime.getHours()+12)
        Logger.log('Have times: %s - %s',startTime,endTime);
	}
	var e = cal.createEvent(
	    eventParams.title,
	    startTime,
	    endTime,
	    eventParams.options
	    // options can consiste of...
	    // description
	    // location
	    // guests
	    // sendInvites
	); 
    }
    else {
	var e = cal.createAllDayEvent(
	    eventParams.title,
	    toDate(eventParams.date),
	    eventParams.options
	);
    }
    logNormal('Created event %s',e);   
    return e
} // end addEvent


function testDate() {
  d = new Date('2016-09-20');
  Logger.log('Date: %s',d);
  d2 = new Date('09/20/2016');
  Logger.log('AmeriDate: %s',d2);
  d3 = new Date(Date.parse('2016/09/20 09:45'));
  Logger.log('Pargins: %s',d3);
}


TESTID = 'innovationcharter.org_classroom43755ae1@group.calendar.google.com'

function testAddEvent () {
  addEvent(
    TESTID,
    {
      title:'Test Event',
      //startTime: new Date('2016-09-19 09:30:00 GMT-0400'),
      startTime: "2016-09-19 09:30",
      //endTime: new Date('2016-09-19 10:30:00 GMT-0400'),
      endTime: "2016-09-19 10:30",
      options: {
        description : 'Test Description',
        location : 'Test Location',
        guests : 'website@innovationcharter.org',
        sendInvites: false
      },
    }      
    );
  addEvent(
    TESTID,
    {
      title:'Test Event AM/PM FIX!',
      //startTime: new Date('2016-09-19 09:30:00 GMT-0400'),
      startTime: "2016-09-19 09:30",
      //endTime: new Date('2016-09-19 10:30:00 GMT-0400'),
      endTime: "2016-09-19 04:30",
      options: {
        description : 'Test Fix AM PM Description',
        location : 'Test Location',
        guests : 'website@innovationcharter.org',
        sendInvites: false
      },
    }      
    );
  addEvent(
    TESTID,
    {title:'Test AllDay Event',
     date: "2016-09-19",
     options:{
       description:'All Day Event Description',
       location:'Location Test',
       guests:'website@innovationcharter.org',
       sendInvites:false,}
    }
    );
}


function addCalendarEventFromForm(responses,ceConfig) {
  var fields = lookupFields(ceConfig, responses);
  params = {
    title : fields.Title,
    options: {
      description : applyTemplate(fields.Description,
																	getTemplateFields(fields,responses)),
      location : fields.Location,     
      guests : fields.Guests,
      sendInvites : fields.SendInvites,
    }
  }
	if (fields.hasOwnProperty('onlyAddIf')) {
		params.onlyAddIf = fields.onlyAddIf
	}
  if (ceConfig.Date) {
    params.date = fields.Date
  }
  else {
    params.startTime = fields.startTime
    params.endTime = fields.endTime
  }
  Logger.log('addEvent(%s,%s)',fields.CalendarID,params);
  return addEvent(fields.CalendarID, params);
}

function createCalEventConfig (params) {
  config = {
    CalendarID:params.CalendarID ? params.CalendarID : 'PASTE_ID_HERE',
    Title:params.Title ? params.Title : 'Title',
    Date:params.Date ? params.Date : 'Date',
    Location:params.Location ? params.Location : 'Location',
    Description:params.Description ? params.Description : 'Description',
		onlyAddIf:params.hasOwnProperty('onlyAddIf') ? params.onlyAddIf : true,
  }
	handleLookups(config,params);
	return config
}

function createCalEventTestForm () {
  form = FormApp.create('Add Event Form');
  form.setTitle('Add Event Form');
  form.addTextItem().setTitle('Title');
  form.addTextItem().setTitle('Location');
  form.addTextItem().setTitle('Description');
  form.addDateItem().setTitle('Date');  
}

function testCreateCalEventSettings () {
  var calForm = createCalEventTestForm();
  var calConfig = createCalEventConfig();
  calConfig.CalendarID = TESTID; 
  var params = {};
  createCalendarEventSettings(form, calConfig, params)
}

function createCalEventTestTrigger () {
  // Add-On Dry Run Won't let us set up triggers...
  // So here's a manual trigger creator  
  form = FormApp.openById("1X8VqulYOL8P6V1vfAN6I_YnbcmQC1VfLbjC4gbTjEEc");
  controlSS = SpreadsheetApp.openById("13J7v8UvtHFB0L7k0qJrDPIuZHRMaT01Ayas47jxion8");
  createFormTrigger(form, controlSS);
}
 
