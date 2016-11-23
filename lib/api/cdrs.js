'use strict';

var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var ExcelExport = require('excel-export');
var Packer = require('zip-stream');
var Bookshelf = require('../db');

var path = require('path');
var fs = require('fs');

var i18n = require('../i18n');

var CDR = require('../models/CDR');
var config = require('../config');

var getRecording = Promise.promisify(require('../getRecording'));

var router = require('express').Router();

router.get('/cdrs', function (req, res) {
  console.log('query', req.query);
  var page = parseInt(req.query.page, 10);
  var perPage = parseInt(req.query.per_page, 10);

  var filter = function () {
    this.where(function () {
      if (req.query.number) {
        var like = ['%', req.query.number, '%'].join('');
        this.where('src', 'like', like)
            .orWhere('dst', 'like', like);
      } else {
        this.whereRaw('1=1');
      }
    }).andWhere(function () {
      if (req.query.status) {
        this.whereIn('disposition', req.query.status);
      } else {
        this.whereRaw('1=1');
      }
    }).andWhere(function () {
      var tz = config.tz;
      var df = 'YYYY-MM-DD HH:mm:ss'; // mysql format

      var start = req.query.start
        ? moment(req.query.start).utcOffset(tz)
        : moment().utcOffset(tz).startOf('day');

      var end = req.query.end
        ? moment(req.query.end).utcOffset(tz)
        : moment().utcOffset(tz).endOf('day');

      this.whereBetween('calldate', [start.format(df), end.format(df)]);
    }).andWhere(function () {
      if (req.query.direction) {
        var sqlDirection = req.query.direction.map(function (d) {
          switch (d) {
            case 'in': return '(LENGTH(src) > 5 AND LENGTH(dst) <= 5 )';
            case 'out': return '(LENGTH(src) <= 5 AND LENGTH(dst) > 5 )';
            case 'int': return '(LENGTH(src) <= 5 AND LENGTH(dst) <= 5 )';
          }
        }).join(' OR ');
        this.whereRaw(sqlDirection);
      } else {
        this.whereRaw('1=1');
      }
    }).andWhere(function () {
      if (req.user.acl) {
        this.where(function () {
          this.whereIn('src', req.user.acl);
        }).orWhere(function () {
          this.whereIn('dst', req.user.acl);
        });
        if (req.user.acl_in) {
          this.orWhere(function () {
            this.where('direction', 'in');
          });
        }
      } else {
        this.whereRaw('1=1');
      }
    });
  };

  var countPromise = Bookshelf.knex(config.cdr.table).count('*');
  filter.call(countPromise);

  var dataPromise = CDR.collection()
    .query(filter)
    .query(function (qb) {
      if (page && perPage) {
        qb.offset((page - 1) * perPage);
        qb.limit(perPage);
      }
      qb.orderBy(req.query.sort_by || 'calldate', req.query.order || 'desc');
    })
    .fetch();

  Promise.all([countPromise, dataPromise]).spread(function (count, collection) {
    if (req.query.export === 'xlsx') {
      let result = prepareXlsx(collection, req.locale);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats');
      res.setHeader('Content-Disposition', 'attachment; filename=' + 'Report.xlsx');
      res.end(result, 'binary');
      return;
    }

    if (req.query.export === 'records') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=' + 'records.zip');
      serveRecordsArchive(res, collection);
      return;
    }

    let cnt = count[0]['count(*)'];
    let result = [
      {
        total_entries: cnt
      },
      collection.map(model => {
        let obj = model.toJSON();
        obj.id = model.id;
        return obj;
      })
    ];

    res.json(result);
  });
});

function serveRecordsArchive (res, collection) {
  var archive = new Packer({
    store: true // do not try to compress, it's mp3s anyway
  });

  var records = []; // some cdrs use the same record file
  var queue = collection.filter(function (model) {
    var record = model.get('record');
    if (!record) {
      return false;
    }
    if (records.indexOf(record) !== -1) {
      return false;
    }
    records.push(record);
    return true;
  });

  var packFile = function (filename) {
    return new Promise(function (resolve, reject) {
      var fileStream = fs.createReadStream(filename);
      archive.entry(fileStream, {name: path.basename(filename)}, function (err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  };

  var chain = _.reduce(queue, function (chain, cdr) {
    return chain.then(function () {
      return getRecording(cdr)
        .then(packFile)
        .catch(function (e) {
          console.log(e, ", but we don't care");
        });
    });
  }, Promise.resolve());

  chain.finally(function () {
    archive.finish();
  });

  archive.pipe(res);
}

function prepareXlsx (collection, locale) {
  const $$ = i18n.getTranslator(locale);

  var conf = {};
  conf.cols = [{
    caption: $$('Time'),
    type: 'date',
    beforeCellWrite: (function () {
      var originDate = new Date(Date.UTC(1899, 11, 30));
      return function (row, cellData, eOpt) {
        return (cellData - originDate) / (24 * 60 * 60 * 1000);
      };
    }())
  }, {
    caption: $$('Source'),
    type: 'string'
  }, {
    caption: $$('Destination'),
    type: 'string'
  }];
  conf.rows = collection.map(function (model) {
    return [model.get('calldate'), model.get('src'), model.get('dst')];
  });
  return ExcelExport.execute(conf);
}

module.exports = router;
