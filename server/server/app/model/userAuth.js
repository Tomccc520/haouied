'use strict';

module.exports = app => {
  const { STRING, INTEGER, SMALLINT } = app.Sequelize;

  const modelDefinition = {
    id: {
      type: INTEGER.UNSIGNED,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'user_id',
    },
    openid: {
      type: STRING(200),
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_general_ci',
      allowNull: false,
      defaultValue: '',
    },
    unionid: {
      type: STRING(200),
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_general_ci',
      allowNull: false,
      defaultValue: '',
    },
    client: {
      type: SMALLINT(1),
      unsigned: true,
      allowNull: false,
      defaultValue: 1,
    },
    createTime: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'create_time',
    },
    updateTime: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'update_time',
    },
  };
  const UserAuth = app.model.define('UserAuth', modelDefinition, {
    createdAt: false,
    updatedAt: false,
    tableName: 'la_user_auth', // 定义实际表名
  });

  return UserAuth;
};
