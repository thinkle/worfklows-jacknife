/**
Backup Timer Framework

Here's how this WILL work for now (see below for future ideas)

[1] We create an easy method to re-run form triggers that have failed.
[2] We make every form trigger log its own success
[3] We create timer methods to automatically re-run form triggers that did not run.

Here's how the backup should work:

(1) Every blade action needs to log sucess or failure
(2) We periodically run a backup timer process that checks EVERY form entry that has driven us before.
(3) We re-run triggers in cases where there was a clear error in the process...

The precursor to this was ApprovalOnTimerCleanup and ApprovedApprovalOnTimerCleanup 

**/

function rerunTrigger (form, responseId) {
    var resp = form.getResponse(responseId);
    var fakeEvent = {
        source: form,
        response: resp
    };
    onFormSubmitTrigger(fakeEvent);
}

function rerunTriggersFromSheet (ssid, sid) {
    var ss = SpreadsheetApp.openById(ssid)
    var sheet = getSheetById(ss,sid)
    var t = Table(sheet.getDataRange());
    for (var rn=1; rn<t.length; rn++) {
        var r = t[rn]
        if (r.Form && r.Response && r.Resubmit && !r.Completed) {
            console.log('Resubmit %s %s',r.Form,r.Response);
            var form = FormApp.openById(r.Form)
            try {
                rerunTrigger(form,r.Response);
                r.Completed = true;
            }
            catch (e) {
                console.log('Error rerunning trigger: %s',e);
                r.Completed='Error: '+e;
            }
        }
    }
}

function testRerunTriggersFromSheet () {
    rerunTriggersFromSheet(
        '12aHV1f8ss0HdxPW9YWWpEsPJoabxNgBc7-jHnk1_NL0',
        0
    );
}

function testRerunTrigger () {
    var form = FormApp.openById('1FAIpQLSe27CBM2gtrHeHHgv3IyCYwmrorIAekgSk7qUibGuwLiQrqhg');
    var count = 0
    form.getResponses().forEach(
        function (resp) {
            var rid = resp.getId()
            if (count == 0) {
                rerunTrigger(form,rid);
            }
            count += 1;
        }
    );
}

