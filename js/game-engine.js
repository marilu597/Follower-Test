window.GameEngine = function() {
	this.username = '';            // Twitter username for current player
  this.n_tweets;                 // Number of tweets to show
  this.fetch_attempts = 0;       // Counter to avoid infinite loops
  this.max_fetch_attempts;       // Max number of attempts before quitting
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
  * - 'rateLimitReached' when Twitter's rate limit has been reached
  * - 'fetchAttemptsLimit' when max number of fetch attempts reached
  * - 'dataLoaded' on success
  */ 
  this.start = function(username, twitterCurrentUser) {
    this.username = username;
    this.twitterCurrentUser = twitterCurrentUser;
    this.n_tweets = parseInt(window.localStorage.getItem(this.username + '_n_tweets'));
    if(!this.n_tweets) {
      this.n_tweets = 3;
    }
    this.max_fetch_attempts = this.n_tweets * 5;
    if (twitterCurrentUser) {
      this.loadDataUsingTwitterAnywhere();
    }
    else {
      this.loadDataUsingPublicAPI();
    }
	}

  /* Add Answer */
  this.addAnswer = function(user_id, tweet_id) {
    answer = this.findAnswerByUser(user_id)
    if(answer){
      this.removeAnswer(answer);
    }
    answer = this.findAnswerByTweet(tweet_id);
    if(answer) {
      this.removeAnswer(answer);
    }
    this.answers.push({ user_id: user_id, tweet_id: tweet_id });
    var user = this.findDataByUser(user_id).user;
    $(this).trigger('addAnswer', {tweet_id: tweet_id, user: user});
  };

  /* Find Answer By User */
  this.findAnswerByUser = function(user_id) {
    var found = null;
    $.each(this.answers, function(i, answer) {
      if(answer.user_id == user_id) {
        found = answer;
        return false;
      }
    });
    return found;
  }

  /* Find Answer By Tweet */
  this.findAnswerByTweet = function(tweet_id) {
    var found = null;
    $.each(this.answers, function(i, answer) {
      if(answer.tweet_id == tweet_id) {
        found = answer;
        return false;
      }
    });
    return found;
  }

  /* Remove Answer */
  this.removeAnswer = function(answer) {
    var tweet_id = answer.tweet_id;
    this.answers.splice(this.answers.indexOf(answer), 1);
    $(this).trigger('removeAnswer', answer);
  }

  /* Check if all questions have been answered */
  this.answersReady = function() {
    return (this.answers.length == this.n_tweets)
  }
  
  /* Grade Answers */
  this.grade = function () {
    var correct_ans = 0;
    var that = this;
    $.each(this.answers, function(i, answer) {
      var data = that.findDataByTweet(answer.tweet_id);
      if(data.user.id == answer.user_id) {
        correct_ans++;
        $(that).trigger('correctAnswer', {tweet_id: answer.tweet_id});
      }
      else {
        $(that).trigger('incorrectAnswer', {tweet_id: answer.tweet_id,
          correct_user: data.user});
      }
    });
    if(correct_ans == this.n_tweets) {
      // Next Level
      window.localStorage.setItem(this.username + '_n_tweets', 
        Math.ceil(this.n_tweets * 1.5));
    }
    return correct_ans;
  }

  /*************************************************/ 
  /* Private Methods (shouldn't be called directly) 
  /*************************************************/

  this.loadDataUsingTwitterAnywhere = function() {
    var that = this;
    var n_to_fetch = this.max_fetch_attempts;
    if(n_to_fetch > 200) {
      n_to_fetch = 200;
    }
    var data_from_tweets = [];
    var options = { count: n_to_fetch }
    var last_tweet_id = localStorage.getItem(this.username + '_last_tweet_id');
    if (last_tweet_id) {
      options.max_id = last_tweet_id;
    }
    this.twitterCurrentUser.homeTimeline(options)
    .each(function(tweet){

      // Sometimes each() will end before adding all items to data_from_tweets.
      // I couldn't find any reliable way to check if each had finished,
      // so I'm adding a timeout function
      if(typeof that.timeOutId == "number") {  
        window.clearTimeout(that.timeOutId);  
        delete that.timeOutId;
      }

      var data = { 
        user: {
          id: tweet.user.attributes.id, 
          name: tweet.user.attributes.name,
          username: tweet.user.attributes.screen_name,
          description: tweet.user.attributes.description,
          avatar_url: tweet.user.attributes.profile_image_url
        }, 
        tweets: [{id: tweet.id, text: tweet.text}] 
      }
      data_from_tweets.push(data);
      if(data_from_tweets.length >= n_to_fetch) {
        that.chooseRandomFromData(data_from_tweets);
      }
      // Set timeout function
      else {
        that.timeOutId = window.setTimeout(that.chooseRandomFromData.bind(that), 
          1000, data_from_tweets);
      }
    });
  }

  this.chooseRandomFromData = function(dataArray) {
    if(dataArray.length < this.n_tweets) {
      this.resetLocalStorage();
      $(this).trigger('fetchAttemptsLimit');
    }
    var that = this;
    $.each(dataArray, function(i, data) {
      if(data.tweets[0].text[0] != '@' && !that.findDataByUser(data.user.id)) {
        that.data.push(data);
      }
      if(that.data.length >= that.n_tweets) {
        return false;
      }
    });

    if(this.data.length >= this.n_tweets) {
      this.updateLocalStorage(dataArray);
      $(this).trigger('dataLoaded');
    }
    else {
      this.resetLocalStorage();
      $(this).trigger('fetchAttemptsLimit');
    }
  }

  this.updateLocalStorage = function(dataArray) {
    // Store last tweet id to use as max_id on next request
    var last_in_data_array = dataArray[dataArray.length - 1].tweets[0].id;
    var last_stored = localStorage.getItem(this.username + '_last_tweet_id');
    var pages = localStorage.getItem(this.username + '_pages');
    if(pages) { pages = parseInt(pages) } else { pages = -1; }
    localStorage.setItem(this.username + '_last_tweet_id', last_in_data_array);
    localStorage.setItem(this.username + '_pages', pages + 1);

    // Restart if reached end of timeline or pages is too much into the past
    if(last_in_data_array == last_stored || pages > 20) {
      this.resetLocalStorage();
    }
  }

  this.resetLocalStorage = function() {
    localStorage.removeItem(this.username + '_last_tweet_id');
      localStorage.setItem(this.username + '_pages', 0);
  }

  this.loadDataUsingPublicAPI = function() {
    var that = this;
    var following_url = 'https://api.twitter.com/1/friends/ids.json?callback=?' +
                    '&screen_name=' + this.username;
    $.jsonp({
      url: following_url,
      success: function(result) {
        that.following_ids = result.ids;
        that.loadData();
      },
      error: function(xhr) {
        var rate_limit_url = 'https://api.twitter.com/1/account/rate_limit_status.json?callback=?';
        $.jsonp({
          url: rate_limit_url,
          success: function(result) {
            if(result.remaining_hits == 0) {
              $(that).trigger('rateLimitReached');
            }
            else {
              $(that).trigger('loadFollowingError');
            }
          },
          error: function() { $(that).trigger('loadFollowingError'); }
        })
      }
    });
  }

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
      user_tweets_url = 'https://api.twitter.com/1/statuses/user_timeline.json?callback=?&count=50&user_id=' + user_id;
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

  this.findDataByUser = function(user_id) {
    var found = null;
    $.each(this.data, function(i, data) {
      if(data.user.id == user_id) {
        found = data;
        return false;
      }
    });
    return found;
  }

  this.findDataByTweet = function(tweet_id) {
    var found = null;
    $.each(this.data, function(i, data) {
      $.each(data.tweets, function(j, tweet) {
        if(tweet.id == tweet_id) {
          found = data;
          return false;
        }
      });
      if(found) {
        return false;
      }
    });
    return found;
  }

  this.getRandomUserId = function() {
    var user_id = null;
    do {
        var n = Math.floor((Math.random()*this.following_ids.length));
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

}