import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.PGDATABASE || 'forestfiredb',
  process.env.PGUSER || 'postgres',
  process.env.PGPASSWORD || 'password',
  {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

import { initFireReportModel, FireReport } from './FireReport';
import { initUserModel, User } from './User';

initFireReportModel(sequelize);
initUserModel(sequelize);

export { sequelize, FireReport, User };
export default sequelize; 