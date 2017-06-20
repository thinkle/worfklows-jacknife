function getOrCreate (ss, name) {
    try {
	return ss.insertSheet(name);
    }
    catch (err) {
	return ss.getSheetByName(name);
    }
}

function setupPivot () {
    var ssid='1U2MpGDV9RmczNYJ38z4D-5Pps7_wQlhl_CeSdMVhQRk';
    var ss = SpreadsheetApp.openById(ssid);  
    var logSheet = getSheetById(ss,'0');
    var metaSheet = getOrCreate(ss,'Budget Overview Sheets');
    var metaTable = Table(metaSheet.getDataRange(),'Account');
    var table = Table(logSheet.getDataRange());
    var caCol = (table.headers.indexOf('Cost Account')+1).toFixed();
    var csaCol = (table.headers.indexOf('Cost Sub-Account')+1).toFixed();
    var costCol = (table.headers.indexOf('Total Cost')+1).toFixed();
    var sigCol = (table.headers.indexOf('Signature')+1).toFixed();
    Logger.log('%sCol %sCol %sCol',caCol,csaCol,costCol);
    var opts = getIACSOptions ()
    opts['Cost Account Type'].forEach(function (caVal) {
	var importRange = 'importrange("'+ssid+'","A1:ZZZ200000")';
	//var targetSS = SpreadsheetApp.openById('1sUoQcyQLiW-dyEyI5v5NyOSYmIwLkk3Ov-AZK3AD_J4');
	if (metaTable.hasRow(caVal)) {
	    targetSS = SpreadsheetApp.openByUrl(metaTable.getRow(caVal)['Spreadsheet']);
	}
	else {
	    targetSS = SpreadsheetApp.create('FY17 Purchase Log: '+caVal);
	    metaSheet.appendRow([caVal,targetSS.getUrl()]);
	}
	var sheet = getSheetById(targetSS,0);
	sheet.setName(caVal+' Approved Purchases');
	var formula = 'query('+importRange+',"select * where (Col'+caCol+'=\''+caVal+'\' and Col'+sigCol+'<>\'\')")'
	sheet.getRange(1,1).setFormula(formula);
	sheet.getRange(1,costCol,sheet.getLastRow(),1).setNumberFormat("$#,##0.00");
	var pivotFormula = 'query('+importRange
	pivotFormula += ',"select sum(Col'+costCol+') where (Col'+caCol+'=\''+caVal+'\' and Col'+sigCol+'<>\'\')'
	pivotFormula += 'pivot (Col' + csaCol + ')")';
	var pivotSheet = getOrCreate(targetSS,'By Sub-Account')
	pivotSheet.getRange(1,1).setFormula(pivotFormula);
	pivotSheet.getDataRange().setNumberFormat("$#,##0.00")
	var enableTab = getOrCreate(targetSS,'Click here to enable')
	enableTab.getRange(1,1).setFormula(
	    'importrange("'+ssid+'","A1:A2")'
	);
	enableTab.getRange(1,2).setValue("Click on the cell to the left and link the spreadsheets. Once you've done that, you can move this tab out of the way. The other tab will contain your budget information.")
	    .setWrap(true)       
	    .setFontWeight('bold');    
	enableTab.setTabColor('#44ff44');
	targetSS.setActiveSheet(enableTab);
	targetSS.moveActiveSheet(1);
	sheet.setFrozenColumns(2);
	[pivotSheet,sheet,targetSS].forEach(function (s) {      
	    s.setFrozenRows(1);
	    try {
		s.getRange(1,1,1,table.headers.length)
		    .setBackground('#721242')
		    .setFontColor('#dfdfdf')
		    .setFontWeight('bold');    
	    }
	    catch (err) {Logger.log('Error %s',err);}
	});
    });
    opts['Cost Sub-Account Type'].forEach(function (csaVal) {
	var importRange = 'importrange("'+ssid+'","A1:ZZZ200000")';
	//var targetSS = SpreadsheetApp.openById('1sUoQcyQLiW-dyEyI5v5NyOSYmIwLkk3Ov-AZK3AD_J4');
	if (metaTable.hasRow(csaVal)) {
	    targetSS = SpreadsheetApp.openByUrl(metaTable.getRow(csaVal)['Spreadsheet']);
	}
	else {
	    targetSS = SpreadsheetApp.create('FY17 Purchase Log: '+csaVal);
	    metaSheet.appendRow([csaVal,targetSS.getUrl()]);
	}
	var sheet = getSheetById(targetSS,0);
	sheet.setName(csaVal+' Approved Purchase Information');
	//var caVal = 'Technology (TH)';
	var formula = 'query('+importRange+',"select * where (Col'+csaCol+'=\''+csaVal+'\' and Col'+sigCol+'<>\'\')")'
	sheet.getRange(1,1).setFormula(formula);
	sheet.getRange(1,costCol,sheet.getLastRow(),1).setNumberFormat("$#,##0.00");
	var enableTab = getOrCreate(targetSS,'Click here to enable')
	enableTab.getRange(1,1).setFormula(
	    'importrange("'+ssid+'","A1:A2")'
	);
	enableTab.getRange(1,2).setValue("Click on the cell to the left and link the spreadsheets. Once you've done that, you can move this tab out of the way. The other tab will contain your budget information.")
	    .setWrap(true)       
	    .setFontWeight('bold');
	enableTab.setTabColor('#44ff44');
	targetSS.setActiveSheet(enableTab);
	targetSS.moveActiveSheet(1);
	sheet.setFrozenColumns(2);
	[sheet,targetSS].forEach(function (s) {      
	    s.setFrozenRows(1);
	    try {
		s.getRange(1,1,1,table.headers.length)
		    .setBackground('#721242')
		    .setFontColor('#dfdfdf')
		    .setFontWeight('bold');    
	    }
	    catch (err) {Logger.log('Error %s',err);}
	});  
    });
}
