/*
 Apache License, Version 2.0.
*/


var field_dict = {}

var req = {}, silence =false, req_result = true, test = 1, url_id = -1, fields, nxt_url, nxt_complete_url; 
req['type'] = 'postRequest';

var MOVE_COOLDOWN_PERIOD_MS = 400,
    X_KEYCODE = 88,
    nodeCountEl = document.getElementById("node-count"),
    elementGroup = {},
    elementGroupNames = ["query", "similar", "minimal", "results", "queries"],
    nodeCountText = document.createTextNode("0");
nodeCountEl.appendChild(nodeCountText);
var lastMoveTimeInMs = 0,
    save_id = -1, 
    current_row = [], 
    current_result_row=[],
    evaluateQuery = function() {
        var a = {
            type: "evaluate"
        };
        _.each(elementGroup, function(b) {
            var c;
            "textarea" == b.type ? c = b.value && "" !== b.value.trim() ? b.value : void 0 : "checkbox" == b.type && (c = b.checked);
            a[b.id] = c
        });
        // console.log("EVALUATE PARAM FROM BARJS")
        // console.log(a); 
        chrome.runtime.sendMessage(a)
    },
    handleRequest = function(a, b, c) {
        "update" === a.type ? (null !== a.query && undefined !== a.query && (elementGroup.query.value = a.query, detect_field(a.query, a.results[0])), null !== a.results && (elementGroup.results.value = a.results[0], nodeCountText.nodeValue = a.results[1])) : "addQuery" === a.type ? (b=document.createElement("option"), b.text=a.data, b.value=a.data, elementGroup.queries.appendChild(b), elementGroup.queries.selectedIndex = 0) : "clearQuery" === a.type ? (document.getElementById("queries").innerHTML="") : "postResponse" === a.type && handleResponse(a); 
        // console.log(a);
    },
    handleMouseMove = function(a) {
        a.shiftKey && (a = (new Date).getTime(), a - lastMoveTimeInMs < MOVE_COOLDOWN_PERIOD_MS || (lastMoveTimeInMs = a, chrome.runtime.sendMessage({
            type: "moveBar"
        })))
    },
    handleKeyDown = function(a) {
        var b = a.ctrlKey || a.metaKey,
            c = a.shiftKey;
        a.keyCode === X_KEYCODE && b && c && chrome.runtime.sendMessage({
            type: "hideBar"
        })
    },
    handleResponse = function(a) {
        console.log(a);
        if(a['request']['test']=='1' && a['request']['type'] == 'get_this' && a['data']['status'] == 'success') {
            $(".manage-pane").toggleClass("loggedout"); 
            test = 0;
        }
        if(a['data']['status'] == 'error') {
            alert(a['data']['msg']); 
        }
        if(a['data']['status'] != 'success') {
            req_result = false
            return ; 
        }

        if(a['request']['type'] == 'login') {
            var dbs_sel = document.getElementById("databases"); 
            dbs_sel.innerHTML = '';
            for(var db in a['data']['databases']) {
                console.log(db);
                var option = document.createElement('option');
                option.value = a['data']['databases'][db]['id']
                option.text = a['data']['databases'][db]['name']
                dbs_sel.add(option);
            }
            document.getElementById('databases').disabled = false;
            document.getElementById('go_btn').disabled = false;

            localStorage.setItem('user', a['data']['user']); 

            req_result = true;
            return ; 
        }

        if(a['request']['type'] == 'get_this') {
            if(a['data']['data'].length == 0) {
                current_row = [];
                document.getElementById("dbrow").innerHTML = "Not registered to database!"; 
                document.getElementById("dbfield").disabled=true;
                document.getElementById("save-attr").disabled=true;
                document.getElementById("save-result").disabled=true;
                document.getElementById("review").disabled=true;
                document.getElementById('savelistingurl').style.display = 'block';
                req_result = true;
                return  ;
            }

            fields = a['data']['fields'];
            var container = document.getElementById("dbfield");
            container.innerHTML = '<option value="-">-</option>';
            for(key in fields) {
                var option = document.createElement('option');
                option.value = key;
                option.text = fields[key]['name'];
                option.setAttribute('rule', fields[key]['rule']);
                container.add(option);
            }
            current_row = JSON.parse(a['data']['data'][0]['data']);
            current_result_row = JSON.parse(a['data']['data'][0]['data_results']);
            for(item in a['data']['fields']) {
                field_dict[item] = a['data']['fields'][item]['rule'].split(', '); 
            }
            url_id = a['data']['data'][0]['id'];
            document.getElementById("dbrow").innerHTML=a['data']['data'][0]['url']
            document.getElementById("dbfield").disabled=false;
            document.getElementById("save-attr").disabled=false;
            document.getElementById("save-result").disabled=false;
            document.getElementById("review").disabled=false;
            document.getElementById("dbfield").dispatchEvent(new Event('change'));

            if(a['data']['data'][0]['complete'] == true)
                document.getElementById('dbrow').style.backgroundColor = '#009F00';
            else 
                document.getElementById('dbrow').style.backgroundColor = 'transparent';

            nxt_url = 'http://'+ a['data']['nxt_url'];
            nxt_complete_url = 'http://'+ a['data']['nxt_complete_url'];

            req_result = true;
            return ; 
        }

        if(a['request']['type'] == 'completeinverse') {
            refreshdb();
        }

        if(a['request']['type'] == 'save') {
            if(a['data']['status'] == 'success') 
                refreshdb();
        }

    }, 
    detect_field = function(xpath, result) {
        var k, i;
        for(k in field_dict) {
            for(i = 0; i < field_dict[k].length; i ++) {
                try {
                    if(xpath.match(eval(field_dict[k][i]) || result.match(eval(field_dict[k][i])))) {
                        $("#dbfield").val(k); 
                    }
                } catch(err) {
                    console.log(err);
                    continue;
                }
            }
        }
        // $("#dbfield").val('-'); 
    }; 

