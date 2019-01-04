'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.createTable('user', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    email: { type: 'string' },
    role: { type: 'string' },
    passwordHash: { type: 'string' },
    salt: { type: 'string' },
    iterations: { type: 'int' },
    keylen: { type: 'int' },
    digest: { type: 'string' },
    confirmed: { type: 'boolean' },
    active: { type: 'boolean' },
    confirmationCode: { type: 'string' },
    confirmationExpiresAt: { type: 'timestamp' },
    inviteCode: { type: 'string' },
    inviteExpiresAt: { type: 'timestamp' },
    newEmail: { type: 'string' },
    changeEmailCode: { type: 'string' },
    changeEmailExpiresAt: { type: 'timestamp' },
    recoveryCode: { type: 'string' },
    recoveryExpiresAt: { type: 'timestamp' },
    createdBy: { type: 'int' },
    updatedBy: { type: 'int' },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
    age: { type: 'int' },
  });
};

exports.down = function (db) {
  return db.dropTable('user');
};

exports._meta = {
  "version": 1
};
