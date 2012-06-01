window.GameEngine = function() {
	this.username = '';            // Twitter username for current player
	this.n_tweets = 5;             // Number of tweets to show
  this.fetch_attempts = 0;       // Counter to avoid infinite loops
  this.max_fetch_attempts = 15;  // Max number of attempts before quitting
  this.following_ids = [];       // List of user ids the current player follows on Twitter
	this.data = [];                // Users with their corresponding tweets
	this.answers = [];             // Currently submitted answers

  /* Start Game
  * - Sets the current player's username.
  * - Fetches all users the current player is 'following' on Twitter.
  * - Selects random users from 'following' list and fetches their last tweets.
  * - Populates data array with user's info and corresponding tweets
  * Triggers:
  * - 'loadFollowingError' when loading 'following' ids fails
  * - 'fetchAttemptsLimit' when max number of fetch attempts reached
  * - 'dataLoaded' on success
  */ 
  this.start = function(username) {
    this.username = username;
    var that = this;
    following_url = 'https://api.twitter.com/1/friends/ids.json?callback=?' +
                    '&screen_name=' + this.username;
    $.jsonp({
			url: following_url,
			success: function(result) {
        that.following_ids = result.ids;
        that.loadData();
      },
      error: function() {
        $(that).trigger('loadFollowingError');
      }
		});
	}

  /* Add Answer */
  this.addAnswer = function(user_id, tweet_id) {
    this.removeAnswer(user_id);
    this.answers.push({ user_id: user_id, tweet_id: tweet_id });
  };

  /* Remove Answer */
  this.removeAnswer = function(user_id) {
    var that = this;
    $.each(this.answers, function(index, answer) {
      if (answer.user_id == user_id) {
        that.answers.splice(index, 1);
      }
    }); 
  }
  
  /* Grade Answers */
  this.grade = function () {
    var correct_ans = 0;
    var that = this;
    $.each(this.answers, function(i, answer) {
      $.each(that.data, function(j, person) {
        if (person.user.id == answer.user_id) {
          $.each(person.tweets, function(k, tweet) {
            if(answer.tweet_id == tweet.id) {
              correct_ans++;
            }
          });
        }
      });
    });
    return correct_ans;
  }

  /*************************************************/ 
  /* Private Methods (shouldn't be called directly) 
  /*************************************************/

  this.loadData = function() {
    if(this.fetch_attempts >= this.max_fetch_attempts) {
      $(this).trigger('fetchAttemptsLimit'); 
      return;
    }
    else {
      this.fetch_attempts++;
    }
    if(this.data.length < this.n_tweets) {
      var user_id = this.getRandomUserId();
      var that = this;
      user_tweets_url = 'https://api.twitter.com/1/statuses/user_timeline.json?callback=?&count=20&user_id=' + user_id;
      $.jsonp({
        url: user_tweets_url,
        success: function(result) {
          var user_data = that.getUserData(result);
          if(user_data.tweets.length > 0) {
            that.data.push(user_data);
          }
        },
        complete: function(xhr) {
          that.loadData();
        }
      });
    }
    else {
      $(this).trigger('dataLoaded');
    }
  }

  this.getRandomUserId = function() {
    var user_id = null;
    do {
        var n = Math.floor((Math.random()*this.following_ids.length)+1);
        user_id = this.following_ids[n];
        var used = false;
        for (i = 0; i < this.data.length; i++) {
          if (this.data[i].user.id == user_id) { 
            used = true;
            break;
          }
        }
    } while (used);
    return user_id;
  }

  this.getUserData = function(result) {
    var user_data = { user: {}, tweets: [] }
    user_data.user = {
      id: result[0].user.id, 
      name: result[0].user.name,
      username: result[0].user.screen_name,
      description: result[0].user.description,
      avatar_url: result[0].user.profile_image_url
    }
    $.each(result, function(index, tweet) {
      if(tweet.text[0] != '@') { //Avoid tweets that start with a mention
        user_data.tweets.push({id: tweet.id, text: tweet.text});
      }
    });
    return user_data;
  }

}