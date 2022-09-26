import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'status'
})
export class StatusModel extends BaseModel<StatusModel> {
  // TODO - Unused?
  @Column({
    allowNull: false,
    defaultValue: 0
  })
  public value!: number;

}