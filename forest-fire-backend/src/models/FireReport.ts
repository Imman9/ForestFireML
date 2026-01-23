import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface FireReportAttributes {
  id: string;
  userId: string;
  userName: string;
  imageUrl: string;
  locationLat: number;
  locationLng: number;
  address?: string;
  description: string;
  status: 'unverified' | 'confirmed' | 'false_alarm' | 'needs_monitoring' | 'resolved';
  confidence?: number;
  weatherData?: string; // JSON string
  notes?: string;
  timestamp: Date;
}

export interface FireReportCreationAttributes extends Optional<FireReportAttributes, 'id' | 'timestamp'> {}

export class FireReport extends Model<FireReportAttributes, FireReportCreationAttributes> implements FireReportAttributes {
  public id!: string;
  public userId!: string;
  public userName!: string;
  public imageUrl!: string;
  public locationLat!: number;
  public locationLng!: number;
  public address?: string;
  public description!: string;
  public status!: 'unverified' | 'confirmed' | 'false_alarm' | 'needs_monitoring' | 'resolved';
  public confidence?: number;
  public weatherData?: string;
  public notes?: string;
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
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
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
        type: DataTypes.ENUM('unverified', 'confirmed', 'false_alarm', 'needs_monitoring', 'resolved'),
        allowNull: false,
        defaultValue: 'unverified',
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      weatherData: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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