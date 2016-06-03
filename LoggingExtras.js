VERBOSITY = 1

function doLog (verbosity, s) {
  if (VERBOSITY >= verbosity) {
    Logger.log(s)
  }
}

logVerbose = function (s) {doLog(5,s)}
logNormal = function (s) {doLog(1,s)}
logAlways = function (s) {doLog(-1,s)}

function assertEq (a, b) {
  if (a==b) {
    logVerbose(a+'='+b+'! Success');
  }
  else {
    Logger.log('ASSERTION ERROR: '+JSON.stringify(a)+'!='+JSON.stringify(b))
    throw 'AssertionError'+JSON.stringify(a)+'!='+JSON.stringify(b);
  }
}