VERBOSITY = 1

function doLog (verbosity) {    
  if (VERBOSITY >= verbosity) {
    var args = Array.prototype.slice.call(arguments);
    args.shift()    
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
	sendEmail(to, subject, msg, true);
	//sendEmail('thinkle@innovationcharter.org','Error in Budget Script',msg)
}

function assertEq (a, b) {
  if (a==b) {
    logVerbose(a+'='+b+'! Success');
  }
  else {
    Logger.log('ASSERTION ERROR: '+JSON.stringify(a)+'!='+JSON.stringify(b))
    throw 'AssertionError'+JSON.stringify(a)+'!='+JSON.stringify(b);
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
