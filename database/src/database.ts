/**
 * This module returns a database object with methods/API to carry
 * out basic MongoDB database operations.
 * It reads from a this.configuration file with parameters to
 * access a specific database on a MongoDB server.
 * The MongoDB database server service should be started externally
 * in advance, but an attempt will be made to start it via a
 * function read from the this.configuration file.
 *
 * The database object provides the following methods:
 * @function connectToDB
 * Returns a connection instance to a specific MongoDB database on
 * an MongoDB server.
 * It will attempt to start the database if necessary and
 * will leave it running independently of this process.
 * @function createModel
 * Returns a mongoose model based on supplied parameters.
 * @function createSession
 * Returns an Express/Mongo sessionstore.
 * @function closeConnection
 * Closes a connection to the MongoDB server as generated by either
 * ConnectToDB or createSession above.
 */

const modulename: string = __filename.slice(__filename.lastIndexOf('\\'));
import debugFunction from 'debug';
const debug = debugFunction(`PP_${modulename}`);
debug(`Starting ${modulename}`);

/* external dependencies */
import connectMongo from 'connect-mongodb-session';
import expressSession from 'express-session';
import fs from 'fs';
import mongoose from 'mongoose';
import { format } from 'util';
import winston = require('winston');

/**
 * The class constructor for the exported database object.
 */
export class Database {
  public dbConnection: any;
  public connectToDB: (...params: any) => any;
  public createModel: (...params: any) => any;
  public createStore: (...params: any) => any;
  public closeConnection: (...params: any) => any;
  public closeStore: (...params: any) => any;
  public createSession: (...params: any) => any;


  constructor(
    readonly config: IConfig,
    readonly logger: winston.Logger,
    readonly dumpError: any,
  ) {

    this.connectToDB = connectToDB;
    this.createModel = createModel;
    this.createStore = createStore;
    this.closeConnection = closeConnection;
    this.closeStore = closeStore;
    this.createSession = createSession;

    return (async () => {
      this.dbConnection = await connectToDB();
      return this;
    })();
  }
}


/**
 * Reads the MongoDB url connection string from the configuration file.
 */

function getMongoUrl(config: any) {
  /* mongoDB server connection url and connect options */
  const user = encodeURIComponent(config.DB_USER);
  const password = encodeURIComponent(config.DB_PASSWORD);
  const host = config.DB_HOST;
  const port = config.DB_PORT;
  const authMechanism = config.AUTH_MECHANISM;
  const authSource = config.AUTH_SOURCE;
  const sslOn = config.SSL_ON;
  const db = config.DB_NAME;
  return format(
    'mongodb://%s:%s@%s:%s/%s' + '?authMechanism=%s&authSource=%s&ssl=%s',
    // eslint-disable-next-line indent
    user,
    password,
    host,
    port,
    db,
    authMechanism,
    authSource,
    sslOn,
  );
}

/**
 * Reads the MongoDB connection options object from the configuration file.
 */

function getConnectionOptions(config: any) {
  /* read the certificate authority */
  const ca = [fs.readFileSync(config.DB_CA)];
  /* read the private key and public cert (both stored in the same file) */
  const key = [fs.readFileSync(config.DB_KEY)];
  const cert = key;
  /** @type {Object.<string, Object>} */
  return {
    // if not connected, return errors immediately
    bufferMaxEntries: 0,
    sslCA: ca,
    sslCert: cert,
    sslKey: key,
    sslValidate: config.SSL_VALIDATE,
    // prevents mongoose deprecation warning
    useNewUrlParser: true,
  };
}

/**
 * Creates a connection to a database on the MongoDB server.
 * If the tryStartDB parameter is true then, following a failed connection,
 * it will call a function once to try start the configured database server
 * and then retry.  If this second attempt fails it will throw an error.
 * If debug is enabled it also prints stats (to debug) on the configured
 * database.
 * @return
 * Returns a resolved promise to a Mongoose database connection object.
 * @throws
 * Throws a rejected promise if the connection attempt fails.
 * @param tryStartDB
 * True to attempt to start the configured database if the connection attempt
 * fails on first attempt.
 * False to not have any database start up attempts.
 * Default is true.
 */

async function connectToDB(this: any, tryStartDB = true) {
  debug(modulename + ': running connectToDB');

  /* get base connection url and options */
  const url = getMongoUrl(this.config);
  const connectOptions: any = getConnectionOptions(this.config);

  try {
    const dbConnection = await mongoose.createConnection(url, connectOptions);

    /* for all models => immediate error if database is disconnected */
    mongoose.set('bufferCommands', false);
    debug(
      modulename +
        ' : mongoDB database ' +
        `\'${dbConnection.db.databaseName}\' connected`,
    );

    if (debug.enabled) {
      debug(modulename + ': printing db stats');
      const stats = await dbConnection.db.command({ dbStats: 1 });
      debug(stats);
    }

    return dbConnection;
  } catch (err) {
    if (tryStartDB) {
      debug(modulename + ': trying to start database (once)');

      try {
        /* try start the database */
        const dbService = this.config.EXT_DB_SERVICE;
        await dbService.startDB(this.config);
      } catch (err) {
        /* there may not be a database startup module */
        this.logger.error(modulename + ': database startup error');
        this.dumpError(err);
      }

      /* try again with flag set to not try start the database */
      return await this.connectToDB(false);
    } else {
      this.logger.error(modulename + ': database connection error');
      this.dumpError(err);
      throw err;
    }
  }
}

