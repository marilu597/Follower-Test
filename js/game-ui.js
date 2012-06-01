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
    window.location.hash = '';
    this.gameEngine = new GameEngine(this);

    // Bind to hashchange
    $(window).on('hashchange', {gameUI: this}, this.route);

    // Bind to game engine events
    ge = this.gameEngine;
    $(ge).on('loadFollowingError', {gameUI: this}, this.showErrorMessage);
    $(ge).on('fetchAttemptsLimit', {gameUI: this}, this.showErrorMessage);
    $(ge).on('dataLoaded', {gameUI: this}, this.loadUsers);
    $(ge).on('addAnswer', {gameUI: this}, this.setTweetAuthor);
    $(ge).on('removeAnswer', {gameUI: this}, this.resetTweet);
    
    // Bind to form submission
    $('#index form').on('submit', {gameUI: this}, this.startGame);

    // Bind to tweet click
    $('#index .tweet').live('click', {gameUI: this}, this.showChooseAuthor);

    // Bind to author click
    $('#chooseAuthor .author').live('click', {gameUI: this}, this.addAnswer);
  }

  this.route = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    switch(window.location.hash) {
      case '':
        that.showWindow('index');
        break;
      case '#chooseAuthor':
        that.showWindow('chooseAuthor');
        break;
    }
  }

  this.showWindow = function(windowName) {
    $('#index').hide();
    $('#chooseAuthor').hide();
    switch(windowName) {
      case 'index':
        $('#index').fadeIn('normal', function() {
          $('img[src="img/unknown.png"]:first').focus();
        }); 
        break;
      case 'chooseAuthor':
        $('#chooseAuthor').fadeIn('normal', function() { 
          window.scrollTo(0,0);
        });
        break;
    }
  }

  this.startGame = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    $('.tweets').empty();
    that.showMessage('loading');
    that.gameEngine.start($('input#screen_name').val().replace('@', ''));
  }

  this.showChooseAuthor = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    tweet = $(evt.target).closest('.item').clone();
    $('#chooseAuthor .itemContainer').html(tweet);
    window.location.hash = 'chooseAuthor';
  }

  this.addAnswer = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    var user_id = $(evt.target).closest('.author').attr('data-id');
    var tweet_id = $('#chooseAuthor .tweet').attr('data-id');
    that.gameEngine.addAnswer(user_id, tweet_id);
    window.location.hash = '';
  }

  this.showErrorMessage = function(evt) {
    evt.preventDefault();
    evt.data.gameUI.showMessage('error');
  }

  this.showMessage = function(name) {
    $('.loading').hide();
    $('.error').hide();
    $('#index .instructions').hide();
    switch(name) {
      case 'loading':
        $('.loading').show(); break;
      case 'error':
        $('.error').show(); break;
      case 'instructions':
        $('#index .instructions').show(); break;
    }
  }

  this.loadUsers = function(evt) {
    evt.preventDefault();
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
  }

  this.setTweetAuthor = function(evt, data) {
    evt.preventDefault();
    var tweet = $('#index .tweet[data-id="' + data.tweet_id + '"]');
    $(tweet).find('img').attr('src', data.user.avatar_url);
    $(tweet).find('.name').html(data.user.name);
    $(tweet).find('.username').html(data.user.username);
  }

  this.resetTweet = function(evt, tweet_id) {
    evt.preventDefault();
    var tweet = $('#index .tweet[data-id="' + tweet_id + '"]');
    $(tweet).find('img').attr('src', 'img/unknown.png');
    $(tweet).find('.name').html('????');
    $(tweet).find('.username').html('');
  }
}