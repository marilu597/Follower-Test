Array.prototype.shuffle = function() {
  var len = this.length;
  var i = len;
   while (i--) {
    var p = parseInt(Math.random()*len);
    var t = this[i];
    this[i] = this[p];
    this[p] = t;
  }
};

window.load_users = function(data) {
	$('.loading').hide();
	$('.error').hide();
	$('#main .instructions').show();

  /* Load Tweets */
 	$.each(data, function(index, user_data) {
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
  
  data.shuffle();

  /* Load Authors */
  $.each(data, function(index, user_data) {
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
    html = $(evt.target).parents('.item').html();
    $('#chooseAuthor .itemContainer').html(html);
    $('#main').slideUp();
    $('#chooseAuthor').slideDown();
  })
}


 $('document').ready(function() {
 	$('form').submit(function(evt) {
 		evt.preventDefault();
 		$('.tweets').empty();
 		$('.loading').show();
 		$('.error').hide();
 		$('#main .instructions').hide();
 		Game.start($('input#screen_name').val());
 	});
});