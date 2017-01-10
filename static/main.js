var socket = io();
var me = {name: null, avatarURL: 'http://placehold.it/100/bbb/333&text=User'};
var data = {};
var my_room = null;
var snd = new Audio("static/blip.mp3");

// Adds a single message to message feed
function display_message(msg) {
    var $img = $('<img>').addClass('img-responsive').attr('alt', 'User Avatar').attr('src', msg.user.avatarURL);
    var $span = $('<span>').addClass('chat-img').addClass('pull-left').append($img);
    var $div = $("<div>").addClass('msg-content');
    var $time = $("<span>").addClass("pull-right msg-time").text(moment(msg.time).format('HH:mm:ss'));
    var $header = $("<h2>").addClass("username").text(msg.user.name);
    var $p = $("<p>").text(msg.message);
    $('#messages').append($('<li>').addClass('clearfix').append($span).append($div.append($time).append($header).append($p)));
}

function scroll_to_bottom() {
    $('.msg-container').animate({scrollTop: $('.msg-container').prop("scrollHeight")}, 500);
}

// Saves and displays a given message. Scroll to bottom if needed
function save_message(msg, scroll) {
    data[msg.room]['messages'].push(msg);
    if(msg.room == my_room) {
        display_message(msg);
        if(scroll) {
            scroll_to_bottom();
        }
    }
    else {
        data[msg.room]['unread'] += 1;
        set_unread(msg.room, data[msg.room]['unread']);
    }
}

// Updates the unread messages badge
function set_unread(room, count) {
    var $badge = get_room_li_by_id(room).prev();
    $($badge).text(count);
    $($badge).filter(':hidden').show().addClass('animated zoomIn');
}

function clear_unread(room) {
    var $badge = get_room_li_by_id(room).prev();
    $($badge).hide();
}

// Make UI changes when going to mobile width
function resize_body() {
    if($(window).width()<768) {
        $("#chat-input").attr('rows', 2);
        $("#btn-chat").removeClass('btn-lg');
        $("#btn-chat").addClass('btn-md');
    }
    else {
        $("#chat-input").attr('rows', 3);
        $("#btn-chat").removeClass('btn-md');
        $("#btn-chat").addClass('btn-lg');
    }
    $('.panel-body').height($(window).height()-$('.panel-heading').height()-$('.panel-footer').height()-45);
}

function get_room_li_by_id(id) {
    return $('#rooms li[data-roomid="' + id + '"]');
}

function get_room_option_by_id(id) {
    return $('#room-select option[data-roomid="' + id + '"]');
}

function to_room(room_id) {
    if(room_id === null) {
        var $message = $('<h3>').text('Please select a room').addClass('text-center').attr('id', 'empty-room-msg');
        $('#messages').empty();
        $('.msg-container').append($message);
        my_room = null;
        $("#room-select").val('Lobby');
    }
    else {
        $('#empty-room-msg').remove();
        get_room_li_by_id(my_room).removeClass('active');
        my_room = parseInt(room_id);
        get_room_li_by_id(room_id).addClass('active');
        $("#room-select").val(data[room_id].name);

        clear_unread(room_id);

        $('#messages').empty();
        data[my_room]['messages'].forEach(function (item) {
            display_message(item);
        });
        $('.msg-container').animate({scrollTop: $('.msg-container').prop("scrollHeight")}, 500);  
        socket.emit('join room', me, room_id);
        $('#chat-input').focus();
    }
}

// Adds a given room to room list UIs and to data structure
function add_room(room) {
    var $span = $('<span>').text(room.name);
    if(!room.public) {
        $span.addClass('private');
    }
    $('#rooms').append($('<span>').addClass('badge pull-right').hide());
    $('#rooms').append($('<li>').addClass('roomName').attr('data-roomid', room.id).append($span));
    var $option = $('<option>').attr('data-roomid', room.id).text(room.name);
    $('#room-select').append($option);
    var new_room = {
        messages: [],
        unread: 0,
        name: room.name
    }
    data[room.id] = new_room;
    return;
}

function delete_room(room) {
    $room = get_room_li_by_id(room);
    $room.prev().remove();
    $room.remove();
    $room_op = get_room_option_by_id(room);
    $room_op.remove();
    delete data[room];
}

// Initial UI setup
resize_body();


// Dropzone initialization and event handling
Dropzone.options.avatarDz = {
    url:                '/upload',
    maxFilesize:        0.5,
    dictDefaultMessage: "",
    autoProcessQueue:   true,
    acceptedFiles:      "image/*",
    clickable:          "#new_btn, .dropzone",
    thumbnailWidth:      180,
    thumbnailHeight:     null,
    accept:             function(file, done) {
        var DZ = Dropzone.forElement("#avatar-dz");
        var files = DZ.getAcceptedFiles();
        if(files[0]) {
            DZ.removeFile(files[0]);
        }
        done();
    },
    resize: function(file) {
            var DZ = Dropzone.forElement("#avatar-dz");
            var info = {
                srcX:0,
                srcY:0,
                srcWidth: file.width,
                srcHeight: file.height,
                trgX:0,
                trgY:0,
                trgWidth: DZ.options.thumbnailWidth,
                trgHeight: parseInt(DZ.options.thumbnailWidth * file.height / file.width)
            }
            return info;
        },
    init: function() {
        this.on("success", function(file, res) {
            me.avatarURL = res.path;
            $('.dz-image img').addClass('img-responsive');
        });
        this.on('sending', function(file, xhr, formData){
            formData.append('user_id', socket.id);
        });
        this.on('thumbnail', function(file, res){
            $('.dz-image').height(75);
        });
        this.on('error', function(file, res){
            var DZ = Dropzone.forElement("#avatar-dz");
            files = DZ.getRejectedFiles();
            files.forEach(function(file) {
                DZ.removeFile(file);
            });
            $.notify({message: res },{  
                element: $('.modal-open'), 
                type: 'danger', 
                placement: {from: "top", align: "center"},
                delay: 3000,
                allow_dismiss: false,
                z_index: 10000});
        });
    }
}

