import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ReportVerificationAttributes {
  id: string;
  reportId: string;
  userId: string;
  verificationType: 'confirm' | 'reject';
  timestamp: Date;
}

export interface ReportVerificationCreationAttributes extends Optional<ReportVerificationAttributes, 'id' | 'timestamp'> {}

export class ReportVerification extends Model<ReportVerificationAttributes, ReportVerificationCreationAttributes> implements ReportVerificationAttributes {
  public id!: string;
  public reportId!: string;
  public userId!: string;
  public verificationType!: 'confirm' | 'reject';
  public timestamp!: Date;
}

export function initReportVerificationModel(sequelize: Sequelize) {
  ReportVerification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reportId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID, // Assuming UUID for users
        allowNull: false,
      },
      verificationType: {
        type: DataTypes.ENUM('confirm', 'reject'),
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'report_verifications',
      timestamps: false,
    }
  );
  return ReportVerification;
}
