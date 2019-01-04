'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('widget', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    name: { type: 'string' },
    company: { type: 'string' },
    color: { type: 'string' },
    createdBy: { type: 'int' },
    updatedBy: { type: 'int' },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  });
};

exports.down = function(db) {
  return db.dropTable('widget');
};

exports._meta = {
  "version": 1
};
