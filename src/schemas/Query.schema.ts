import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'queries',
  versionKey: false,
})
export class Query {
  @Prop({ type: String, required: true, unique: true, index: true })
  id!: string; // public id (not _id)

  @Prop({ type: String, required: true })
  status?: string;
  @Prop({ type: String, required: true })
  updatedAt?: string;
}

export type QueryDocument = Query & Document;
export const QuerySchema = SchemaFactory.createForClass(Query);
