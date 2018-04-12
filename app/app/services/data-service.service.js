'use strict';

const {
  includes,
  isEmpty,
  compact,
  isArray,
  each,
  map,
  flattenDeep
} = require('lodash');

module.exports = DataService;

DataService.$inject = [
  '$rootScope',
  '$log',
  '$http',
  'configuration',
  'xmlToJsonService',
  'eafParserService',
  'trsParserService',
  'ixtParserService',
  'flextextParserService',
  'lodash'
];
function DataService(
  $rootScope,
  $log,
  $http,
  configuration,
  xmlToJson,
  eaf,
  trs,
  ixt,
  ftp,
  lodash
) {
  var ds = {
    imageTypes: ['jpg', 'jpeg', 'png'],
    videoTypes: ['mp4', 'ogg', 'ogv', 'mov', 'webm'],
    audioTypes: ['mp3', 'ogg', 'oga'],
    documentTypes: ['pdf'],
    getItem: getItem,
    loadTranscription: loadTranscription,
    broadcastMediaElementTime: broadcastMediaElementTime,
    listenForMediaElementBroadcast: listenForMediaElementBroadcast,
    broadcastPlayFrom: broadcastPlayFrom,
    listenForPlayFrom: listenForPlayFrom,
    data: {},
    loading: {}
  };
  return ds;

  function getItem(collectionId, itemId) {
    if (!ds.data[collectionId]) {
      ds.data[collectionId] = {};
      ds.data[collectionId][itemId] = {};
    }

    if (!ds.loading[collectionId]) {
      ds.loading[collectionId] = {};
    }

    if (ds.loading[collectionId][itemId]) {
      const data = ds.data[collectionId][itemId];
      return Promise.resolve(data);
    }

    if (
      !ds.loading[collectionId][itemId] &&
      !isEmpty(ds.data[collectionId][itemId])
    ) {
      const data = ds.data[collectionId][itemId];
      return Promise.resolve(Object.assign({}, data));
    }

    ds.loading[collectionId][itemId] = true;

    const itemIdentifier = configuration.datasource.itemIdentifier
      .replace('{{collectionId}}', collectionId)
      .replace('{{itemId}}', itemId);

    const url = configuration.datasource.getItem.replace(
      '{{itemId}}',
      itemIdentifier
    );

    $log.info(`ds getItem ${url}`);
    return $http
      .get(url, {transformResponse: parseOAI})
      .then(processResponse)
      .catch(handleError);

    function processResponse(resp) {
      resp.data.data.collectionId = collectionId;
      resp.data.data.collectionLink =
        configuration.datasource.collections + '/' + collectionId;
      resp.data.data.itemId = itemId;

      // store the object in the service and let the metadata
      //  controller know it's ready to go
      ds.data[collectionId][itemId] = resp.data.data;
      ds.loading[collectionId][itemId] = false;
      $rootScope.$broadcast('item data loaded');

      // and return it to the caller which is expecting a promise
      console.log(resp.data.data);
      return Object.assign({}, resp.data.data);
    }

    function handleError(err) {
      $log.error("dataService: error, couldn't get", url);
    }

    function parseOAI(d) {
      var tree = parseXML(d);

      try {
        tree = tree['OAI-PMH'].GetRecord.record.metadata['olac:olac'];

        return {data: createItemDataStructure(tree)};
      } catch (e) {
        return {data: ''};
      }
    }
  }

  function parseXML(doc, as) {
    var parser = new DOMParser();
    var xmldoc = parser.parseFromString(doc, 'text/xml');
    if (as === 'xml') {
      return doc;
    }
    return xmlToJson.convert(xmldoc);
  }

  function constructItemList(type, tree) {
    var selector;
    if (type === 'images') {
      selector = ds.imageTypes;
    } else if (type === 'video') {
      selector = ds.videoTypes;
    } else if (type === 'audio') {
      selector = ds.audioTypes;
    } else if (type === 'documents') {
      selector = ds.documentTypes;
    } else if (type === 'eaf') {
      selector = 'eaf';
    } else if (type === 'trs') {
      selector = 'trs';
    } else if (type === 'ixt') {
      selector = 'ixt';
    } else if (type === 'flextext') {
      selector = 'flextext';
    }

    if (!isArray(tree['dcterms:tableOfContents'])) {
      tree['dcterms:tableOfContents'] = [tree['dcterms:tableOfContents']];
    }
    var items = compact(
      lodash.map(tree['dcterms:tableOfContents'], function(d) {
        var i = d['#text'];
        var ext = i.split('.').pop();
        if (
          ext !== undefined &&
          selector !== undefined &&
          includes(selector, ext.toLowerCase())
        ) {
          return d['#text'];
        }
      })
    );

    if (includes(['audio', 'video', 'eaf', 'trs', 'ixt', 'flextext'], type)) {
      // audio and video can exist in multiple formats; so, group the data
      //  by name and then return an array of arrays - sorting by item name
      return lodash(items)
        .chain()
        .groupBy(function(d) {
          return lodash.last(d.split('/')).split('.')[0];
        })
        .value();
    } else {
      return items;
    }
  }

  function createItemDataStructure(tree) {
    if (!lodash.isArray(tree['dc:identifier'])) {
      tree['dc:identifier'] = [tree['dc:identifier']];
    }
    if (!lodash.isArray(tree['dc:contributor'])) {
      tree['dc:contributor'] = [tree['dc:contributor']];
    }
    var data = {
      openAccess: true,
      identifier: tree['dc:identifier'].map(i => i['#text']),
      languages: tree['dc:language'].map(l => l['@attributes']['olac:code']),
      title: get(tree, 'dc:title'),
      date: get(tree, 'dcterms:created'),
      description: get(tree, 'dc:description'),
      citation: get(tree, 'dcterms:bibliographicCitation'),
      contributor: tree['dc:contributor'].map(c => {
        return {
          name: c['#text'],
          role: c['@attributes']['olac:code']
        };
      }),
      images: constructItemList('images', tree),
      documents: constructItemList('documents', tree),
      media: processMedia(tree),
      rights: get(tree, 'dcterms:accessRights')
    };

    data.transcriptions = flattenDeep(
      data.media.map(m => {
        return compact([m.eaf, m.trs, m.ixt, m.flextext]);
      })
    ).sort();

    // if the item is closed - set a flag to make it easier to work with in the view
    if (data.rights.match('Closed.*')) {
      data.openAccess = false;
    }

    data.thumbnails = generateThumbnails(data.images);
    data.audioVisualisations = generateAudioVisualisations(data.audio);
    return data;

    function processMedia(tree) {
      const audio = constructItemList('audio', tree);
      const video = constructItemList('video', tree);
      const eaf = processMediaItem('eaf', tree);
      const trs = processMediaItem('trs', tree);
      const ixt = processMediaItem('ixt', tree);
      const flextext = processMediaItem('flextext', tree);

      let media = [];
      each(audio, (files, key) => {
        media.push(createMediaItemDataStructure(key, files, 'audio'));
      });
      each(video, (files, key) => {
        media.push(createMediaItemDataStructure(key, files, 'video'));
      });
      return media;

      function processMediaItem(key, tree) {
        let item = constructItemList(key, tree);
        each(item, (v, k) => {
          item[k] = map(v, url => {
            return {
              name: url.split('/').pop(),
              url: url
            };
          });
        });
        return item;
      }

      function createMediaItemDataStructure(key, files, type) {
        return {
          name: key,
          type: type,
          files: files,
          eaf: eaf[key] ? eaf[key] : [],
          trs: trs[key] ? trs[key] : [],
          ixt: ixt[key] ? ixt[key] : [],
          flextext: flextext[key] ? flextext[key] : []
        };
      }
    }

    // helper to extract a value for 'thing'
    //  not every item has every datapoint
    function get(tree, thing) {
      try {
        return tree[thing]['#text'];
      } catch (e) {
        return '';
      }
    }
  }

  function generateThumbnails(images) {
    return lodash.map(images, function(d) {
      var name = d.split('/').pop();
      var thumbName =
        name.split('.')[0] + '-thumb-PDSC_ADMIN.' + name.split('.')[1];
      return d.replace(name, thumbName);
    });
  }

  function generateAudioVisualisations(audio) {
    var audioVisualisations = lodash.map(audio, function(d) {
      var name = d[0].split('/').pop();
      var audioVisName = name.split('.')[0] + '-soundimage-PDSC_ADMIN.jpg';
      return d[0].replace(name, audioVisName);
    });
    audioVisualisations = lodash(audioVisualisations)
      .chain()
      .groupBy(function(d) {
        return d
          .split('/')
          .pop()
          .split('.')[0]
          .split('-soundimage')[0];
      })
      .value();

    lodash.each(audioVisualisations, function(d, i) {
      audioVisualisations[i] = d[0];
    });
    return audioVisualisations;
  }

  function loadTranscription(type, item, as) {
    let transform;
    let what = {};
    if (type === 'eaf') {
      transform = parseEAF;
    } else if (type === 'trs') {
      transform = parseTRS;
    } else if (type === 'ixt') {
      transform = parseIxt;
    } else if (type === 'flextext') {
      transform = parseFlextext;
    } else {
      return;
    }

    return $http
      .get(item.url, {transformResponse: transform, withCredentials: true})
      .then(resp => {
        return resp.data.data;
      })
      .catch(err => {
        $log.error("ParadisecService: error, couldn't get", item[type]);
        console.log(err);
      });

    function parseEAF(d) {
      if (as === 'xml') {
        return {data: parseXML(d, 'xml')};
      } else {
        return {data: eaf.parse(parseXML(d))};
      }
    }

    function parseTRS(d) {
      if (as === 'xml') {
        return {data: parseXML(d, 'xml')};
      } else {
        return {data: trs.parse(parseXML(d))};
      }
    }

    function parseIxt(d) {
      if (as === 'xml') {
        return {data: parseXML(d, 'xml')};
      } else {
        return {data: ixt.parse(parseXML(d))};
      }
    }

    function parseFlextext(d) {
      if (as === 'xml') {
        return {data: parseXML(d, 'xml')};
      } else {
        return {data: ftp.parse(parseXML(d))};
      }
    }
  }

  function broadcastMediaElementTime(time) {
    ds.mediaElementTime = time;
    $rootScope.$broadcast('media time updated');
  }

  function listenForMediaElementBroadcast(callback) {
    return $rootScope.$on('media time updated', callback);
  }

  function broadcastPlayFrom(range) {
    ds.playFrom = range;
    $rootScope.$broadcast('media play from');
  }

  function listenForPlayFrom(callback) {
    return $rootScope.$on('media play from', callback);
  }
}
