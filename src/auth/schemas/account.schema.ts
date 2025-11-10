import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'account', timestamps: true })
export class Account extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  accountId: string;

  @Prop({ required: true })
  providerId: string;

  @Prop()
  accessToken?: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
