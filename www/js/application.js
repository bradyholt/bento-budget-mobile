var app = {
  url: 'https://app.bentobudget.com/',
  new_transactions_group_id: 1,
  current_transactions_resource_url: null,
  current_transaction_id: null,
  envelope_select_populated: false,
  init: function(){
    document.addEventListener('deviceready', app.onDeviceReady, false);
    $(document).bind("mobileinit", app.onJQMReady);
    $(document).bind('pagehide', app.onPageHide);
    $(document).bind('pagechange', app.onPageChange);
    $.ajaxSetup({crossDomain: false, xhrFields: { withCredentials: true } });
    $.support.cors = true;
    $(document).ajaxSend(function() { $.mobile.loading('show'); });
    $(document).ajaxComplete(function() { $.mobile.loading('hide'); });
    $(document).ajaxError(function(event, jqxhr, settings, exception) {
      if (jqxhr.status == 401){
       $('#message').removeClass().addClass('info').text("Session timeout!").show();
       $.mobile.changePage("#login");
     }
   });
  },
  onDeviceReady: function() {
    //
  },
  onJQMReady: function(){
    $.mobile.allowCrossDomainPages = true;

    if (localStorage.email !== undefined){
      $('#email').val(localStorage.email);
      $('#remember').prop("checked", true);
    }

    $('a.logout').click(function(){
      $(this).removeClass("ui-btn-active");
      $('#message').removeClass().addClass('info').text("Logged out!").show();
    });

    //login
    $(document).on("pageshow", "#login", function () {
      $('#password').val('');
    });

    $("#login_form").submit(function(e) {
      e.preventDefault();
      if (app.checkConnection()) {
        $.ajax({
          type: "POST",
          url: app.url + "sessions",
          data: $(this).serialize(),
          dataType: 'json',
          success: function(response) {
            $('#message').hide();
            if ($('#remember').get(0).checked) {
              localStorage.email = $('#email').val();
            } else{
              localStorage.removeItem("email");
            }

            $.mobile.changePage("#envelopes");
          },
          error: function(e) {
            $('#message').removeClass().addClass('error').text(JSON.parse(e.responseText).error_message).show();
            console.error(JSON.parse(e.responseText).error_message);
          }
        });
      }
    });

    //envelopes
    $(document).on("pageshow", "#envelopes", function () {
      $.getJSON(app.url + "envelopes", function(data) {
       app.populateEnvelopeSelect(data);
       var grouped = _.groupBy(data, function(e){ return e.envelope_group.name });
       var items = [];
       _.each(grouped, function(value, key, list) {
        if (value[0].envelope_group.is_global == false){
          items.push('<li data-role="list-divider">' + key + '</li>');
        }
        _.each(value, function(envelope, key, list) {
            var item = '<li><a class="envelope transactions_link" resource_url="envelopes/' + envelope.id + '/transactions" href="#transactions">' + envelope.name;
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

    $(document).on("click", "a.transactions_link", function () {
      app.current_transactions_resource_url = $(this).attr("resource_url");
      $('#transactions_header').text($(this).clone().children().remove().end().text());
      $('#transaction-list').empty();
    });

   //transactions
    $(document).on("pageshow", "#transactions", function () {
      app.populateTransactionList();
    });

    $("#transaction_list_days").change(function(){
      app.populateTransactionList();
    });

    $(document).on("click", "a.transaction", function () {
      app.current_transaction_id = $(this).attr("transaction_id");
      $('#transaction_notes').val('');
      $('#edit_transaction_description').html($(this).html());
      $('#transaction_envelope_id_container').css('visibility', 'hidden');
    });

    $(document).on("pageshow", "#edit_transaction", function () {
     $.getJSON(app.url + "transactions/" + app.current_transaction_id + '/edit', function(data) {
      $('#transaction_envelope_id').val(data.envelope_id).selectmenu("refresh", true);
      $('#transaction_envelope_id_container').css('visibility', 'visible');
      $('#transaction_notes').val(data.notes);
    });
   });

    $("#edit_transaction_form").submit(function(e){
      e.preventDefault();
      if (app.checkConnection()) {
        $.ajax({
          type: "POST",
          url: app.url + "transactions/" + app.current_transaction_id,
          beforeSend: function() {$.mobile.loading('show')},
          complete: function() {$.mobile.loading('hide');},
          data: $(this).serialize(),
          dataType: 'json',
          success: function(response) { 
            $.mobile.back();
          }
        });
      }
    });

    //accounts
    $(document).on("pageshow", "#accounts", function () {
     $.getJSON(app.url + "accounts",  function( data ) {
       var items = [];
       $.each(data, function(i, item) {
         var balance = parseFloat(item.balance);
         var balance_class = (balance < 0) ? "negative" : "";
         items.push('<li><a class="account transactions_link" resource_url="accounts/' + item.id + '/transactions" href="#transactions">' + item.name + '<span class="ui-li-aside ' + balance_class + '">' + balance.toFixed(2) + '</span></a></li>');
       });
       $('#account-list').empty().append(items.join('')).listview('refresh');
     });
   });
  },
  checkConnection: function(){
    try{
      var networkState = navigator.connection.type;
      if (networkState == Connection.NONE){
        navigator.notification.alert(
              'Not able to connect to the internet.  Please check your network connection.',  // message
              null,        // callback
              'Offline',   // title
              'Ok'         // buttonName
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
  populateTransactionList: function(){
    var days = $('#transaction_list_days').val();
      $.getJSON(app.url + app.current_transactions_resource_url + "?days=" + days, function(data) {
        var items = [];
        _.each(data, function(transaction, key, list) {
         var amt = parseFloat(transaction.amount);
         var amount_class = (amt < 0) ? "negative" : "";
         var link_class = !transaction.is_associated ? "transaction" : "";
         var link_href = !transaction.is_associated ? "#edit_transaction" : "#edit_transaction_associated";
         items.push('<li><a data-rel="dialog" class="' + link_class + '" transaction_id="' + transaction.id + '" href="' + link_href + '">' + transaction.date_formatted.substring(0,5) + ' - ' + transaction.name + '<span class="ui-li-aside ' + amount_class + '">' + amt.toFixed(2) + '</span></a></li>');
       });
        if (items.length == 0) {
          items.push('<li>(No Recent Transactions)</li>');
        }

        $('#transaction-list').empty().append(items.join('')).listview('refresh');
      });
  },
  populateEnvelopeSelect: function(envelopes){
    if (!app.envelope_select_populated) {

     var items = [];
     _.each(envelopes, function(envelope, key, list) {
      if (envelope.envelope_group.is_global) {
        items.push('<option value="' + envelope.id + '">' + envelope.name + '</option>');
      } else {
        items.push('<option value="' + envelope.id + '">' + envelope.envelope_group.name + '/' + envelope.name + '</option>');
      }
     });
     $('#transaction_envelope_id').append(items.join(''));
     app.envelope_select_populated = true;
   }
 },
 onPageHide: function(e){
    $("div[data-role='header'] a.ui-btn-active").removeClass("ui-btn-active"); //fix wierd issue with ui-btn-active hanging on
  },
  onPageChange: function(e){
   FastClick.attach(document.body);
   $.mobile.defaultPageTransition = 'none';
 }
};