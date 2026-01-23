import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface SystemSettingAttributes {
  key: string;
  value: string;
  description?: string;
}

export interface SystemSettingCreationAttributes extends Optional<SystemSettingAttributes, 'description'> {}

export class SystemSetting extends Model<SystemSettingAttributes, SystemSettingCreationAttributes> implements SystemSettingAttributes {
  public key!: string;
  public value!: string;
  public description?: string;
}

export function initSystemSettingModel(sequelize: Sequelize) {
  SystemSetting.init(
    {
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'system_settings',
      timestamps: false,
    }
  );
  return SystemSetting;
}

export default SystemSetting;
