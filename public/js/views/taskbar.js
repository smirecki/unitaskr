var jQuery = require('jquery');
var Backbone = require('backbone');
Backbone.$ = jQuery;
var CompletedTask = require('../models/completed-task');

(function($) {
    'use strict';

    // global object to this class. We don't use 'this'
    // because we copy 'this' to 'that' later.
    var TB = {};

    module.exports = Backbone.View.extend({
        el: '#taskbar-container',

        events: {
           'click #current-task a': 'editTask',
           'click #following-task-name a': 'editTask',
           'click #stop-countdown': 'stopCountdown',
           'click #cancel-countdown': 'cancelCountdown',
           'submit form#taskbar': 'startTimer',
        },

        initialize: function() {
            TB.hasInitialTask = false;
            TB.stop = false;
            TB.cancel = false;
            TB.timeOnTask = 1;

            this.$task = $('#task');
            this.$following_task = $('#following-task');
            this.$following_task_val = null;
        },

        render: function() {
            return this;
        },

        startTimer: function(e) {
            e.preventDefault();
            var seconds_in_hours = $('#hours').val() * 3600;
            var seconds_in_minutes = $('#minutes').val() * 60;
            var seconds = $('#seconds').val();
            var total_seconds = (+(seconds_in_hours) + +(seconds_in_minutes) + +(seconds));
            var $following_task_name = $('#following-task-name');
            this.$following_task_val = this.$task.val();

            if (!total_seconds && !TB.hasInitialTask) {
                total_seconds = 1;
            }

            if (this.$task.val() == '') {
                alert('Please enter a task.');
                this.$task.focus();
                return false;
            }

            // Validate user input
            if (total_seconds == 0 && TB.hasInitialTask) {
                alert('Please enter a time.');
                $('#minutes').select();
                return false;
            }

            // Clear last inputted task value
            this.$task.val('');

            TB.timeOnTask = this.secondsToTime(total_seconds);

            // Set the text for what the following task will be. '\u2014' is 
            // unicode for &mdash;
            this.$following_task.html(this.$following_task_val + ' \u2014 Length: ' + 
                this.secondsToTime(total_seconds));

            if (TB.hasInitialTask) {
                setTimeout(timerLoop, 1000);
            } else { 
                this.alarm();
                $('#current-task').css('display', 'block');
                $('#current-notes-input').css('display', 'block');
                $('#following-notes-input').css('display', 'block');
            }

            var i = 0;
            var that = this;
            function timerLoop() {
                var $update_time = $('#update-time');
                var $task_bar = $('#task-bar');
                var $time_bar = $('#time-bar');

                if (i < total_seconds) {
                    ++i;
                    $task_bar.css('display', 'none');
                    $following_task_name.css('display', 'block');
                    $time_bar.css('display', 'block');
                    $update_time.html(that.secondsToTime(total_seconds - i));
                    setTimeout(timerLoop, 1000);

                    // Cancel the timer/following task:
                    if (TB.cancel) {
                        $time_bar.css('display', 'none');
                        total_seconds = 0;
                        TB.cancel = false;
                    }

                    // Stop the timer early:
                    if (TB.stop) {
                        $time_bar.css('display', 'none');
                        // Recalulate how much time was spent on the task:
                        TB.timeOnTask = that.secondsToTime(i);
                        i = total_seconds;
                    }

                    that.checkTimer(i, total_seconds);
                } else {
                    $task_bar.css('display', 'block');
                    $following_task_name.css('display', 'none');
                    document.taskbar.task.focus();
                }
            }
        },

        checkTimer: function(i, total_seconds) {
            if (i == total_seconds) {
                this.alarm();
            }
        },

        alarm: function() {
            var $current_task_text = $('#current-task-text').html();
            this.$following_task_val = this.$following_task_val;

            // Alert the user they can start the following task now
            if (TB.hasInitialTask && !TB.stop) {
                if ($('#sound-check').is(':checked')) {
                    document.getElementById('chime').play();
                }
                alert('Time to ' + this.$following_task_val);
            }

            TB.stop = false; // reset
            TB.hasInitialTask = true;

            // Apppend the current task to the Completed Tasks box:
            if ($current_task_text != '') {
                CompletedTask.set({
                    task: $current_task_text,
                    timeSpent: TB.timeOnTask,
                    timeEnded: this.getTimeNow(),
                });
            }

            $('#current-task-text').html(this.$following_task_val);

            this.updateNotes();

            // Change the task input bar to accept following task(s)
            if (TB.hasInitialTask) {
                $('#task-desc').html('Following Task ');
                $('#task-input input[type=submit]').val('Start');
                $('#timer-input').css('display', 'block');
            }

            this.cleanUp();
        },

        // Moves the following task's notes to the current task's notes
        updateNotes: function() {
            $('#current-textarea').val($('#following-textarea').val());
            $('#following-textarea').val('');
        },

        cleanUp: function() {
            $('#following-task').html('');
            // Make the countdown clock disappear:
            $('#time-bar').css('display', 'none');
            document.taskbar.task.focus();
        },

        zeroPad: function(n, s) {
            // Return 5 as "05", etc. and append a small string
            // e.g., 'h' for '05h'.
            return ('00' + n.toString()).slice(-2) + '<small>'+s+'</small> ';
        },

        secondsToTime: function(total_secs) {
            var hours = Math.floor(total_secs / 3600);
            var mins = Math.floor((total_secs % 3600) / 60);
            var secs = Math.round((((total_secs % 3600) / 60) - mins) * 60);
            return this.zeroPad(hours, 'h') + this.zeroPad(mins, 'm') + 
                this.zeroPad(secs, 's');
        },

        getTimeNow: function() {
            // Figure out what the time/date is right now
            // Uses the format: month/day/year hour:minute:second AM/PM
            var currentTime = new Date();
            var month = currentTime.getMonth() + 1;
            var day = currentTime.getDate();
            var year = currentTime.getFullYear();
            var hour = currentTime.getHours();
            var minute = currentTime.getMinutes();

            if (minute < 10) {
                minute = '0' + minute;
            }
            var second = currentTime.getSeconds();
            if (second < 10) {
                second = '0' + second;
            }
            var ampm = hour > 11 ? 'PM' : 'AM';

            // Convert from 24 hour time to 12 hour time:
            hour = hour % 12 || 12;

            return month + '/' + day + '/' + year + ' ' + hour + ':' + 
                        minute + ':' + second + ' ' + ampm;
        },

        editTask: function(e) {
            e.preventDefault();
            var id_name = $(e.target).data('target');
            var msg = $(e.target).data('msg');
            var current = $('#' + id_name).html();
            
            if (current.indexOf('\u2014') != -1) { // Edit following task
                var new_task = prompt(msg, current.substring(0, current.indexOf('\u2014')));
                if (new_task != null && new_task != '') {
                    new_task += ' \u2014 Length: ' + TB.timeOnTask;
                }
            } else {
                var new_task = prompt(msg, current); // Edit current task
            }
            
            if (new_task == null) {
                return false;
            }
                
            if (new_task != '') {
                $('#' + id_name).html(new_task);
            } else {
                alert('Please enter a task');
                edit_task(id_name, msg);
            }
        },

        stopCountdown: function(e) {
            e.preventDefault();
            TB.stop = true;
        },

        cancelCountdown: function(e) {
            e.preventDefault();
            TB.cancel = true;
        },

    });

})(jQuery);
