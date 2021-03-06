define([
    'underscore',
    'couchr',
    'async',
    'moment'
], function (_, couchr, async, moment) {
    var exports = {};

    exports.queryTags = function(query, callback) {
        couchr.get('_ddoc/_view/all_tags', {
            reduce : false,
            startkey :  query ,
            endkey :  query + '\ufff0',
            include_docs : false
        }, function(err, resp) {
            if (err) return callback(err);
            var tags = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.key,
                    type: 'tag'
                };
            });
            callback.call(this, tags);
        });
    };

    exports.queryPeople = function(query, callback) {
        couchr.get('_ddoc/_view/all_people', {
            reduce: false,
            startkey :  '"' + query + '"' ,
            endkey :  '"' + query + '\ufff0' + '"' ,
            include_docs : false
        }, function(err, resp) {
            if (err) return callback(err);
            var people = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.key,
                    type: 'person'
                };
            });
            callback.call(this, people);
        });
    };

    exports.queryTopics = function(query, callback) {
        couchr.get('_ddoc/_view/all_topics', {
            startkey :  '"' + query + '"' ,
            endkey :  '"' + query + '\ufff0' + '"'
        }, function(err, resp) {
            if (err) return callback(err);
            var topics = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.value,
                    type: 'topic'
                };
            });
            callback.call(this, topics);
        });
    };

    exports.load_event_sessions = function (eventId, callback) {
       couchr.get('_ddoc/_view/event_sessions', {
           startkey : [eventId],
           endkey : [eventId, {}]
       }, callback);
   };

   exports.load_event_agendas = function (eventId, callback) {
           couchr.get('_ddoc/_view/event_agendas', {
           key : eventId,
           include_docs : true
       }, callback);
   };

   exports.load_event_attendees = function (event, callback) {

       if (!event.attendees || event.attendees.length === 0) return callback(null, {rows: []});

       couchr.get('_ddoc/_view/all_people', {
           keys: event.attendees,
           include_docs : true
       }, callback);
   };

   exports.load_session_assets = function(eventId, sessionId, callback) {
      async.parallel({
          assets : function(cb) {
              // get all the session assets
              couchr.get('_ddoc/_view/session_assets', {
                  include_docs: true,
                  startkey:[sessionId],
                  endkey:[sessionId, {}, {}]
              }, function(err, results){
                if(err) return cb(err);
                cb(null, results.rows);
              });
          },
          event : function(cb) {
              couchr.get('_db/' + eventId, function(err, event) {
                exports.load_event_attendees(event, function(err, attendees_full){
                     event.attendees_full = attendees_full.rows;
                     cb(null, event);
                });
              });
          }
      },
      function(err, result) {
          if (err) callback(err);
          result.session = _.find(result.assets, function(asset){  if(asset.doc.type === 'session') return true;  } );
          result.recording = _.find(result.assets, function(asset){  if(asset.doc.type !== 'session') return true;  } );
          result.events = _.filter(result.assets, function(asset){ if(asset.doc.type === 'sessionEvent') return true;   });
          result.events = _.sortBy(result.events, function(event){ return event.doc.sessionEventCount; });

          result.session.doc.participants_full = _.map(result.session.doc.participants, function(participant){
              return _.find(result.event.attendees_full, function(attendee){return attendee.key === participant;});
          });

          var session_startTime = exports.sessionStartTime(result);

          result.startTime_formated = moment(session_startTime).format('MMM DD, YYYY, h:mm:ss a');
          callback(null, result);
      });

  };

  exports.sessionStartTime = function(sessionDetails) {
      if (sessionDetails.recording && sessionDetails.recording.doc.recordingState && sessionDetails.recording.doc.recordingState.startComplete) {
          return sessionDetails.recording.doc.recordingState.startComplete;
      }
      return sessionDetails.session.doc.created;
  };



   exports.updateEventAttendees = function(eventID, personHash, action, callback) {
        couchr.post('_ddoc/_update/updateAttendees/' + eventID + '?personHash=' + personHash + '&action=' + action, function(result) {
            var err = null;
            if (result !== 'update complete') err = 'Not added';
            callback(null, result);
        });
    };

    exports.addAgendaTopicItem = function(agenda_id, topic_id, text, callback  ) {
      $.post('_ddoc/_update/updateAgenda/' + agenda_id + '?action=add&id=' + topic_id + '&type=topic'  +'&text=' + text + '&colour=900' , function(result) {
          callback(null, result);
      });
    };

    exports.updateSessionEvent = function(id, new_start_time, new_end_time, callback) {
      var update_url ='./_db/_design/TaLK/_update/updateSessionEvent/' + id + '?start_time=' + new_start_time + '&end_time=' + new_end_time;
      couchr.post(update_url, function(err, result){
          if (err) return callback(err);
          if (result.indexOf('update complete') >= 0) return callback(null, result);
          callback(result);
      });
    };



    return exports;
});