document.getElementById('databases').disabled = true;
document.getElementById('go_btn').disabled = true;

document.getElementById("move-button").addEventListener("click", function() {
    chrome.runtime.sendMessage({
        type: "moveBar"
    })
});
document.addEventListener("keydown", handleKeyDown);
chrome.runtime.onMessage.addListener(handleRequest);
document.getElementById("queries").addEventListener("change", function(a) {
	document.getElementById("query").value = this.options[this.selectedIndex].value;
	// console.log("changeActiveQuery Called: set to  "+document.getElementById("query").value);
	evaluateQuery(document.getElementById("query").value);
});
for (var i = 0; i < elementGroupNames.length; i++) {
    var elem = document.getElementById(elementGroupNames[i]);
    "textarea" == elem.type ? elem.addEventListener("keyup", evaluateQuery) : "checkbox" == elem.type && elem.addEventListener("click", evaluateQuery);
    elementGroup[elementGroupNames[i]] = elem
}

function refreshdb() {
    user = localStorage.getItem('user');
    database = localStorage.getItem('database'); 
    req['param'] = {
        'type': 'get_this', 
        'home_url': '#####', 
        'test': test, 
        'user': user, 
        'database': database 
    }; 
    chrome.runtime.sendMessage(req);
}

$(document).ready(function() {

    var dbfield = $("#dbfield"); 
    var dbrow = $("#dbrow"); 
    var ts;
    var home_url = window.location;
    // req['param'] = [];

    refreshdb(); 

    if (typeof(Storage) === "undefined") {
        $(".manage-pane").html('<b class="box-name"> Sorry you can\'t use this feature!');
    }

    // Login and select DB -> GO
    $("#login").click(function() {
        req['param'] = {
            'type': 'login', 
            'username': $("#xh-username").val(), 
            "password": $("#xh-password").val()
        }
        chrome.runtime.sendMessage(req);
    }); 

    $("#go_btn").click(function() {
        localStorage.setItem('database', $("#databases").val()); 
        $(".manage-pane").toggleClass('loggedout');
        refreshdb();
    });

    $("#select-db").click(function() {
        localStorage.setItem('database', "-1"); 
        $(".manage-pane").toggleClass('loggedout');
    }); 

    $("#save-attr").click(function() {
        var field = dbfield.val();
        if(field === '-') {
            dbfield.css('border', '2px solid #f00');
            return; 
        }
        dbfield.css('border', 'none');
        var content = $("#query").val();
        // console.log("SAVING REQUEST: " + save_id + " | " + field + " - " + content); 
        req['param'] = {
            'type': 'save', 
            'home_url': '#####', 
            'field': field, 
            'content': content, 
            'result': $("#results").val(),
            'user': localStorage.getItem('user'), 
            'database': localStorage.getItem('database'), 
            'url_id': url_id
        };
        chrome.runtime.sendMessage(req);
    }); 

    $("#save-result").click(function() {
        var field = dbfield.val();
        var content = $("#results").val();
        if(field === '-') {
            dbfield.css('border', '2px solid #f00');
            return; 
        }

        dbfield.css('border', 'none');
        // console.log("SAVING REQUEST: " + save_id + " | " + field + " - " + content); 
        req['param'] = {
            'type': 'save', 
            'home_url': '#####', 
            'field': field, 
            'content': content, 
            'result': $("#results").val(),
            'user': localStorage.getItem('user'), 
            'database': localStorage.getItem('database'), 
            'url_id': url_id
        };
        chrome.runtime.sendMessage(req);
    }); 

    $("#savelistingurl").click(function() {
        req['param'] = {
            'type': 'saveurl', 
            'home_url': '#####', 
            field: "listing_url"
        };
        chrome.runtime.sendMessage(req);
    }); 

    $("#refresh-dbrow").click(function() {
        refreshdb(); 
    }); 

    $("#xh-remove").click(function() {
        req['type'] = 'remove-xh-elem'; 
        chrome.runtime.sendMessage(req);
    }); 

    $("#dbfield").change(function() {
        console.log(current_row);
        console.log($(this).val());
        console.log(current_row[''+$(this).val()]);
        $("#last_field_name").text($(this).children("option:selected").text()); 
        $("#last_field_value").text(current_row[''+$(this).val()]); 
    }); 

    $("#dbfield").change(); 

    $("#review").click(function() {
        var conatiner = $(".xh-review-section .modal-content > ul"), tp, cls, rp; 
        conatiner.html('');
        $(".xh-review-section .modal-header").html('<h2>'+$("#dbrow").text()+'</h2>');
        console.log(current_row);
        for(k in fields) {
            tp = '';
            if(current_row[k] == '') {
                tp = 'blank';
                rp = 'blank';
                cls = 'disabled'; 
            }
            else {
                tp = current_row[k];
                if (current_result_row == undefined)
                    rp = 'blank';
                else
                    rp = current_result_row[k]; 
                cls = '';
            }
            conatiner.append('<li> <label>'+fields[k]['name']+':</label><span class = "'+cls+'">'+tp+'</span><span class = "result '+cls+'">'+rp+'</span></li>'); 
        }
        if(Number(current_row['is_complete']) == 1)
            $("#markascomplete").text("Mark as Incomplete");
        $("#next_url").attr('href', nxt_url);
        $("#next_incomplete_url").attr('href', nxt_complete_url);
        chrome.runtime.sendMessage({
            'type': 'show-review-section', 
            'element': $(".xh-review-section").clone().wrap('<div/>').parent().html(), 
            'id': url_id
        }); 
    }); 

    $("#relative").change(function() {
        if($(this).prop('checked'))
            $("#query").attr('placeholder', 'Click right mouse button on each elements you want to get xpath from'); 
        else 
            $("#query").attr('placeholder', 'Hold shift key and hover over element you want to get xpath from'); 
        $("#query").val(''); 

        chrome.runtime.sendMessage({
            'type': 'change_relative_mode'
        }); 

    }); 

}); 
