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
import { initSystemSettingModel, SystemSetting } from './SystemSetting';

initFireReportModel(sequelize);
initUserModel(sequelize);
initSystemSettingModel(sequelize);

export { sequelize, FireReport, User, SystemSetting };
export default sequelize; 