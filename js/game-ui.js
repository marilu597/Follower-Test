Array.prototype.shuffle = function() {
  var len = this.length;
  var i = len;
   while (i--) {
    var p = parseInt(Math.random()*len);
    var t = this[i];
    this[i] = this[p];
    this[p] = t;
  }
}

window.GameUI = function() {
  this.gameEngine;

  this.start = function() {
    this.gameEngine = new GameEngine(this);

    // Bind to game engine events
    ge = this.gameEngine;
    $(ge).on('loadFollowingError', {gameUI: this}, this.showErrorMessage);
    $(ge).on('fetchAttemptsLimit', {gameUI: this}, this.showErrorMessage);
    $(ge).on('dataLoaded', {gameUI: this}, this.loadUsers);
    
    // Bind to form submission
    var that = this;
    $('form').submit(function(evt) {
      evt.preventDefault();
      $('.tweets').empty();
      that.showMessage('loading');
      that.gameEngine.start($('input#screen_name').val());
    });
  }

  this.showErrorMessage = function(evt) {
    evt.data.gameUI.showMessage('error');
  }

  this.showMessage = function(name) {
    $('.loading').hide();
    $('.error').hide();
    $('#main .instructions').hide();
    switch(name) {
      case 'loading':
        $('.loading').show(); break;
      case 'error':
        $('.error').show(); break;
      case 'instructions':
        $('#main .instructions').show(); break;
    }
  }

  this.showWindow = function(windowName, callback) {
    $('#main').hide();
    $('#chooseAuthor').hide();
    switch(windowName) {
      case 'index':
        window.location.hash = '';
        $('#main').fadeIn('normal', callback); break;
      case 'chooseAuthor':
        window.location.hash = '#chooseAuthor';
        $('#chooseAuthor').fadeIn('normal', callback); break;
    }
  }

  this.loadUsers = function(evt) {
    var that = evt.data.gameUI;
    that.showMessage('instructions');

    /* Load Tweets */
    $.each(that.gameEngine.data, function(index, user_data) {
      tweet = 
        '<div class="item tweet row-fluid" data-id="' + user_data.tweets[0].id + '">' +
          '<div class="avatar">' +
            '<img src="img/unknown.png">' +
          '</div>' +
          '<div class="info">' + 
            '<p>' + 
              '<span class="name">????</span> ' +
              '<span class="username">‏</span>' +
            '</p>' +
            '<p>' + user_data.tweets[0].text + '</p>' +
          '</div>' +
        '</div>'
      $('.tweets').append(tweet);
    });
    
    that.gameEngine.data.shuffle();

    /* Load Authors */
    $.each(that.gameEngine.data, function(index, user_data) {
      author = '<div class="item author row-fluid" data-id="' + user_data.user.id + '">' +
          '<div class="avatar">' +
            '<img src="' + user_data.user.avatar_url + '">' +
          '</div>' +
          '<div class="info">' + 
            '<p>' + 
              '<span class="name">' + user_data.user.name + '</span> ' +
              '<span class="username">‏@' + user_data.user.username + '</span>' +
            '</p>' +
            '<p>' + user_data.user.description + '</p>' +
          '</div>' +
        '</div>'
      $('.authors').append(author);
    })

    /* Bind Events */
    $('.tweet').click(function(evt) {
      tweet = $(evt.target).closest('.item').clone();
      $('#chooseAuthor .itemContainer').html(tweet);
      that.showWindow('chooseAuthor', function() {
        $(window).one('hashchange', function() {
          that.showWindow('index');
        });
      });
    });
  }
}