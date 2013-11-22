var app = {
  url: 'https://app.bentobudget.com',
  new_transactions_group_id: 1,
  current_envelope_id: null,
  init: function(){
    document.addEventListener('deviceready', app.onDeviceReady, false);
    $(document).bind("mobileinit", app.onJQMReady);
    $(document).bind('pagehide', app.onPageHide);
    $(document).bind('pagechange', app.onPageChange);
    $( document ).ajaxError(function( event, jqxhr, settings, exception ) {
      if (jqxhr.status == 401){
         $.mobile.changePage("#login");
      }
    });
  },
	onJQMReady: function(){
		$.support.cors = true;
    $.ajaxSetup({crossDomain: false, xhrFields: { withCredentials: true } });
	  $.mobile.allowCrossDomainPages = true;

    if (localStorage.email !== undefined){
      $('#email').val(localStorage.email);
      $('#remember').prop("checked", true);
    }

    $(document).on("click", "#signin", function(e){
     if (app.checkConnection()) {
        $.ajax({
          type: "POST",
          url: app.url + "/sessions",
          beforeSend: function() {$.mobile.loading('show')},
          complete: function() {$.mobile.loading('hide');},
          data: {email : $('#email').val(), password: $('#password').val()},
          dataType: 'json',
          success: function(response) {
              if ($('#remember').get(0).checked) {
                localStorage.email = $('#email').val();
              } else{
                localStorage.removeItem("email");
              }
              $.mobile.changePage("#envelopes");
          },
          error: function(e) {
              $('#errors').text(JSON.parse(e.responseText).error_message).show();
              console.error(JSON.parse(e.responseText).error_message);
          }
        });
        e.preventDefault();
     }
    });

    $(document).on("pageshow", "#envelopes", function () {
      $.getJSON(app.url + "/envelopes", function(data) {
         var grouped = _.groupBy(data, function(e){ return e.envelope_group.name });
         var items = [];
         _.each(grouped, function(value, key, list) {
            if (value[0].envelope_group.is_global == false){
              items.push('<li data-role="list-divider">' + key + '</li>');
            }
            _.each(value, function(envelope, key, list) {
            var item = '<li><a class="envelope" envelope_id="' + envelope.id + '" href="#transactions">' + envelope.name;
            if (envelope.envelope_group.id == app.new_transactions_group_id){
              item += '<span class="ui-li-count">' + envelope.transaction_count + '</span>';
            } else {
              var balance = parseFloat(envelope.balance);
              item += '<span class="ui-li-aside amount_class' + (balance < 0 ? ' negative'  : '') + '">' + balance.toFixed(2) + '</span>';
            }
            item += '</a></li>';
            items.push(item);
           });
         });
        $('#envelope-list').empty().append(items.join('')).listview('refresh'); 
      });
    });

    $("#envelopes").on("click", "a.envelope", function () {
      $('#transaction-list').empty();
      app.current_envelope_id =$(this).attr("envelope_id");
    });

    $(document).on("pageshow", "#transactions", function () {
      $.getJSON(app.url + "/envelopes/" + app.current_envelope_id + "/transactions/?days=30", function(data) {
        var items = [];
        _.each(data, function(transaction, key, list) {
           var amt = parseFloat(transaction.amount);
           var amount_class = (amt < 0) ? "negative" : "";
           items.push('<li>' + transaction.date_formatted + ' - ' + transaction.name + '<span class="ui-li-aside ' + amount_class + '">' + amt.toFixed(2) + '</span></li>');
         });
         if (items.length == 0) {
          items.push('<li>(No Recent Transactions)</li>');
         }
         
         $('#transaction-list').empty().append(items.join('')).listview('refresh');
      });
    });

    $(document).on("pageshow", "#accounts", function () {
       $.getJSON(app.url + "/accounts",  function( data ) {
         var items = [];
         $.each(data, function(i, item) {
           var balance = parseFloat(item.balance);
           var balance_class = (balance < 0) ? "negative" : "";
           items.push('<li>' + item.name + '<span class="ui-li-aside ' + balance_class + '">' + balance.toFixed(2) + '</span></li>');
         });
         $('#account-list').empty().append(items.join('')).listview('refresh');
      });
    });
	},
	onDeviceReady: function() {
    //
  },
  checkConnection: function(){
    try{
      var networkState = navigator.connection.type;
      if (networkState == Connection.NONE){
          navigator.notification.alert(
              'Not able to connect to the internet.  Please check your network connection.',  // message
              null,                 // callback
              'Offline',                              // title
              'Ok'                                 // buttonName
          );

        return false;
       } else{
        return true;
       }
     } catch(err){
      console.error(err);
      return true;
     }

  },
  onPageHide: function(e){
    //
  },
  onPageChange: function(e){
     FastClick.attach(document.body);
     $.mobile.defaultPageTransition = 'none';
  }
};