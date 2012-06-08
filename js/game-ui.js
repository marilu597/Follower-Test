// Add shuffle function to arrays
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

// Function to parse query parameters
function getQueryParams(qs) {
  qs = qs.split("+").join(" ");
  var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
  while (tokens = re.exec(qs)) {
    params[decodeURIComponent(tokens[1])]
        = decodeURIComponent(tokens[2]);
  }
  return params;
}

function addLoggedOnTwitter() {
  if( $('#loggedOnTwitter').length <= 0 ) {
    $('form').append(
      '<input type="hidden" id="loggedOnTwitter" name="loggedOnTwitter" value="true">'
    );
  }
}

function removeLoggedOnTwitter() {
  $('#loggedOnTwitter').remove();
}

twttr.anywhere(function (T) {
  T.bind("authComplete", function (e, user) {
    // triggered when user logs in
    addLoggedOnTwitter();
    $('#screen_name').val(user.attributes.screen_name);
    $('#startGame').submit();
  });
  T.bind("signOut", function (e) {
    // triggered when user logs out
    removeLoggedOnTwitter();
    $('#startGame').submit();
  });
});

// Check if user connected Twitter and Start App
$(document).ready(function() {
  var query = getQueryParams(document.location.search);
  var username = query.screen_name;
  if(username) { username = username.replace('@', ''); }
  var loggedOnTwitter = query.loggedOnTwitter;
  var twitterCurrentUser = null;

  $('form').attr('action', document.URL.replace('#', ''));
  $('#nextLevel, #tryAgain').on('click', function() {
    $('#screen_name').removeAttr('disabled');
    $('#startGame').submit();
  });

  if(loggedOnTwitter) {
    twttr.anywhere(function (T) {
      // Play using Twitter Anywhere
      if (T.isConnected()) {
        twitterCurrentUser = T.currentUser;
        username = T.currentUser.data('screen_name');
        addLoggedOnTwitter();
        $('#screen_name').val(username).prop('disabled', true);
        $('form').append(
          '<div><button id="signout" type="btn">' + I18n.sign_out + '</button></div>'
        );
        $("#signout").bind('click', function (evt) {
          evt.preventDefault();
          twttr.anywhere.signOut();
        });
        window.location.hash = '';
        // Delete last game 
        if(typeof gameUI !== "undefined") {
          gameUI.unbindAll();
          delete(gameUI);
        }
        // Start new game
        gameUI = new GameUI();
        gameUI.start(username, twitterCurrentUser);
      }
      else {
        removeLoggedOnTwitter();
        $('#screen_name').removeAttr('disabled');
        $('#startGame').submit();
      }
    });
  }
  else {
    if(username) {
      $('#screen_name').val(username);
      twttr.anywhere(function (T) {
        // Make sure user is not connected with Twitter
        if (T.isConnected()) {
          addLoggedOnTwitter();
          $('#screen_name').removeAttr('disabled');
          $('#startGame').submit();
        }
        else {
          $('.loginbtn').each(function(i, btn) {
            T(btn).connectButton();
          });
          window.location.hash = '';
          // Delete last game 
          if(typeof gameUI !== "undefined") {
            gameUI.unbindAll();
            delete(gameUI);
          }
          // Start new game
          gameUI = new GameUI();
          gameUI.start(username, twitterCurrentUser);
        }
      });
    }
    else {
      // Wait for user to insert username
      $('form').show();
    }
  }
});

