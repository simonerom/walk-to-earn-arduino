import { Sequelize } from 'sequelize-typescript';
import path from 'path';
import {
  DB_LOG,
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD
} from '@config/env';

export function getDB(project: string) {
  return new Sequelize({
    dialect: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    database: project,
    username: DB_USERNAME,
    password: DB_PASSWORD,

    models: [path.join(__dirname, `../../projects/${project}/models/**/*.model.js`)],
    modelMatch: (filename, member) => {
      const name = filename.replace('.model', '_model');
      const model = member
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .substring(1);
      return name === model;
    },

    define: {
      timestamps: true,
      paranoid: false,
      underscored: true,
      charset: 'utf8'
    },

    pool: {
      max: 15,
      min: 2,
      acquire: 60000,
      idle: 60000,
    },

    dialectOptions: {
      decimalNumbers: true,
      maxPreparedStatements: 100,
      connectTimeout: 60000
    },

    timezone: '+08:00',
    repositoryMode: true,
    logging: DB_LOG ? console.log : false,
  });
}