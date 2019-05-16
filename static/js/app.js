
var app = {};
app.isContextMenuOpen = false;
app.contextMenuHoldingSongID = null;
app.contextMenuHoldingArtistID = null;
app.contextMenuHoldingArtistObfID = null;
app.contextMenuHoldingAlbumID = null;
app.contextMenuHoldingType = "";
app.hasNextPageLoaded = false;

app.gui = [];
app.gui.volumeSlider = document.getElementById("volume");

app.internal = [];
app.internal.audio = new Audio();
app.internal.audio.volume = 0.2;

app.player = {};
app.player.onDeck = null;
app.player.isDurationUpdated = true;
app.player.queue = [];
app.player.queuePosition = 0;
app.player.isMuted = false;
app.player.lastVolume = 0.3;

app.loadPage = function(page) {
    if(app.hasNextPageLoaded == false) {
        app.hasNextPageLoaded = true;
        $('#right-box').css('overflow', 'auto');
    }
    $.get(page, function(data) {
        $('#browser').html(data);
    });
}

app.internal.audio.onended = function() {
    app.player.queueNext();
    app.player.play();
}

app.player.syncSeek = function() {
    $('#player-time').text(app.internal.audio.currentTime.toString().toMMSS());
    if(!app.player.isDurationUpdated) {
        if(app.internal.audio.readyState > 3) {
            $('#player-duration').text(Math.floor(app.internal.audio.duration).toString().toMMSS());
            app.player.isDurationUpdated = true;
        }
    }
    if(app.internal.audio.readyState > 3) {
        $('#player-seek').css('width', ((app.internal.audio.currentTime/app.internal.audio.duration) * 100) + '%');
    }
}

app.player.sync = function() {
    app.player.updateQueueDisplay();
}

app.player.queueNext = function() {
    if(!app.player.onDeck) {
        if(app.player.queue.length == 0) {
            Console.log("Queue is empty.")
        } else {
            app.player.queuePosition = 0;
            app.player.onDeck = app.player.queue[app.player.queuePosition];
            app.player.load();
        }
    } else {
        if((app.player.queuePosition+1) <= (app.player.queue.length-1)) {
            app.internal.audio.pause();
            app.player.queuePosition++;
            app.player.onDeck = app.player.queue[app.player.queuePosition];
            app.player.load();
        }
    }
    app.player.updateQueueDisplay();
}

app.player.queuePrevious = function() {
    if((app.player.queuePosition-1) >= 0) {
        app.internal.audio.pause();
        app.player.queuePosition--;
        app.player.onDeck = app.player.queue[app.player.queuePosition];
        app.player.load();
    }
    app.player.updateQueueDisplay();
}

app.player.queueAt = function(qPos) {
    if(qPos >= 0 && qPos < app.player.queue.length) {
        app.internal.audio.pause();
        app.player.queuePosition = qPos;
        app.player.onDeck = app.player.queue[app.player.queuePosition];
        app.player.load();
    }
}

app.player.play = function() {
    if(app.player.onDeck) {
        app.internal.audio.play();
        $('#player-control-play-image').attr('src', '/static/images/player_pause.png');
    } else if(!app.player.queue.length == 0) {
        app.player.queueNext();
        app.player.play();
    } else {
        console.log("No song on deck. Queue may be empty?");
    }
    app.player.updateQueueDisplay();
}

app.player.updateQueueDisplay = function() {
    let s = "";
    s += '';
    for(var i = 0; i < app.player.queue.length; i++) {
        s += '<div class="queue-box-item" queue-id="' + i + '">'
        if(app.player.queuePosition == i) {
            if(app.internal.audio.paused == true) {
                s += '<div class="queue-box-item-status"><img class="queue-box-pause" src="/static/images/player_pause.png"/></div>'
            } else {
                s += '<div class="queue-box-item-status"><div class="playing-circle"></div></div>'
            }
        } else {
            s += '<div class="queue-box-item-status"></div>'
        }
        s += '<div class="queue-box-item-details"><p>' + app.player.queue[i]['song_title'] + "</p><br><p>" + app.player.queue[i]['song_artist'] + '</p></div></div>';
    }
    $('#queue-box').html(s);

    $('.queue-box-item').on('dblclick', function() {
        console.log("hehe, double click!");
        var queueID = $(this).attr('queue-id');
        app.player.queueAt(queueID);
        app.player.play();
    });
}

app.player.load = function() {
    app.player.pause();
    app.player.setImage(app.player.onDeck['song_album_art_url']);
    app.player.setDetails(app.player.onDeck['song_title'],
                          app.player.onDeck['song_artist'],
                          app.player.onDeck['song_album']
    );
    app.player.setSource(app.player.onDeck['song_audio_url']);
    console.log("Loaded " + app.player.onDeck['song_title'] + " by " + app.player.onDeck['song_artist'] + " (" + app.player.onDeck['song_id'] + ")");
    app.player.updateQueueDisplay();
}

app.player.pause = function() {
    app.internal.audio.pause();
    app.player.updateQueueDisplay();
    $('#player-control-play-image').attr('src', '/static/images/player_play.png');
}

app.player.toggle = function() {
    if(app.internal.audio.paused) {
        app.player.play();
    } else {
        app.player.pause();
    }
}

app.player.setImage = function(image) {
    $('#player-album-art').attr('src', image.toString());
    $('#left-box-background').attr('style', "background-image: url('" + image.toString() + "');");
}

