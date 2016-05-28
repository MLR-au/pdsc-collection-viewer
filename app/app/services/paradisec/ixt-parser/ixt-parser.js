'use strict';

angular.module('pdsc')
  .service('ixtParser', [ '_',
    function (_) {

      var ixtParser = {};

      // parse an ixt XML file and return an object keyed on timeslot id
      ixtParser.parse = function(data) {
          var text = _.map(data.eopas.interlinear.phrase, function(d) {
              var words = _.map(d.wordlist.word, function(w) {
                  try {
                      if (!_.isArray(w.morphemelist.morpheme)) {
                          w.morphemelist.morpheme = [ w.morphemelist.morpheme ];
                      }
                  } catch(e) {
                      return {};
                  }
                  var word = _.map(w.morphemelist.morpheme, function(m) {
                      return {
                          'morpheme': m.text[0]['#text'],
                          'gloss': m.text[1]['#text']
                      };
                  });
                  w = {
                      'text': w.text['#text'],
                      'words': word
                  };
                  return w;
              });
              return {
                'id': d['@attributes'].startTime ? d['@attributes'].startTime : 0,
                'transcription': d.transcription['#text'],
                'translation': d.translation['#text'],
                'time': d['@attributes'].startTime,
                'words': words
              };
          });
          return text;
      };

      return ixtParser;
  }]);