// GameUI class
window.GameUI = function() {
  this.gameEngine;
  this.username;
  this.twitterCurrentUser;

  this.start = function(username, twitterCurrentUser) {
    this.gameEngine = new GameEngine(this);
    this.username = username;
    this.twitterCurrentUser = twitterCurrentUser;

    // Bind to hashchange
    $(window).on('hashchange', {gameUI: this}, this.route);

    // Bind to game engine events
    ge = this.gameEngine;
    $(ge).on('rateLimitReached', {gameUI: this}, this.showRateLimitMessage);
    $(ge).on('loadFollowingError', {gameUI: this}, this.showErrorMessage);
    $(ge).on('fetchAttemptsLimit', {gameUI: this}, this.showErrorMessage);
    $(ge).on('dataLoaded', {gameUI: this}, this.loadUsers);
    $(ge).on('addAnswer', {gameUI: this}, this.setTweetAuthor);
    $(ge).on('removeAnswer', {gameUI: this}, this.removeAnswer);
    $(ge).on('correctAnswer', {gameUI: this}, this.markCorrect);
    $(ge).on('incorrectAnswer', {gameUI: this}, this.markIncorrect);

    // Bind to grade button
    $('#index .grade button').on('click', {gameUI:this}, this.grade);

    // Bind to tweet click
    $('#index .tweet').live('click', {gameUI: this}, this.showChooseAuthor);

    // Bind to author click
    $('#chooseAuthor .author').live('click', {gameUI: this}, this.addAnswer);

    // Start
    $('#index .tweets').empty();
    $('#chooseAuthor .authors').empty();
    $('#index .grade button').removeClass('btn-primary').addClass('disabled');
    $('#index .result').hide();
    this.showMessage('loading');

    this.gameEngine.start(username, twitterCurrentUser);
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

  this.showChooseAuthor = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    tweet = $(evt.target).closest('.item').clone();
    that.resetTweet(tweet);
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
    if(that.gameEngine.answersReady()) {
      $('#index .grade button').addClass('btn-primary').removeClass('disabled');
      that.showMessage('none');
    }
  }

  this.showRateLimitMessage = function(evt) {
    evt.preventDefault();
    evt.data.gameUI.showMessage('rateLimit');
  }

  this.showErrorMessage = function(evt) {
    evt.preventDefault();
    evt.data.gameUI.showMessage('error');
  }

  this.showMessage = function(name) {
    $('.loading').hide();
    $('.error').hide();
    $('.rateLimit').hide();
    $('#index .instructions').hide();
    switch(name) {
      case 'loading':
        $('.loading').show(); break;
      case 'error':
        $('.error').show(); break;
      case 'instructions':
        $('#index .instructions').show(); break;
      case 'rateLimit':
        $('.rateLimit').show(); break;
    }
  }

  this.loadUsers = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    that.showMessage('instructions');

    /* Load Tweets */
    $.each(that.gameEngine.data, function(index, user_data) {
      var n = Math.floor((Math.random()*user_data.tweets.length));
      tweet = 
        '<div class="item tweet row-fluid" data-id="' + user_data.tweets[n].id + '">' +
          '<i class="icon-ok"></i><i class="icon-remove"></i>' +
          '<div class="avatar">' +
            '<img src="img/unknown.png">' +
          '</div>' +
          '<div class="info">' + 
            '<p>' + 
              '<span class="name">????</span> ' +
              '<span class="username">‏</span>' +
            '</p>' +
            '<p>' + user_data.tweets[n].text + '</p>' +
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

    $('form').show();
    $('.grade').show();
    $('.adsense').show();
  }

  this.setTweetAuthor = function(evt, data) {
    evt.preventDefault();
    var tweet = $('#index .tweet[data-id="' + data.tweet_id + '"]');
    $(tweet).find('img').attr('src', data.user.avatar_url);
    $(tweet).find('.name').html(data.user.name);
    $(tweet).find('.username').html('@' + data.user.username);

    var author = $('#chooseAuthor .author[data-id="' + data.user.id + '"]');
    $(author).addClass('selected');
  }

  this.removeAnswer = function(evt, answer) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    var tweet = $('#index .tweet[data-id="' + answer.tweet_id + '"]');
    that.resetTweet(tweet);

    var author = $('#chooseAuthor .author[data-id="' + answer.user_id + '"]');
    $(author).removeClass('selected');

    $('#index .grade button').removeClass('btn-primary').addClass('disabled')
    that.showMessage('instructions');
  }

  this.resetTweet = function(tweet) {
    $(tweet).find('img').attr('src', 'img/unknown.png');
    $(tweet).find('.name').html('????');
    $(tweet).find('.username').html('');
  }

  this.grade = function(evt) {
    evt.preventDefault();
    var that = evt.data.gameUI;
    $('#index .grade').hide();
    $('#index .tweet').die('click');
    var correct = that.gameEngine.grade();
    var total = that.gameEngine.n_tweets
    $('#index .result .correct').html(correct);
    $('#index .result .total').html(total);
    share_result = I18n.share_result.replace('{correct}', correct)
      .replace('{total}', total);
    web_intent = $('#index .result .share a');
    web_intent.attr('href', web_intent.attr('data-url') + 
      encodeURIComponent(share_result));
    if(correct == total) {
      $('#index .result .allCorrect').show();
      $('#index .someCorrect').hide();
    }
    else {
      $('#index .result .allCorrect').hide();
      $('#index .someCorrect').show();
    }
    $('#index .result').show();
  }

  this.markCorrect = function(evt, data) {
    evt.preventDefault();
    var tweet = $('#index .tweet[data-id="' + data.tweet_id + '"]');
    $(tweet).addClass('correct');
  }

  this.markIncorrect = function(evt, data) {
    evt.preventDefault();
    correct_answer = 
      '<div class="correct_answer">' + 
        I18n.correct_answer + ': ' + 
        data.correct_user.name + ' @' + data.correct_user.username +
      '</div>'
    var tweet = $('#index .tweet[data-id="' + data.tweet_id + '"]');
    $(tweet).addClass('incorrect');
    $(tweet).append(correct_answer);
  }

  this.unbindAll = function() {
    $(window).off('hashchange');

    ge = this.gameEngine;
    $(ge).off('rateLimitReached');
    $(ge).off('loadFollowingError');
    $(ge).off('fetchAttemptsLimit');
    $(ge).off('dataLoaded');
    $(ge).off('addAnswer');
    $(ge).off('removeAnswer');
    $(ge).off('correctAnswer');
    $(ge).off('incorrectAnswer');

    $('#index .grade button').off('click');
    $('#index .tweet').die('click');
    $('#chooseAuthor .author').die('click');

    delete(this.gameEngine);
  }
}