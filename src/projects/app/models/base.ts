import { Model } from 'sequelize-typescript';

export default class BaseModel<M> extends Model<M> {

  public serializer(opts?: { exclude?: string[] }) {
    const { exclude } = opts || {};
    const entity: any = this.toJSON();

    if (exclude)
      exclude.forEach(key => delete entity[key]);

    return entity;
  }
}