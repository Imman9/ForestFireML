import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'ranger' | 'admin';
  expoPushToken?: string;
  lastLat?: number;
  lastLng?: number;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'user' | 'ranger' | 'admin';
  public expoPushToken?: string;
  public lastLat?: number;
  public lastLng?: number;
}

export function initUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('user', 'ranger', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      expoPushToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastLat: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      lastLng: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: false,
    }
  );
  return User;
}

export default User; 