$(window).resize(function() {
    resize_body();
});

// Create priate room when a username is clicked
$('#messages').on('click', '.username', function() {
    var buddy = $(this).text();
    socket.emit('create private', buddy);
})

// Go to room on desktop
$('.rooms').on('click', 'li', function() {
    var room_id = $(this).attr('data-roomid');
    to_room(room_id);
});

// Go to room on mobile
$('#room-select').change(function(){
    var room_id;
    if($('#room-select').val() === 'Lobby') {
        room_id = null;
    }
    else {
        room_id = $("option:selected", this).attr('data-roomid');
    }
    to_room(room_id);
});

// Map enter key to sending a message
$('#chat-input').keypress(function(e) {
    if(e.which == 13 && !e.shiftKey) {
        e.preventDefault();
        $('#btn-chat').click();
    }
});

// Add an emoji to current message
$('body').on('click', '.emoji', function() {
    var $txt = jQuery("#chat-input");
    var caretPos = $txt[0].selectionStart;
    var textAreaTxt = $txt.val();
    txtToAdd = $(this).text();
    $txt.val(textAreaTxt.substring(0, caretPos) + txtToAdd + textAreaTxt.substring(caretPos) );
    $txt[0].selectionStart = caretPos + txtToAdd.length;
    $('#chat-input').focus();
});

$('#btn-emoji').popover({
    html : true,
    content: function() {
      return $('#popover_content_wrapper').html();
    }
});

$('#btn-emoji').on('hide.bs.popover show.bs.popover', function() {
    $('#chat-input').focus();
});

$('#inputUsername').keypress(function(e) {
    if(e.which == 13) {
        e.preventDefault();
        $('#profile-modal-save').click();
    }
});

$('#inputRoomname').keypress(function(e) {
    if(e.which == 13) {
        e.preventDefault();
        $('#room-save').click();
    }
});

// Send a message
$('#btn-chat').click(function(){
    var str = $('#chat-input').val();
    if(str==="" || my_room === null)
        return false;
    var message = {
        user:       me,
        message:    str,
        room:       my_room,
        time:       moment()
    }
    socket.emit('chat message', message );
    save_message(message, true);
    $('#chat-input').val('').focus();
    return false;
});

$('#room-save').click(function() {
    var room_name = $('#inputRoomname').val();
    socket.emit('create room', room_name);
    $('#inputRoomname').val('');
    $('#newRoomModal').modal('hide');
});

// Handle username changes 
$('#profile-modal-save').click(function() {
    var username = $('#inputUsername').val();
    socket.emit('username', username, function(data) {
        if(data.status === 0) {
            if(me.name === null) {
                to_room(null);
            }
            me.name = data.username;
            $('#divUsername').removeClass('has-error');
            $('#usernameErrorIcon').remove();
            $('#profile-modal').modal('hide');
            $('#profile-modal').data('bs.modal').options.keyboard = true;
            $('#profile-modal').data('bs.modal').options.backdrop = true;
        }
        else {
            if(!$('#divUsername').hasClass('has-error')) {
                $('#divUsername').addClass('has-error');
                var $errorIcon = $('<span>').addClass('glyphicon glyphicon-remove form-control-feedback').attr('aria-hidden', 'true').attr('id', 'usernameErrorIcon');
                $('#inputUsername').after($errorIcon);
            }
        }
    });
});

$('#profile-modal').on('shown.bs.modal', function() {
    $('#inputUsername').val(me.name);
    $('#inputUsername').focus();
});

// Clear rejected image preview when modal is hidden
$('#profile-modal').on('hidden.bs.modal', function() {
    var DZ = Dropzone.forElement("#avatar-dz");
    var files = DZ.getRejectedFiles();
    files.forEach(function(file) {
        DZ.removeFile(file);
    });
    $('#profile-modal-close').show();
});

$('#newRoomModal').on('shown.bs.modal', function () {
  $('#inputRoomname').focus();
});

$('#profile-modal').modal({
  backdrop: 'static',
  keyboard: false
});

$('#profile-modal-close').hide();
$('#profile-modal').modal('show');

// Handle all socket.io events below //

socket.on('new public', function(room, messages){
    if(!(room.id in data)) {
        add_room(room);
        messages.forEach(function(msg) {
            save_message(msg, false);
        });
    }
});

socket.on('new private', function(room) {
    if(!(room.id in data)) {
        add_room(room);
    }
});

socket.on('chat message', function(msg){
    save_message(msg, true);
    snd.play();
});

socket.on('join room', function(user, room) {
    if(my_room === room) {
        $('#messages').append($('<li>').addClass('clearfix text-center').text(user.name + " joined"));
        $('.msg-container').animate({scrollTop: $('.msg-container').prop("scrollHeight")}, 500);
    }
});

socket.on('delete room', function(room) {
    if(my_room === room) {
        to_room(null);
    }
    delete_room(room);
});

