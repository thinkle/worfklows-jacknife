function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function sendEmail (email, subject, htmlBody) {
  Logger.log('Result of sendmail=>%s, %s, %s',email,subject,htmlBody);
  Logger.log(JSON.stringify(
    MailApp.sendEmail(
      {to:email,
       htmlBody:htmlBody,
       subject:subject}
    )
  )
            )
}

function checkForSelfApproval (settings) {
	// We are checking whether the form allows self approval or what...
	if (! settings.allowSelfApproval || settings.allowSelfApproval=='0') {
		if (settings.FormUser==settings.Approver) {
			Logger.log('Uh oh self approval -- better fix it');
			if (settings.ApproverDefault != settings.FormUser) {
				settings.Approver = settings.ApproverDefault
			}
			else {
				// fallback
				settings.Approver = settings.ApproverBackup
			}
		}
	}
}

// function checkSelfApproval (val, addressSettings, results) {
// 	if (! addressSettings['PreventSelfApprove']) {return val}
// 	// Otherwise we *are* requiring that value != self
// 	if (val != results['FormUser']) {
// 		return val
// 	}
// 	if (results['EmailLookup']['Default']!=results['FormUser']) {
// 		return results['EmailLookup']['Default']
// 	}
// 	if (results['DefaultBackup']!=results['FormUser']) {
// 		return results['DefaultBackup']
// 	}
// }

function getEmail (addressSettings, results) {
  // Given somewhat complex addressSettings config sheet, get correct
  // email for results...
  // Email Field => Field that maps directly to email
  // ORRRRRR
  // Lookup Field => Field that tells us what to look up in the other fields
  if (addressSettings['Lookup Field']) {
    // If we have a lookup field...
    var fieldValue = results[addressSettings['Lookup Field']]
    var value = addressSettings[fieldValue]
    if (value) {
			return checkSelfApproval(value,addressSettings,results)
		}
    else {
      if (addressSettings['Default']) {
        return checkSelfApproval(addressSettings['Default'],addressSettings,results)
      }
    }
  }
  if (addressSettings['Email Field']) {
    return checkSelfApproval(results[addressSettings['Email Field']],addressSettings,results)
  }
}

function sendFormResultEmail (results, settings) {
  Logger.log('sendFormResultEmail'+JSON.stringify([results,settings]));
	var config = lookupFields(settings, results)
	// Add support for conditional email...
	if (config.hasOwnProperty('onlyEmailIf')) {
		Logger.log('Checking onlyEmailIf field!');
		if (! config.onlyEmailIf) {
			logNormal('Not sending email: \nresults:%s \nsettings:%s',results,settings);
			return 'No Email Sent';
		}
	}
	//
	var templateFields = {}
	for (var setting in results) {
		templateFields[setting] = spreadsheetify(results[setting]);
	} // end forEach result
	for (var setting in settings) {
		if (templateFields[setting]) {
			logAlways('sendFormResultsEmail - Potential conflict between results[%s]=>%s and settings[%s]=>%s; using results',
								setting, templateFields[setting], setting, settings[setting]
							 )
		}
		else {
			templateFields[setting] = spreadsheetify(settings[setting]);
		}
	} // end for each setting
	logNormal('config=>%s',config);
	if (config.emailFormUser) {
		config.To = results.FormUser+','+config.To
	}
	sendEmailFromTemplate(
    //getEmail(config, results),
		config.To,
    config.Subject,
    config.Body,
    templateFields,
    true
	);
	return {config:config,fields:templateFields}
}

function sendEmailFromTemplate (email, subj, template, fields, fixWhiteSpace) {
	debug = 0;
	if (debug) {
      msg = '<pre>';
		msg += 'Email being sent: here is what we got.\n';
		msg +=  'Template: '+template+'\n\n';
		msg += 'Fields: '+JSON.stringify(fields)+'\n\n';
		msg += 'Result: \nSubject: '+applyTemplate(subj,fields);
		msg += 'Result: \nBody: '+applyTemplate(template,fields,fixWhiteSpace);
    msg += '</pre>';
		emailError(msg, 'No real error :)', {'subject':'Email Debug Info: '+applyTemplate(subj,fields)});
	}
  sendEmail(email, applyTemplate(subj, fields), applyTemplate(template, fields, fixWhiteSpace));
}

function applyTemplate (template, fields, fixWhiteSpace) {
  if (fixWhiteSpace) {
    template = template.replace(/\n/g,'<br>');
  }
  for (var target in fields) {
    var replacement = spreadsheetify(fields[target]);
    template = template.replace(new RegExp(escapeRegExp('<<'+target+'>>'),'g'),replacement);
  }
  return template
}

function testTemplateEmail () {
  template = '<p>This is a <<adj>> paragraph. One day, Mr. <<name>> went on a walk and came upon a <<animal>>.</p><p>When Mr. <<name>> saw the <<animal>>, he <<verb1>>ed!</p><p>This ends my mad lib story. I hope you <<verb2>>ed it.</p>'
  fields = {
    animal: 'bear',
    name: 'Johnson',
    verb1: 'regulate',
    verb2: 'animate',
    adj: 'beautiful'
  }
  sendEmailFromTemplate('tmhinkle@gmail.com','Test Template Message',template, fields);
}


function testEmail () {
  sendEmail('tmhinkle@gmail.com','This is a test message from Workflows','<b>This is bold</b><br><table><tr><td>This</td><td>is</td></tr><tr><td><i>a</i></td><td>table</td></tr></table><h3>Heading!</h3>');
}

function testApplyTemplate () {
  assertEq(applyTemplate('foo <<bar>>',{bar:'yippee'}),'foo yippee')
  assertEq(applyTemplate('foo \n<<bar>>',{bar:'yippee'}),'foo \nyippee')
  assertEq(applyTemplate('foo \n<<bar>>',{bar:'yippee'},true),'foo <br>yippee') 
  assertEq(applyTemplate('foo \n<<bar>>\n<<bar>>\n',{bar:'yippee'},true),'foo <br>yippee<br>yippee<br>')
  assertEq(applyTemplate('<<first>>:<<middle>>:<<last>>',{'first':'Thomas','middle':'M','last':'Hinkle'}),
           'Thomas:M:Hinkle')
}




