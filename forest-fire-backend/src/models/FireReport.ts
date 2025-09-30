import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface FireReportAttributes {
  id: string;
  userId: string;
  imageUrl: string;
  locationLat: number;
  locationLng: number;
  description: string;
  status: 'unverified' | 'confirmed' | 'resolved';
  timestamp: Date;
}

export interface FireReportCreationAttributes extends Optional<FireReportAttributes, 'id' | 'timestamp'> {}

export class FireReport extends Model<FireReportAttributes, FireReportCreationAttributes> implements FireReportAttributes {
  public id!: string;
  public userId!: string;
  public imageUrl!: string;
  public locationLat!: number;
  public locationLng!: number;
  public description!: string;
  public status!: 'unverified' | 'confirmed' | 'resolved';
  public timestamp!: Date;
}

export function initFireReportModel(sequelize: Sequelize) {
  FireReport.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      locationLat: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      locationLng: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('unverified', 'confirmed', 'resolved'),
        allowNull: false,
        defaultValue: 'unverified',
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'fire_reports',
      timestamps: false,
    }
  );
  return FireReport;
}

export default FireReport; 