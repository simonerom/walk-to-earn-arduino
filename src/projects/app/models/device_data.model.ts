import { Table, Column, DataType, PrimaryKey, ForeignKey } from 'sequelize-typescript';
import BaseModel from './base';
import { DeviceModel } from './device.model';

@Table({
  tableName: 'device_data'
})
export class DeviceDataModel extends BaseModel<DeviceDataModel> {
  @ForeignKey(() => DeviceModel)
  @Column({
    allowNull: false,
    type: DataType.STRING(64)
  })
  public device_id!: string;

  @Column({
    allowNull: false,
    type: DataType.INTEGER()
  })
  public steps!: number;

  @Column({
    allowNull: false
  })
  public timestamp!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(256)
  })
  public signature!: string;
}