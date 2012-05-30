window.show_error = function() {
	$('.loading').hide();
	$('.error').show();
	$('.instructions').hide();
}

window.load_users = function(data) {
	$('.loading').hide();
	$('.error').hide();
	$('.instructions').show();
 	$.each(data, function(index, user_data) {
 		tweet = 
 			'<div class="tweet row-fluid">' +
        '<div class="avatar">' +
          '<img src="img/unknown.png">' +
        '</div>' +
        '<div class="info">' + 
          '<p>' + 
            '<span class="name">????</span>' +
            '<span class="username">‏</span>' +
          '</p>' +
          '<p>' + user_data.tweets[0].text + '</p>' +
        '</div>' +
      '</div>'
    $('.tweets').append(tweet);
 	});
}


 $('document').ready(function() {
 	$('form').submit(function(evt) {
 		evt.preventDefault();
 		$('.tweets').empty();
 		$('.loading').show();
 		$('.error').hide();
 		$('.instructions').hide();
 		Game.start($('input#screen_name').val());
 	});
});