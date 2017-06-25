
function addDefaultParams (params) {
    var defaults = {
      configSS : '1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk',
    }
    for (var key in defaults) {
      if (!params[key]) {
        params[key]=defaults[key]
      }
    }
}

function setupTests () {
  try {
    Logger.log("Already %s",setup);
  }
  catch (err) {
    Logger.log('Do setup!');
    tests = [] // global
    setup = true; // global
  }
}

function Test (o) { // test, params, metadata) {
  setupTests();
  Logger.log('Registering test: %s',o);
  Logger.log('We have %s tests so far',tests.length);
  
  if (!o.params) {o.params = {}}
    addDefaultParams(o.params);
    t = {
	run : function () {
	    if (o.setup) {o.params.setupResult = o.setup(o.params)}
	    try {
		var result = o.test(o.params);
		var success = true;
	    }
	    catch (err) {
		var result = err;
		var success = false;
	    }
	    if (o.cleanup) {o.cleanup(o.params,result,success)}
	    return {
		metadata:o.metadata,
		test:o.test,
		result:result,
		success:success
	    }
	},
	metadata : o.metadata,
	params : o.params,
    }
    tests.push(t)
    return t;
}

Test({
  test:function (a) {Logger.log('This one works every time: %s',a.a);},
  params:{a:'test param'},
  metadata:{name:'Successful test test',extra:'Arbitrary metadata allowed'}
});
Test({
  test:function (a) {Logger.log('This one fails every time: %s',a.a);a=duck;},
  params:{a:'test param'},
  metadata:{name:'Failing test test'}
});

function runTestSuite () {
    var results = []
    tests.forEach(function (test) {
	results.push(test.run())
    })
    results.forEach(function (r) {
      if (r.success) {
          console.log(r.metadata.name,'Success',r)
          Logger.log('SUCCESS: %s, result: %s',r.metadata.name,r.result)
      }
      else {
          console.error(r.metadata.name,r)
          Logger.log('FAILURE: %s',r)
      }
    });
}
    
