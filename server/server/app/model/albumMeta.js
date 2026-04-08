'use strict';

module.exports = app => {
  const { INTEGER, STRING, TEXT } = app.Sequelize;

  const modelDefinition = {
    id: {
      type: INTEGER.UNSIGNED,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    albumId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'album_id',
    },
    alt: {
      type: STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    title: {
      type: STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    caption: {
      type: STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    description: {
      type: TEXT,
      allowNull: true,
      defaultValue: null,
    },
    mimeType: {
      type: STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'mime_type',
    },
    width: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    height: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
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

  const AlbumMeta = app.model.define('AlbumMeta', modelDefinition, {
    tableName: 'la_album_meta',
    createdAt: false,
    updatedAt: false,
  });

  return AlbumMeta;
};
