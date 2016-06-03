function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function sendEmail (email, subject, htmlBody) {
  Logger.log('Result of sendmail=>');
  Logger.log(JSON.stringify(
    MailApp.sendEmail(
      {to:email,
       htmlBody:htmlBody,
       subject:subject}
      )
    )
             )
}


function sendFormResultEmail (results, configTemplate) {
}

function sendEmailFromTemplate (email, subj, template, fields, fixWhiteSpace) {
  sendEmail(email, subj, applyTemplate(template, fields, fixWhiteSpace));
}

function applyTemplate (template, fields, fixWhiteSpace) {
  if (fixWhiteSpace) {
    template = template.replace(/\n/g,'<br>');
  }
  for (var target in fields) {
    var replacement = fields[target];
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
  

  
  