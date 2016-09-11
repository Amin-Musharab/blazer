//= require ./jquery
//= require ./jquery_ujs
//= require ./turbolinks
//= require ./list
//= require ./stupidtable
//= require ./jquery.stickytableheaders
//= require ./selectize
//= require ./highlight.pack
//= require ./moment
//= require ./moment-timezone
//= require ./daterangepicker
//= require ./Chart.js
//= require ./chartkick
//= require ./ace/ace
//= require ./ace/ext-language_tools
//= require ./ace/theme-twilight
//= require ./ace/mode-sql
//= require ./ace/snippets/text
//= require ./ace/snippets/sql
//= require ./Sortable
//= require ./bootstrap

$(document).on('mouseenter', '.dropdown-toggle', function () {
  $(this).parent().addClass('open');
});

$(document).on('ajax:complete', '.refresh-link', function () {
  Turbolinks.visit(window.location.pathname + window.location.search);
});

$(document).on("submit", "form[method=get]", function() {
  Turbolinks.visit(this.action+(this.action.indexOf('?') == -1 ? '?' : '&')+$(this).serialize());
  return false;
});

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function cancelQuery(runningQuery) {
  runningQuery.canceled = true;
  var xhr = runningQuery.xhr;
  if (xhr) {
    xhr.abort();
  }
  remoteCancelQuery(runningQuery);
  queryComplete();
}

function csrfProtect(payload) {
  var param = $("meta[name=csrf-param]").attr("content");
  var token = $("meta[name=csrf-token]").attr("content");
  if (param && token) payload[param] = token;
  return new Blob([JSON.stringify(payload)], {type : "application/json; charset=utf-8"});
}

function remoteCancelQuery(runningQuery) {
  var path = window.cancelQueriesPath;
  var data = {run_id: runningQuery.run_id, data_source: runningQuery.data_source};
  if (navigator.sendBeacon) {
    navigator.sendBeacon(path, csrfProtect(data));
  } else {
    // TODO make sync
    $.post(path, data);
  }
}

var queriesQueue = [];
var runningQueries = 0;
var maxQueries = 3;

function queueQuery(callback) {
  queriesQueue.push(callback);
  runNext();
}

function runNext() {
  if (runningQueries < maxQueries) {
    var callback = queriesQueue.shift();
    if (callback) {
      runningQueries++;
      callback();
      runNext();
    }
  }
}

function queryComplete() {
  runningQueries--;
  runNext();
}

function runQuery(data, success, error, runningQuery) {
  queueQuery( function () {
    runningQuery = runningQuery || {};
    runningQuery.run_id = data.run_id = uuid();
    runningQuery.data_source = data.data_source;
    return runQueryHelper(data, success, error, runningQuery);
  });
}

function runQueryHelper(data, success, error, runningQuery) {
  var xhr = $.ajax({
    url: window.runQueriesPath,
    method: "POST",
    data: data,
    dataType: "html"
  }).done( function (d) {
    if (d[0] == "{") {
      var response = $.parseJSON(d);
      data.blazer = response;
      setTimeout( function () {
        if (!(runningQuery && runningQuery.canceled)) {
          runQueryHelper(data, success, error, runningQuery);
        }
      }, 1000);
    } else {
      success(d);
      queryComplete();
    }
  }).fail( function(jqXHR, textStatus, errorThrown) {
    var message = (typeof errorThrown === "string") ? errorThrown : errorThrown.message;
    error(message);
    queryComplete();
  });
  if (runningQuery) {
    runningQuery.xhr = xhr;
  }
  return xhr;
}

function submitIfCompleted($form) {
  var completed = true;
  $form.find("input[name], select").each( function () {
    if ($(this).val() == "") {
      completed = false;
    }
  });
  if (completed) {
    $form.submit();
  }
}

// Prevent backspace from navigating backwards.
// Adapted from Biff MaGriff: http://stackoverflow.com/a/7895814/1196499
function preventBackspaceNav() {
  $(document).keydown(function (e) {
    var preventKeyPress;
    if (e.keyCode == 8) {
      var d = e.srcElement || e.target;
      switch (d.tagName.toUpperCase()) {
        case 'TEXTAREA':
          preventKeyPress = d.readOnly || d.disabled;
          break;
        case 'INPUT':
          preventKeyPress = d.readOnly || d.disabled || (d.attributes["type"] && $.inArray(d.attributes["type"].value.toLowerCase(), ["radio", "reset", "checkbox", "submit", "button"]) >= 0);
          break;
        case 'DIV':
          preventKeyPress = d.readOnly || d.disabled || !(d.attributes["contentEditable"] && d.attributes["contentEditable"].value == "true");
          break;
        default:
          preventKeyPress = true;
          break;
      }
    }
    else {
      preventKeyPress = false;
    }

    if (preventKeyPress) {
      e.preventDefault();
    }
  });
}
