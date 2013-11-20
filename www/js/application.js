var app = {
  url: 'https://app.bentobudget.com/',
  init: function(){
    document.addEventListener('deviceready', app.onDeviceReady, false);
    $(document).bind("mobileinit", app.onJQMReady);
    $(document).bind('pagehide', app.onPageHide);
    $(document).bind('pagechange', app.onPageChange);
  },
	onJQMReady: function(){
		$.support.cors = true;
	  $.mobile.allowCrossDomainPages = true;

    if (localStorage.email !== undefined){
      $('#email').val(localStorage.email);
      $('#remember').prop("checked", true);
    }

    $('#signin').bind('click', function(e){
      if (app.checkConnection()) {
        $.ajax({
          type: "POST",
          url: app.url + "sessions.json",
          crossDomain: true,
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
              $.mobile.changePage(app.url + "envelopes.mobile")
          },
          error: function(e) {
              $('#errors').text(JSON.parse(e.responseText).error_message).show();
          }
        });
        e.preventDefault();
      }
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
    //prevent first page from being cached
    var page = $(e.target);
    if (!$.mobile.page.prototype.options.domCache && (!page.attr('data-dom-cache') || page.attr('data-dom-cache') == "false")) {
      page.remove();
 	  }
  },
   onPageChange: function(e){
     FastClick.attach(document.body);
     $.mobile.defaultPageTransition = 'none';
  }
};