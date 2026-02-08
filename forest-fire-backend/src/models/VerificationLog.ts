import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface VerificationLogAttributes {
  id: string;
  reportId: string;
  verifierId: string;
  verifierName: string;
  previousStatus: string;
  newStatus: string;
  notes?: string;
  timestamp: Date;
  verificationMethod?: string;
}

export interface VerificationLogCreationAttributes extends Optional<VerificationLogAttributes, 'id' | 'timestamp'> {}

export class VerificationLog extends Model<VerificationLogAttributes, VerificationLogCreationAttributes> implements VerificationLogAttributes {
  public id!: string;
  public reportId!: string;
  public verifierId!: string;
  public verifierName!: string;
  public previousStatus!: string;
  public newStatus!: string;
  public notes?: string;
  public timestamp!: Date;
  public verificationMethod?: string;
}

export function initVerificationLogModel(sequelize: Sequelize) {
  VerificationLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reportId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      verifierId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      verifierName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      previousStatus: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      newStatus: {
        type: DataTypes.STRING,
        allowNull: false,
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
      verificationMethod: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'verification_logs',
      timestamps: false,
    }
  );
  return VerificationLog;
}

export default VerificationLog;
