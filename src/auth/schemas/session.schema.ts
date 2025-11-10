import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'session', timestamps: true })
export class Session extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