app.player.setDetails = function(title, artist, album) {
    $('#player-song-title').text(title.toString());
    $('#player-song-artist').text(artist.toString());
    $('#player-song-album').text(album.toString());
}

app.player.setSource = function(source) {
    app.internal.audio.src = source;
    app.player.isDurationUpdated = false;
}

app.player.loadIntoQueue = function(data) {
    app.player.queue.push(data);
    app.player.updateQueueDisplay();
}

app.player.playEndOfQueue = function() {
    app.player.pause();
    app.player.queuePosition = app.player.queue.length-1;
    app.player.onDeck = app.player.queue[app.player.queuePosition];
    app.player.load();
    app.player.play();
    app.player.updateQueueDisplay();
}

app.player.setVolume = function(vol) {
    app.internal.audio.volume = vol;
}

app.player.forceSetVolume = function(vol) {
    app.internal.audio.volume = vol;
    app.gui.volumeSlider.value = vol * 100;
}

app.rightClick = function(objectType, object, event) {
    event.preventDefault();
    app.isContextMenuOpen = true;
    var cursorX = event.clientX;
    var cursorY = event.clientY;

    if(objectType == "song") {
        var songID = $(object).attr('data-song-id');
        app.contextMenuHoldingSongID = $(object).attr('data-song-id');
        app.contextMenuHoldingArtistID = $(object).attr('data-artist-id');
        app.contextMenuHoldingArtistObfID = $(object).attr('data-artist-link');
        app.contextMenuHoldingAlbumID = $(object).attr('data-album-id');
        app.contextMenuHoldingType = "song";
        s = "";
        s += '<li class="context-menu-item" id="context-menu-item__add-to-library">Add to library</li>';
        s += '<li class="context-menu-item" id="context-menu-item__add-to-queue">Add to queue</li>';
        s += '<li class="context-menu-separator"></li>';
        s += '<li class="context-menu-item">View album</li>';
        s += '<li class="context-menu-item" id="context-menu-item__view-artist">View artist</li>';
        s += '<li class="context-menu-separator"></li>';
        s += '<li class="context-menu-item">View publisher info</li>';
        $('#context-menu').html(s);
    }

    $("#context-menu-item__add-to-library").on("click", function() {
        var songID = $(object).attr('data-song-id');
    });

    $("#context-menu-item__add-to-queue").on("click", function() {
        $.get('/api/get/song/' + app.contextMenuHoldingSongID, function(data) {
            app.player.loadIntoQueue(data);
        });
    });

    $("#context-menu-item__view-artist").on("click", function() {
        app.loadPage('/client/artist/' + app.contextMenuHoldingArtistObfID);
    })

    $('#context-menu').css('top', cursorY + "px");
    $('#context-menu').css('left', cursorX + "px");
    $('#context-menu').addClass('context-menu-show');
}

app.gui.volumeSlider.oninput = function() {
    if(app.player.isMuted == true) {
        app.player.isMuted = false;
        app.internal.muteUpdate();
    }
    var volumeCalc = (this.value / 100) - 0.01;
    app.internal.audio.volume = volumeCalc;
}

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

String.prototype.toMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

app.internal.muteUpdate = function() {
    if(app.player.isMuted) {
        $('#mute').attr('src', '/static/images/speaker_mute.png');
        app.player.forceSetVolume(0);
    } else {
        $('#mute').attr('src', '/static/images/speaker.png');
        app.player.forceSetVolume(app.player.lastVolume);
    }
}

$('#mute').click(function() {
    if(app.player.isMuted == false) {
        app.player.lastVolume = app.gui.volumeSlider.value / 100;
    }
    app.player.isMuted = !app.player.isMuted;
    app.internal.muteUpdate();
});

$('#media-box-item__songs').click(function() {
    app.loadPage("/client/songs");
});

$('#player-control-play').click(function() {
    app.player.toggle();
});

$('#player-control-previous').click(function() {
    app.player.queuePrevious();
    app.player.play();
});

$('#player-control-next').click(function() {
    app.player.queueNext();
    app.player.play();
});

$('#input-register-button').click(function() {
    var data = {
        "username": $('#input-register-username').val().toString(),
        "email": $('#input-register-email').val().toString(),
        "password": $('#input-register-password').val().toString(),
        "moniker": $('#input-register-moniker').val().toString()
    };
    var dataString = JSON.stringify(data);
    $.ajax({
        url: '/api/register',
        type: 'POST',
        data: dataString,
        dataType: 'json',
        contentType: 'application/JSON, charset=UTF-8',
        success: function(data) {
            console.log(data['status']);
        }
    });
});

$(document).ready(function() {
    app.player.syncSeekInterval = setInterval(app.player.syncSeek, 100);
    // app.player.syncInterval = setInterval(app.player.sync, 100);
    app.player.setVolume(app.gui.volumeSlider.value);
});

$(document).keypress(function(event) {
    if(event.which == 32) {
        app.player.toggle();
    }
});

function getCursorXY(e) {
	cursorX = (window.Event) ? e.pageX : event.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
	cursorY = (window.Event) ? e.pageY : event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);
}

$(document).click(function() {
    if(window.Event) {
        document.captureEvents(Event.MOUSEMOVE);
    }
    document.onMouseMove = getCursorXY;
    if(app.isContextMenuOpen == true) {
        $('#context-menu').css('top', "-1000px");
        $('#context-menu').css('left', "-1000px");
        $('#context-menu').removeClass('context-menu-show');
    }
});