/**
 * Creates a Mongoose model based on a supplied database
 * connection instance, schema, and collection.
 * @param {string} ModelName
 * The name to give the created model.
 * @param {Object} modelSchema
 * The schema to use in the model.
 * @param {string} dbCollectionName
 * The name of the collection to use.
 * @param {Object} dbConnection
 * The connection to the database to use.
 * @returns
 * Returns a Mongoose database model object
 * @throws
 * Throws an error if the model creation attempt fails.
 */

function createModel(
  this: any,
  ModelName: any,
  modelSchema: any,
  dbCollectionName: any,
  dbConnection: any,
) {
  debug(modulename + ': running createModel');

  /* id the database collection, define its schema and its model */
  const Schema = new mongoose.Schema(modelSchema, {
    collection: dbCollectionName,
  });

  try {
    const Model = dbConnection.model(ModelName, Schema);
    debug(modulename + `: mongoose model \'${Model.modelName}\' created`);
    return Model;
  } catch (err) {
    this.logger.error(modulename + ': database model creation error');
    this.dumpError(err);
    throw err;
  }
}

/**
 * Creates an Mongo session store using connect-mongoDB-session.
 * Note: It creates a database connection which must be closed
 * to allow node exit.
 * Note: It appears that a new store is created each time you run
 * this (even though the server parameters are identical). You
 * have to close each one separately.
 * @returns
 * Returns a Mongo session store.
 * @throws
 * Throws an error if the store creation attempt fails.
 */

async function createStore(this: any) {
  debug(modulename + ': running createStore');

  /* need to capture this.config here to use in constructor below */
  const localConfig = this.config;

  /* get base connection url and options */
  const url = getMongoUrl(this.config);
  const connectOptions = getConnectionOptions(this.config);
  let store: any = {};

  try {
    return await new Promise((resolve, reject) => {
      /* get the connect-mongodb-session constructor */
      const MongoStore = connectMongo(expressSession);

      store = new MongoStore({
        collection: localConfig.SESSION_COLLECTION,
        connectionOptions: connectOptions as any,
        databaseName: localConfig.DB_NAME,
        expires: localConfig.SESSION_EXPIRES,
        idField: '_id',
        uri: url,
      });

      store.on('connected', () => {
        resolve(store);
      });

      store.on('error', (err: Error) => {
        reject(err);
      });
    });
  } catch (err) {
    /* note certain types of connection errors can require
     * a CTRL+C to close node */
    this.logger.error(modulename + ': mongo store creation error');
    this.dumpError(err);
    throw err;
  }
}

/**
 * Closes a MongoDB database connection.
 * Logs an error if thrown.
 * @param {Object} dbConnection
 * The database connection to be closed, i.e.
 * a Mongoose or MongoDB connection with a close function.
 * @returns
 * It returns the connection in line with the underlying
 * connection.close() output.
 * @throws
 * It logs and returns (not throws) an error if the underlying
 * connection.close() throws an error.
 */

async function closeConnection(this: any, dbConnection: any) {
  debug(modulename + ': running closeConnection');

  try {
    const connection = await dbConnection.close();
    debug(modulename + ': database connection closed');
    return connection;
  } catch (err) {
    const message = ': database connection close error';
    this.logger.error(modulename + message);
    this.dumpError(err);
    return err;
  }
}

/**
 * Closes a MongoStore database connection.
 * @param {Object} dbStore
 * The MongoStore connection to be closed, i.e.
 * a connect-mongoDB-session store with a client.close function.
 * @returns
 * It returns the input MongoStore (whose client.isConnected
 * function should now return false).
 * @throws
 * It logs and returns (not throws) an error if the underlying
 * store.close() throws an error.
 */

async function closeStore(this: any, dbStore: any) {
  debug(modulename + ': running closeStore');

  try {
    await dbStore.client.close();
    debug(modulename + ': MongoStore connection closed');
    return dbStore;
  } catch (err) {
    const message = ': MongoStore connection close error';
    this.logger.error(modulename + message);
    this.dumpError(err);
    return err;
  }
}

/**
 * This method takes a Mongo store (created using createStore) and a
 * secret used to generate signed cookies and returns an express-session
 * used to store information across http requests.
 * @param { * } sessionStore
 * Mongo store to persist session information.
 * @param {*} cookieKey
 * The secret key used to sign cookies.
 * @returns
 * An object used by the Express app to manage http session state.
 */

function createSession(sessionStore: any, cookieKey: any) {
  debug(modulename + ': running createSession');

  const expires = new Date(60 * 60 * 24 * 7 * 1e3 + Date.now());
  return expressSession({
    cookie: {
      expires,
      httpOnly: false,
      path: '/',
      secure: true,
      signed: true,
    },
    resave: false,
    /* resets expires on each cookie receipt */
    rolling: true,
    saveUninitialized: false,
    secret: cookieKey,
    /* provided by connect-mongodb-session, or other store */
    store: sessionStore,

    /* deletes persisted session when you delete req.session */
    unset: 'destroy',
  });
}
