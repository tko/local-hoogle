var optTypeahead = true;
var optTypeaheadMinLength = 2;

// frontend

var tmplHoogleLink = '<a href="{{ location }}" target="hoogle-frame" title="{{ docs }}">{{ name }}</a>';

$(function () {
  $('#hoogle-form').on('submit', function(e) {
    e.stopPropagation();
    e.preventDefault();

    var $input = $('#hoogle-input');
    hoogle($input.val());

    $input.blur().focus();
  });

  if (optTypeahead) {
    $('#hoogle-input').on('input', function(ev) {
      var query = $(this).val();
      if (query.length >= optTypeaheadMinLength) {
        hoogle(query);
      } else {
        $('#hoogle-error').hide();
      }
    });
  }
});

var renderHoogleLink = function(row) {
  return String(tmplHoogleLink).replace(/{{\s*(\S+?)\s*}}/g, function(m, name) {
    return escapeHtml(row[name]);
  });
}

var hoogle = makeHoogle({
  reset: function() {
    var table = $('#hoogle-table').DataTable({
      "dom": 't',
      "orderFixed": [[0, "asc"], [1, "asc"]],
      "columns": [
        { // 0
          "data": "kind",
          "render": function(kind, type, row, meta) {
            if (type === 'sort') { // type=filter|display|type|sort
              return row['sortByKind'];
            }
            return "<span class='label label-default'>" + kind + "</span>";
          }
        },
        { // 1
          "data": "name",
          "render": function(name, type, row, meta) {
            if (type === 'sort') { // type=filter|display|type|sort
              return name;
            }
            return renderHoogleLink(row);
          }
        }
      ],

      "info": false,
      "retrieve": true,
      "paging": false,
      "searching": false
    });

    table.clear().draw();
    $('#hoogle-error').hide();

    return table;
  },
  add: function(results, table) {
    table.rows.add(results).draw();
  },
  error: function(parseError, table) {
    $('#hoogle-error').text(parseError).show();
  }
});

// backend / support

function makeHoogle(self) {
  var ctx;
  var currentQueryId = 0;

  function fetch(text, start) {
    var data = {"hoogle": text, "mode": "json", "count": 50 };
    if (start !== undefined) {
      data['start'] = start;
    }

    if (start === undefined) {
      ctx = self.reset();
    }

    var myQueryId = ++currentQueryId;

    $.ajax({ data: data })
    .done(function(data) {
      if (myQueryId !== currentQueryId) {
        return;
      }

      if (data.parseError) {
        self.error(data.parseError, ctx);
      } else if (data.results.length) {
        self.add(data.results.map(postprocessInPlace), ctx);

        var next = (start|0) + data.results.length + 1;
        fetch(text, next);
      }
    });
  }

  return fetch;
}

function postprocessInPlace(item) {
  var m = /^(data|package|class|module|keyword|type)\s+(.*?)$/.exec(item.self);
  if (m) {
    item.kind = m[1].charAt(0).toUpperCase();
    item.name = m[2];
  } else {
    item.kind = "F";
    item.name = item.self;
  }
  // function, data, type, class, module, package, keyword
  item.sortByKind = "FDTCMPK".indexOf(item.kind);
  return item;
}

var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'\/]/g, function(s) {
    return entityMap[s];
  });
}
