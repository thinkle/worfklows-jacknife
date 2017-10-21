VERBOSITY = 1

function testLogNormal () {
  logNormal('Foo bar baz %s','what what?');

}

function doLog (verbosity) {    
  if (VERBOSITY >= verbosity) {
    var args = Array.prototype.slice.call(arguments);
    args.shift()
		args = args.map(tidyLog)
    console.log.apply(console,args);
    Logger.log.apply(Logger,args)
  }
}

logVerbose = function () {
	args = [5]
	args.push.apply(args,arguments)
	doLog.apply(doLog,args)
}
logNormal = function () {
	args = [1]
	args.push.apply(args,arguments)    
	doLog.apply(doLog,args)
}
logAlways = function () {
	args = [-1]
	args.push.apply(args,arguments)
	doLog.apply(doLog,args)
}

function emailError (msg, err, params) {
    if (! params) {params = {}};
    subject = params.subject ? params.subject : 'Error';
    to = params.to ? params.to : 'thinkle@innovationcharter.org';
    msg += '<br>Error '+err;
    msg += '<br>Exception: '+err.name+': '+err.message;
    msg += '<br>Stack: '+err.stack
    console.log('Emailing error: %s, %s',subject,msg);
    sendEmail(to, subject, msg, true);
    //sendEmail('thinkle@innovationcharter.org','Error in Budget Script',msg)
}

function assertEq (a, b) {
  if (a==b) {
    logVerbose(a+'='+b+'! Success');
  }
  else {
    Logger.log('ASSERTION ERROR: '+shortStringify(a)+'!='+JSON.stringify(b))
    throw 'AssertionError'+shortStringify(a)+'!='+JSON.stringify(b);
  }
}

function testLogs () {
	[-1,1,10].forEach( function (l) {
      VERBOSITY = l
      Logger.log('Testing verbosity level %s',l);
		logNormal('Log normal message - verbosity=%s',l)
		logVerbose('Log verbose message - verbosity=%s',l)
		logAlways('Log always message - verbosity=%s',l)
	});
}

function testError () {
	try {
		Logger.log('Here we go');
		var soup = bar * 3 + 6
	}
	catch (err) {
		emailError('Oops',err);
	}
}

function tidyLog (obj) {return obj}

function tidyLogSucks (obj) {
	if (Array.isArray(obj)) {
		return obj.map(tidyLog)
	}
	if (typeof obj == 'object') {
		var objCopy = {}
		for (key in obj) {
			var val = obj[key]
			objCopy[key] = val
			if (typeof val == 'string') {
				if (val.length > 20) {
					objCopy[key] = val.substr(0,17)+'...'
				}
			}
			if (Array.isArray(val)) {
				objCopy[key] = val.map(function (o) {return tidyLog(o)});
			}
			if (typeof val == 'object') {
				objCopy[key] = tidyLog(val)
			}
		}
		return objCopy
	}
	else {
		return obj
	}

}

function testTidyLog () {
	bigObj = {}
	bigSubObj = {}
	bugSubSub = {}
	bigObj['subObj'] = bigSubObj
	bigSubObj['subObj'] = bigSubSub
	for (var i=0; i<20; i++) {
		bigObj[i] = 'Foo is a long string'
		bigObj[i+'Foo'] = 'Foo is a longer string'
		bigObj[i+'FooFoo'] = paragraphify('Foo is an even much longer string. ')
		bigSubObj[i] = bigObj[i];
		bigSubSub[i] = bigObj[i];
		bigSubObj[i+'Foo'] = bigObj[i+'Foo'];
		bigSubSub[i+'FooFoo'] = bigObj[i+'Foo'];
		bigSubObj[i+'Foo'] = bigObj[i+'FooFoo'];
		bigSubSub[i+'FooFoo'] = bigObj[i+'FooFoo'];		
	}
	logNormal('Log: %s',bigObj);
}

function shortStringify (obj) {
	return JSON.stringify(tidyLog(obj))
}
